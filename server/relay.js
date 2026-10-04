// The still-frame relay — the one place this project touches camera imagery
// on a server, and therefore the place with the most rules.
//
// WHY IT EXISTS. Most Thai public cameras publish a JPEG without the CORS
// header a browser needs before a page may read its pixels. Without a relay,
// a visitor can look at those cameras but no computer vision can run on them.
// So the relay fetches the frame and passes it through, same-origin.
//
// THE RULES, each enforced below rather than promised in prose:
//
//   1. Memory only. A frame lives in a small in-memory cache for FRAME_TTL_MS
//      so that ten visitors looking at one camera cost its owner one request,
//      then it is gone. Nothing is written to disk. Nothing is logged except
//      the camera id, status and timing.
//   2. Not an open proxy. Only ids in the catalogue, only hosts on the
//      allow-list in catalog.js, no redirects followed. A request cannot make
//      this server fetch an arbitrary URL.
//   3. Polite upstream. At most UPSTREAM_CONCURRENCY fetches in flight at
//      once, PER_HOST_CONCURRENCY per host, and a per-host circuit breaker:
//      a host that keeps failing is left alone for a while instead of being
//      hammered by everyone who opens the page.
//   4. Bounded. Size cap, content-type check, timeout.

export const FRAME_TTL_MS = 30_000
export const MAX_CACHE_ENTRIES = 240
export const MAX_FRAME_BYTES = 4 * 1024 * 1024
export const UPSTREAM_TIMEOUT_MS = 9_000
export const UPSTREAM_CONCURRENCY = 4
export const PER_HOST_CONCURRENCY = 2
export const BREAKER_FAILS = 8
export const BREAKER_OPEN_MS = 3 * 60_000

export class RelayError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

function hostOf(url) {
  try { return new URL(url).host } catch { return '?' }
}

/** A tiny counting semaphore. Waiters are served in arrival order. */
export function semaphore(limit) {
  let active = 0
  const queue = []
  const release = () => {
    active--
    const next = queue.shift()
    if (next) { active++; next() }
  }
  return {
    async acquire() {
      if (active < limit) { active++; return release }
      await new Promise((resolve) => queue.push(resolve))
      return release
    },
    get active() { return active },
    get waiting() { return queue.length },
  }
}

export function createRelay({ fetchImpl = fetch, now = () => Date.now(), log = () => {} } = {}) {
  const cache = new Map()        // id -> { body, type, at }
  const inflight = new Map()     // id -> Promise
  const global = semaphore(UPSTREAM_CONCURRENCY)
  const hosts = new Map()        // host -> { sem, fails, openUntil }
  const health = new Map()       // id -> { ok, at, ms }

  function hostState(host) {
    let h = hosts.get(host)
    if (!h) { h = { sem: semaphore(PER_HOST_CONCURRENCY), fails: 0, openUntil: 0 }; hosts.set(host, h) }
    return h
  }

  function remember(id, entry) {
    cache.delete(id)
    cache.set(id, entry)
    while (cache.size > MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value)
  }

  async function pull(id, url) {
    const host = hostOf(url)
    const hs = hostState(host)
    if (hs.openUntil > now()) throw new RelayError(503, `upstream ${host} is resting after repeated failures`)
    const releaseHost = await hs.sem.acquire()
    const releaseGlobal = await global.acquire()
    const t0 = now()
    try {
      // Queued requests must respect a breaker opened while they waited.
      if (hs.openUntil > now()) throw new RelayError(503, `upstream ${host} is resting after repeated failures`)
      const res = await fetchImpl(url, {
        redirect: 'error',
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
        headers: { 'User-Agent': 'vision.nonarkara.org frame relay (education; memory-only)', Accept: 'image/*' },
      })
      async function refuse(message) {
        await res.body?.cancel().catch(() => {})
        throw new RelayError(502, message)
      }
      if (!res.ok) await refuse(`upstream answered ${res.status}`)
      const type = String(res.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase()
      if (!/^image\/(jpeg|png|webp)$/.test(type)) await refuse(`upstream sent ${type || 'no type'}, not an image`)
      const declared = Number(res.headers.get('content-length') ?? 0)
      if (declared > MAX_FRAME_BYTES) await refuse('frame too large')
      // Enforce the cap while reading, including chunked responses with no length.
      const reader = res.body?.getReader()
      const chunks = []
      let size = 0
      if (reader) {
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            size += value.byteLength
            if (size > MAX_FRAME_BYTES) {
              await reader.cancel().catch(() => {})
              throw new RelayError(502, 'frame too large')
            }
            chunks.push(Buffer.from(value))
          }
        } finally { reader.releaseLock() }
      }
      const body = Buffer.concat(chunks, size)
      if (body.length < 512) throw new RelayError(502, 'frame too small to be a picture')
      hs.fails = 0
      const entry = { body, type, at: now() }
      remember(id, entry)
      health.set(id, { ok: true, at: entry.at, ms: entry.at - t0 })
      return entry
    } catch (err) {
      if (err instanceof RelayError && err.status === 503) throw err
      hs.fails++
      if (hs.fails >= BREAKER_FAILS) {
        hs.openUntil = now() + BREAKER_OPEN_MS
        hs.fails = 0
        log('warn', 'relay breaker opened', { host })
      }
      health.set(id, { ok: false, at: now(), ms: now() - t0 })
      if (err instanceof RelayError) throw err
      const reason = err?.name === 'TimeoutError' ? 'upstream did not answer in time' : 'upstream unreachable'
      throw new RelayError(504, reason)
    } finally {
      releaseGlobal()
      releaseHost()
    }
  }

  /**
   * Get a frame for a catalogue id. `resolve(id)` returns the upstream URL or
   * null; the relay never builds a URL from request input.
   */
  async function frame(id, resolve) {
    const url = resolve(id)
    if (!url) throw new RelayError(404, 'not a relayable camera')
    const hit = cache.get(id)
    if (hit && now() - hit.at < FRAME_TTL_MS) return { ...hit, cached: true }
    if (inflight.has(id)) return inflight.get(id)
    const p = pull(id, url).finally(() => inflight.delete(id))
    inflight.set(id, p)
    return p
  }

  function stats() {
    const now_ = now()
    let ok = 0, failed = 0
    for (const h of health.values()) h.ok ? ok++ : failed++
    return {
      cached_frames: cache.size,
      inflight: inflight.size,
      waiting: global.waiting,
      checked_cameras: health.size,
      last_ok: ok,
      last_failed: failed,
      resting_hosts: [...hosts.entries()].filter(([, h]) => h.openUntil > now_).map(([host]) => host),
    }
  }

  /** Purge expired frames. Called on a timer so idle memory returns to zero. */
  function sweep() {
    const cutoff = now() - FRAME_TTL_MS
    for (const [id, e] of cache) if (e.at < cutoff) cache.delete(id)
  }

  return { frame, stats, sweep, health }
}
