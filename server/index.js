// vision.nonarkara.org — a public classroom for computer vision, built on the
// cameras of the FloodDash wall.
//
// This process does three things and nothing else:
//   1. serves the static site (pages assembled from partials),
//   2. publishes the camera catalogue (/api/cameras),
//   3. relays still frames from allow-listed hosts, memory only (/api/frame).
// Every model runs in the visitor's browser. This server never looks at a
// picture; it only passes some of them along.

import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createCatalogStore, countKinds } from './catalog.js'
import { createRelay, RelayError } from './relay.js'
import { createStatic, json, clientIp, createLimiter, securityHeaders } from './http.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PKG = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))
export const VERSION = PKG.version

const PORT = Number(process.env.PORT ?? 8430)
const HOST = process.env.HOST ?? '127.0.0.1'
const FLOODDASH = process.env.FLOODDASH_BASE ?? 'http://127.0.0.1:8340'
const STARTED = Date.now()

function log(level, msg, extra = {}) {
  const line = JSON.stringify({ t: new Date().toISOString(), level, msg, ...extra })
  ;(level === 'error' || level === 'warn' ? process.stderr : process.stdout).write(line + '\n')
}

const catalog = createCatalogStore({
  floodDashBase: FLOODDASH,
  cacheFile: path.join(ROOT, 'data', 'cameras.json'),
  log,
})
const relay = createRelay({ log })
const statics = createStatic({ root: path.join(ROOT, 'public'), version: VERSION, log })

// Frames: generous enough for a wall of 24 tiles refreshing, tight enough
// that one visitor cannot turn the relay into a scraper.
//
// Sized for a classroom of ~40 behind one school IP: the catalogue is one
// cached JSON per page view; frames are what actually cost camera owners, and
// the relay's own cache and per-host concurrency protect them further.
const frameLimiter = createLimiter({ rate: 600, burst: 200 })
const apiLimiter = createLimiter({ rate: 300, burst: 120 })

// The serialised catalogue is the same for everyone; build it once per minute.
let catalogBody = null
let catalogBuiltAt = 0
function catalogPayload() {
  const state = catalog.get()
  if (catalogBody && Date.now() - catalogBuiltAt < 60_000 && catalogBody.loadedAt === state.loadedAt) return catalogBody
  const frameHealth = relay.health
  const cameras = state.cameras.map((c) => {
    if (c.k !== 'still') return c
    const h = frameHealth.get(c.id)
    return h ? { ...c, h: h.ok ? 1 : 0 } : c
  })
  catalogBody = {
    version: VERSION,
    loadedAt: state.loadedAt,
    upstreamAt: state.upstreamAt,
    origin: state.origin,
    counts: countKinds(state.cameras),
    sources: state.sources,
    cameras,
  }
  catalogBuiltAt = Date.now()
  return catalogBody
}

const ROUTES = {
  'GET /api/cameras': (req, res) => {
    if (!apiLimiter.take(clientIp(req))) return json(req, res, 429, { error: 'too many requests' }, { 'Retry-After': '10' })
    json(req, res, 200, catalogPayload(), { 'Cache-Control': 'public, max-age=60' })
  },

  'GET /api/frame': async (req, res, url) => {
    if (!frameLimiter.take(clientIp(req))) {
      return json(req, res, 429, { error: 'too many frames — the cameras belong to other people; please slow down' }, { 'Retry-After': '20' })
    }
    const id = String(url.searchParams.get('id') ?? '')
    if (!id || id.length > 160) return json(req, res, 400, { error: 'missing camera id' })
    try {
      const f = await relay.frame(id, (key) => catalog.get().relayMap.get(key) ?? null)
      res.writeHead(200, {
        'Content-Type': f.type,
        'Content-Length': f.body.length,
        'Cache-Control': 'private, max-age=20',
        'X-Frame-Age-Ms': String(Math.max(0, Date.now() - f.at)),
        ...securityHeaders(),
      })
      res.end(req.method === 'HEAD' ? undefined : f.body)
    } catch (err) {
      const status = err instanceof RelayError ? err.status : 500
      json(req, res, status, { error: err instanceof RelayError ? err.message : 'relay failed' })
    }
  },

  'GET /api/health': (req, res) => {
    const state = catalog.get()
    json(req, res, 200, {
      ok: state.cameras.length > 0,
      version: VERSION,
      uptime_s: Math.round((Date.now() - STARTED) / 1000),
      catalogue: { origin: state.origin, loadedAt: state.loadedAt, upstreamAt: state.upstreamAt, ...countKinds(state.cameras) },
      relay: relay.stats(),
      memory_mb: Math.round(process.memoryUsage().rss / 1e6),
    })
  },
}

/**
 * Parse the request target as a path only. A target starting with `//` would
 * otherwise be read as a host (`//x:99999` throws), and one bad request must
 * never take the process down.
 */
export function parseTarget(raw) {
  const target = typeof raw === 'string' && raw.startsWith('/') ? raw.replace(/^\/+/, '/') : null
  if (!target) return null
  try { return new URL(target, 'http://local') } catch { return null }
}

export function handler(req, res) {
  const url = parseTarget(req.url)
  if (!url) return json(req, res, 400, { error: 'bad request' })
  const method = req.method === 'HEAD' ? 'GET' : req.method
  const route = ROUTES[`${method} ${url.pathname}`]
  if (route) {
    Promise.resolve(route(req, res, url)).catch((err) => {
      log('error', 'route failed', { path: url.pathname, error: String(err?.stack ?? err) })
      if (!res.headersSent) json(req, res, 500, { error: 'internal error' })
    })
    return
  }
  if (method !== 'GET') return json(req, res, 405, { error: 'method not allowed' })
  try {
    if (statics.serve(req, res, url.pathname)) return
  } catch (err) {
    log('error', 'static failed', { path: url.pathname, error: String(err?.message ?? err) })
    return json(req, res, 500, { error: 'internal error' })
  }
  if (!statics.page(req, res, '404', 404)) json(req, res, 404, { error: 'not found' })
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  // Backstop: log and keep serving rather than drop every viewer's stream.
  process.on('uncaughtException', (err) => log('error', 'uncaught exception', { error: String(err?.stack ?? err) }))
  process.on('unhandledRejection', (err) => log('error', 'unhandled rejection', { error: String(err?.stack ?? err) }))
  catalog.start()
  const sweeper = setInterval(() => relay.sweep(), 15_000)
  sweeper.unref()
  const server = http.createServer(handler)
  server.keepAliveTimeout = 65_000
  server.listen(PORT, HOST, () => log('info', 'vision listening', { host: HOST, port: PORT, version: VERSION }))
  const shutdown = (sig) => {
    log('info', 'shutting down', { sig })
    server.close(() => process.exit(0))
    setTimeout(() => process.exit(0), 3000).unref()
  }
  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
}
