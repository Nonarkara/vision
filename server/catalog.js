// The camera catalogue — every camera on the FloodDash wall, sorted by what a
// browser can honestly do with it.
//
// WHERE THE CAMERAS COME FROM. FloodDash already aggregates seven public
// sources (GISTDA, iTIC, NST, Pak Kret, Rangsit, DWR, cctv.maholan.net) into
// one normalised list at /api/cctv/all on the same machine. We read that list
// rather than re-scraping seven upstreams: one aggregator, one set of
// politeness rules, one place to fix a broken source.
//
// WHAT "KIND" MEANS. Computer vision needs pixels, and a browser only lets a
// page read pixels from another site when that site says so (CORS). So each
// camera is classed by what is actually possible, measured on 4 Oct 2026:
//
//   video · live HLS from a host that sends Access-Control-Allow-Origin: *.
//           The browser plays it and reads frames directly. ~53 cameras.
//   still · a JPEG the agency publishes at a stable URL, without CORS. Our
//           relay fetches it into memory and hands it to the browser
//           (server/relay.js). Never written to disk.
//   view  · the owner only offers a viewer page or an iframe. We can link to
//           it; no machine can read its pixels from here.
//   off   · FloodDash's own health probe found the stream down.
//
// Nothing here is a claim that a camera works right now. `video` means the
// probe saw it live within the last cycle; `still` means a URL exists. The
// relay records what actually happens when someone looks.

import fs from 'node:fs'
import path from 'node:path'

export const VIDEO_HOSTS = [/^camerai?1\.iticfoundation\.org$/, /^[a-z0-9-]+\.ipcamlive\.com$/]
/** Hosts whose stills the relay may fetch. Anything else is refused. */
export const STILL_HOSTS = [/^cctv\.maholan\.net$/, /^www\.thaiclouderp\.com$/, /^[a-z0-9-]+\.ipcamlive\.com$/]
/** DWR stills are already proxied by FloodDash; we read them from localhost. */
const DWR_PUBLIC = /^https:\/\/flood\.nonarkara\.org(\/api\/cctv\/dwr\?id=[0-9a-f-]{36})$/i

const THAILAND = { latMin: 4, latMax: 21.5, lngMin: 96, lngMax: 106.5 }

function hostOf(url) {
  try { return new URL(url).hostname } catch { return '' }
}

function matches(list, host) {
  return list.some((re) => re.test(host))
}

/**
 * The catalogue is ~2.4 MB and `res.json()` had no ceiling on it — a wedged or
 * substituted upstream could stream an unbounded body into the heap. Read it in
 * chunks and refuse past the cap, the way the frame relay already does.
 */
export const MAX_CATALOGUE_BYTES = 32 * 1024 * 1024
/** How much of the last good catalogue a new one must keep, or it is refused. */
export const MIN_KEEP_RATIO = 0.25

export async function readCapped(res, max = MAX_CATALOGUE_BYTES) {
  const declared = Number(res.headers?.get?.('content-length') ?? NaN)
  if (Number.isFinite(declared) && declared > max) throw new Error(`catalogue is ${declared} bytes, over the ${max} cap`)
  if (!res.body?.getReader) return res.json()
  const reader = res.body.getReader()
  const chunks = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.length
    if (total > max) { await reader.cancel().catch(() => {}); throw new Error(`catalogue exceeded the ${max} byte cap`) }
    chunks.push(value)
  }
  return JSON.parse(Buffer.concat(chunks.map((c) => Buffer.from(c))).toString('utf8'))
}

/**
 * Turn a FloodDash snapshot URL into the URL our relay should fetch, or null
 * when the host is not on the allow-list. DWR is rewritten to the local
 * FloodDash server so the frame never makes a round trip through Cloudflare.
 */
