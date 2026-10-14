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
//   5. Bounded waiting. Upstream slots (4) and the per-IP frame budget
//      would still let one client stack unlimited waiters on the global
//      queue while the upstream drains slowly — every waiter holds a
//      socket. Past MAX_QUEUE the relay answers 503 "busy" immediately
//      instead of accumulating memory it cannot shed.

export const FRAME_TTL_MS = 30_000
export const MAX_CACHE_ENTRIES = 240
export const MAX_FRAME_BYTES = 4 * 1024 * 1024
export const UPSTREAM_TIMEOUT_MS = 9_000
export const UPSTREAM_CONCURRENCY = 4
export const PER_HOST_CONCURRENCY = 2
export const BREAKER_FAILS = 8
export const BREAKER_OPEN_MS = 3 * 60_000
export const MAX_QUEUE = 100
// Cloudflare replaces an origin 502 or 504 with its own branded page and
// drops this JSON, so a census looks like the tunnel died. 424 means the
// picture depended on an owner who did not send one, and the body survives.
export const UPSTREAM_STATUS = 424

export class RelayError extends Error {
  /**
   * `hostFault` says whether this failure says something about the HOST or only
   * about this one camera. A 404 for a camera whose still was taken down, or a
   * response that is not an image, is a fact about that id — counting it toward
   * the host breaker let one client rest every still on the host for 3 minutes
   * just by asking for eight ids that were already dead.
   */
  constructor(status, message, { hostFault = true } = {}) {
    super(message)
    this.status = status
    this.hostFault = hostFault
  }
}

// The host KEY for the breaker and per-host concurrency. Deliberately the
// hostname and not `URL.host`: STILL_HOSTS allow-lists hostnames, so keying on
// host:port gave cctv.maholan.net and cctv.maholan.net:8443 separate semaphores
// and separate failure budgets — politeness that stopped at the port.
function hostOf(url) {
  try { return new URL(url).hostname } catch { return '?' }
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

export function createRelay({ fetchImpl = fetch, now = () => Date.now(), log = () => {}, maxQueue = MAX_QUEUE } = {}) {
  const cache = new Map()        // id -> { body, type, at }
  const inflight = new Map()     // id -> Promise
  const global = semaphore(UPSTREAM_CONCURRENCY)
  const hosts = new Map()        // host -> { sem, fails, openUntil }
  const health = new Map()       // id -> { ok, at, ms }
  let revision = 0

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
    // Rule 5: the wait queue is bounded. A slow upstream plus a fast client
    // must not turn this process into a socket warehouse.
    //
    // Both queues count. A request parked on the per-host semaphore has not yet
    // reached the global one, and per-host concurrency (2) is smaller than the
    // global limit (4) — so a flood of ids on a SINGLE allow-listed host used to
    // park without limit while global.waiting stayed pinned at zero, which is the
    // one shape the guard existed to refuse.
    if (global.waiting + hs.sem.waiting >= maxQueue) throw new RelayError(503, 'relay is busy — too many frames already queued, try again shortly')
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
      async function refuse(message, { hostFault = false } = {}) {
        await res.body?.cancel().catch(() => {})
        // 424 Failed Dependency, not a bare 502: the upstream answered and
        // what it answered was unusable for this camera. hostFault stays — it
        // is what stops eight dead cameras resting an entire host.
        throw new RelayError(UPSTREAM_STATUS, message, { hostFault })
      }
      // A 5xx is the host misbehaving; a 404/410 is one camera being gone.
      if (!res.ok) await refuse(`upstream answered ${res.status}`, { hostFault: res.status >= 500 })
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
        // 424 Failed Dependency, not a bare 502: the upstream answered and
        // what it answered was unusable for this camera. hostFault stays — it
        // is what stops eight dead cameras resting an entire host.
        throw new RelayError(UPSTREAM_STATUS, 'frame too large', { hostFault: false })
            }
            chunks.push(Buffer.from(value))
          }
        } finally { reader.releaseLock() }
      }
      const body = Buffer.concat(chunks, size)
        // 424 Failed Dependency, not a bare 502: the upstream answered and
        // what it answered was unusable for this camera. hostFault stays — it
        // is what stops eight dead cameras resting an entire host.
        if (body.length < 512) throw new RelayError(UPSTREAM_STATUS, 'frame too small to be a picture', { hostFault: false })
      hs.fails = 0
      const entry = { body, type, at: now() }
      remember(id, entry)
      health.set(id, { ok: true, at: entry.at, ms: entry.at - t0 })
      revision++
      return entry
    } catch (err) {
      if (err instanceof RelayError && err.status === 503) throw err
      // Only host-level faults may rest the host. Per-camera refusals still get
      // their own health entry and their own 502, but they leave the breaker alone.
      if (!(err instanceof RelayError) || err.hostFault) hs.fails++
      if (hs.fails >= BREAKER_FAILS) {
        hs.openUntil = now() + BREAKER_OPEN_MS
        hs.fails = 0
        log('warn', 'relay breaker opened', { host })
      }
      health.set(id, { ok: false, at: now(), ms: now() - t0 })
      revision++
      if (err instanceof RelayError) throw err
      const reason = err?.name === 'TimeoutError' ? 'upstream did not answer in time' : 'upstream unreachable'
      throw new RelayError(UPSTREAM_STATUS, reason)
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

  /**
   * Purge expired frames. Called on a timer.
   *
   * Frames are dropped; `health` is not, and the docstring used to promise that
   * "idle memory returns to zero", which was never true of this process. health
   * is bounded by the catalogue size rather than by time, so it grows to a ceiling
   * and stays there. That is acceptable, but it should be a choice on record.
   */
  function sweep() {
    const cutoff = now() - FRAME_TTL_MS
    for (const [id, e] of cache) if (e.at < cutoff) cache.delete(id)
  }

  return { frame, stats, sweep, health, get revision() { return revision } }
}