export function relaySource(snapshotUrl, floodDashBase) {
  if (typeof snapshotUrl !== 'string' || !/^https?:\/\//.test(snapshotUrl)) return null
  const dwr = snapshotUrl.match(DWR_PUBLIC)
  if (dwr) return `${floodDashBase}${dwr[1]}`
  if (!snapshotUrl.startsWith('https://')) return null
  // STILL_HOSTS is a list of hostNAMES, so on its own it allowed every port on an
  // allow-listed host. Pin the port to https, or say which one you mean.
  try { if (new URL(snapshotUrl).port && new URL(snapshotUrl).port !== '443') return null } catch { return null }
  return matches(STILL_HOSTS, hostOf(snapshotUrl)) ? snapshotUrl : null
}

/** Decide what a browser can do with one FloodDash camera. */
export function classify(cam, floodDashBase) {
  const hls = typeof cam.hls_url === 'string' ? cam.hls_url : null
  if (hls && cam.stream_status === 'live' && hls.startsWith('https://') && matches(VIDEO_HOSTS, hostOf(hls))) {
    return { kind: 'video', video: hls }
  }
  const relay = relaySource(cam.snapshot_url, floodDashBase)
  if (relay) return { kind: 'still', relay }
  if (cam.stream_status === 'down' && !cam.viewer_url) return { kind: 'off' }
  if (cam.viewer_url || hls) return { kind: cam.stream_status === 'down' ? 'off' : 'view' }
  return { kind: 'off' }
}

const round5 = (n) => Math.round(n * 1e5) / 1e5

/** A link a person can open at the owner's site — never our relay. */
function publicLink(cam) {
  const candidates = [cam.viewer_url, cam.source_url]
  return candidates.find((u) => typeof u === 'string' && /^https?:\/\//.test(u)) ?? null
}

/**
 * Build the catalogue from a FloodDash /api/cctv/all payload.
 * Returns { cameras, relayMap, sources } — relayMap stays on the server.
 */
export function buildCatalog(payload, { floodDashBase = 'http://127.0.0.1:8340' } = {}) {
  const raw = Array.isArray(payload?.cameras) ? payload.cameras : []
  const cameras = []
  const relayMap = new Map()
  const seen = new Set()
  for (const c of raw) {
    if (!c || typeof c !== 'object') continue
    const lat = Number(c.lat), lng = Number(c.lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
    if (lat < THAILAND.latMin || lat > THAILAND.latMax || lng < THAILAND.lngMin || lng > THAILAND.lngMax) continue
    const id = `${String(c.source ?? 'x')}:${String(c.id ?? '')}`.slice(0, 160)
    if (seen.has(id)) continue
    seen.add(id)
    const { kind, video, relay } = classify(c, floodDashBase)
    if (relay) relayMap.set(id, relay)
    const row = {
      id,
      src: String(c.source ?? ''),
      th: String(c.name_th ?? '').slice(0, 200),
      en: String(c.name_en ?? '').slice(0, 200),
      loc: String(c.location_th ?? '').slice(0, 200),
      lat: round5(lat),
      lng: round5(lng),
      k: kind,
    }
    if (video) row.v = video
    const link = publicLink(c)
    if (link) row.w = link
    if (c.flooded === true) row.f = 1
    if (c.facing_th) row.face = String(c.facing_th).slice(0, 120)
    cameras.push(row)
  }
  const order = { video: 0, still: 1, view: 2, off: 3 }
  cameras.sort((a, b) => order[a.k] - order[b.k] || a.id.localeCompare(b.id))
  const sources = (Array.isArray(payload?.sources) ? payload.sources : []).map((s) => ({
    id: String(s.id ?? ''),
    th: String(s.label_th ?? ''),
    en: String(s.label_en ?? ''),
    count: Number(s.count) || 0,
    status: String(s.status ?? ''),
  }))
  return { cameras, relayMap, sources, upstreamAt: payload?.fetched_at ?? null }
}

export function countKinds(cameras) {
  const out = { video: 0, still: 0, view: 0, off: 0, total: cameras.length }
  for (const c of cameras) out[c.k] = (out[c.k] ?? 0) + 1
  return out
}

/**
 * Keeps the catalogue fresh. Reads FloodDash every `refreshMs`; on failure it
 * keeps the last good copy, and on a cold start with FloodDash down it reads
 * the copy saved to disk. A stale list of cameras is still a list of cameras;
 * an empty page is not.
 */
export function createCatalogStore({ floodDashBase, cacheFile, refreshMs = 10 * 60_000, timeoutMs = 60_000, log = () => {} }) {
  let state = { cameras: [], relayMap: new Map(), sources: [], upstreamAt: null, loadedAt: null, origin: 'empty' }
  let timer = null
  let busy = false

  function adopt(payload, origin) {
    const built = buildCatalog(payload, { floodDashBase })
    if (built.cameras.length === 0) throw new Error('catalogue empty')
    // Refuse an implausible COLLAPSE, not just an empty catalogue. On 14 Oct 2026
    // FloodDash returned a partial catalogue for two refreshes — 131 cameras with
    // five of seven sources marked failed, against 3,425 good ones. 131 is not
    // empty, so the empty guard waved it through and the site showed 4% of its
    // cameras to visitors for 29 minutes until the next clean tick.
    //
    // The bound is relative to what we already believe, so it needs no world
    // knowledge and cannot go stale: a genuine change in the source list moves
    // the number gradually, not 96% in one tick. 25% is deliberately far below
    // any plausible real swing, so the guard fires on breakage, not on news.
    if (state.cameras.length > 200 && built.cameras.length < state.cameras.length * MIN_KEEP_RATIO) {
      const failed = built.sources.filter((s) => s.status !== 'live').map((s) => s.id)
      throw new Error(`catalogue collapsed from ${state.cameras.length} to ${built.cameras.length} cameras (${Math.round((built.cameras.length / state.cameras.length) * 100)}%); sources not live: ${failed.join(', ') || 'none'}`)
    }
    state = { ...built, loadedAt: new Date().toISOString(), origin }
    return state
  }

  function loadFromDisk() {
    try {
      const payload = JSON.parse(fs.readFileSync(cacheFile, 'utf8'))
      adopt(payload, 'disk')
      log('info', 'catalogue loaded from disk', { cameras: state.cameras.length })
    } catch (err) {
      log('warn', 'no usable catalogue on disk', { error: String(err.message ?? err) })
    }
  }

  async function refresh() {
    // Two refreshes overlapping would interleave their writes to the SAME
    // `${cacheFile}.tmp`, and one rename could publish the other's half-written
    // file. It needs a ~10-minute event-loop stall to reach today (interval
    // 10 min, timeout 60 s), but the guard costs one boolean.
    if (busy) {
      log('warn', 'catalogue refresh already running; skipping this tick')
      return state
    }
    busy = true
    try {
      const res = await fetch(`${floodDashBase}/api/cctv/all`, { signal: AbortSignal.timeout(timeoutMs) })
      if (!res.ok) throw new Error(`FloodDash answered ${res.status}`)
      const payload = await readCapped(res, MAX_CATALOGUE_BYTES)
      adopt(payload, 'flooddash')
      // A temp name per run, so even a bug in the guard above cannot have two
      // writers meeting on one path.
      const tmp = `${cacheFile}.${process.pid}.tmp`
      await fs.promises.mkdir(path.dirname(cacheFile), { recursive: true })
      // Async write + rename: the catalogue is ~2.4 MB and a synchronous
      // write blocked the event loop for tens of milliseconds every
      // ten-minute refresh, on the same loop that serves frames.
      await fs.promises.writeFile(tmp, JSON.stringify({ fetched_at: payload.fetched_at, sources: payload.sources, cameras: payload.cameras }))
      await fs.promises.rename(tmp, cacheFile)
      log('info', 'catalogue refreshed', { cameras: state.cameras.length, ...countKinds(state.cameras) })
    } catch (err) {
      log('warn', 'catalogue refresh failed; keeping last good copy', { error: String(err.message ?? err), cameras: state.cameras.length })
    } finally {
      busy = false
    }
    return state
  }

  return {
    get: () => state,
    loadFromDisk,
    refresh,
    start() {
      loadFromDisk()
      refresh()
      timer = setInterval(refresh, refreshMs)
      timer.unref?.()
    },
    stop() { if (timer) clearInterval(timer) },
  }
}
