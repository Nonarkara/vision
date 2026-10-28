// HTTP plumbing: static files, page assembly, headers, rate limits.
// No framework — a page here is a file, a partial and a version string.

import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
  '.task': 'application/octet-stream',
  '.bin': 'application/octet-stream',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.xml': 'application/xml; charset=utf-8',
}

/** Folders under public/ that hold originals for us to process, not for visitors. */
export const PRIVATE_DIRS = ['CCTV photos']

const COMPRESSIBLE = /^(text\/|application\/(json|manifest\+json)|image\/svg)/

/** Clean URL → page file. The nav partial marks the current page from this. */
export const PAGES = {
  '/': 'index',
  '/learn': 'learn',
  '/cameras': 'cameras',
  '/train': 'train',
  '/gesture': 'gesture',
  '/drive': 'drive',
  '/focus': 'focus',
  '/reconstruct': 'reconstruct',
  '/games': 'games',
  '/everyday': 'everyday',
  '/colour': 'colour',
  '/research': 'research',
  '/system': 'system',
  '/legal': 'legal',
  '/story': 'story',
  '/handbook': 'handbook',
  '/handbook/01': 'handbook/01',
  '/handbook/02': 'handbook/02',
  '/handbook/03': 'handbook/03',
  '/handbook/04': 'handbook/04',
  '/handbook/05': 'handbook/05',
  '/handbook/06': 'handbook/06',
  '/handbook/07': 'handbook/07',
  '/handbook/08': 'handbook/08',
  '/handbook/glossary': 'handbook/glossary',
  '/handbook/reading': 'handbook/reading',
  '/handbook/actions': 'handbook/actions',
}

/**
 * The page's Content-Security-Policy. Camera video is the only third-party
 * traffic a page makes, and only to the hosts the catalogue calls `video`.
 * Everything else — models, fonts, scripts — is served from here.
 * The one framed page is the Instagram reel on /reconstruct. script-src stays
 * closed, so Instagram's embed script is never added to our own pages.
 */
export const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob: https://camerai1.iticfoundation.org https://camera1.iticfoundation.org https://*.ipcamlive.com",
  "connect-src 'self' https://camerai1.iticfoundation.org https://camera1.iticfoundation.org https://*.ipcamlive.com",
  "worker-src 'self' blob:",
  "font-src 'self'",
  "frame-src https://www.instagram.com https://instagram.com",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ')

export function securityHeaders() {
  return {
    'Content-Security-Policy': CSP,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(self), microphone=(), geolocation=(), payment=(), usb=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
    // https-only site; one year, no subdomains and no preload — easy to walk back.
    'Strict-Transport-Security': 'max-age=31536000',
  }
}

/**
 * Resolve a request path inside `root`, or null. Rejects traversal, dotfiles
 * and anything that is not a regular file.
 */
export function safeResolve(root, urlPath) {
  let decoded
  try { decoded = decodeURIComponent(urlPath) } catch { return null }
  if (decoded.includes('\0')) return null
  if (decoded.split('/').some((seg) => seg.startsWith('.'))) return null
  const full = path.resolve(root, '.' + path.posix.normalize('/' + decoded))
  if (full !== root && !full.startsWith(root + path.sep)) return null
  try {
    const st = fs.statSync(full)
    return st.isFile() ? { full, st } : null
  } catch { return null }
}

/**
 * The four rooms of the path a person walks, in order. A page that is one of
 * them marks its own step, so "where am I" is answered by the markup rather
 * than by a colour only a sighted reader can see.
 */
const PATH_STEP = { '/learn': 'begin', '/cameras': 'look', '/train': 'teach', '/games': 'judge' }

/** Assemble a page: partials in, current page and path step marked, version stamped. */
export function assemblePage(html, { partials, page, version, route }) {
  const hasPath = html.includes('<!--#path-->')
  const nav = (partials.nav ?? '').replace('<!--#learningpath-->', hasPath ? partials.path ?? '' : '')
  let out = html.replace('<!--#path-->', '').replace(/<!--#(\w+)-->/g, (m, name) => name === 'nav' ? nav : partials[name] ?? m)
  out = out.replace(`data-page="${page}"`, `data-page="${page}" aria-current="page"`)
  // `data-step` values are words, never page names, so this can only ever
  // touch the learning-path rail and not some other element's attribute.
  const step = PATH_STEP[route]
  if (step) out = out.replaceAll(`data-step="${step}"`, `data-step="${step}" aria-current="step"`)
  return out.replaceAll('{{v}}', version)
}

// Models, fonts and vendored libraries never change under the same path (a new
// version gets a new folder), so they are cached for a year at the edge. Our
// own JS and CSS revalidate on every load — the imports do carry a ?v= stamp,
// but a stale nested module remains the failure mode to guard: no module may
// ever be imported under two different URLs, or the page splits the module
// registry (two store.js instances, two languages, two everythings). The
// stamps are checked by hand at release; check-site verifies the imports
// themselves resolve. A 304 is cheap.
function cacheControl(rel) {
  if (/^\/(models|fonts|vendor)\//.test(rel)) return 'public, max-age=31536000, immutable'
  if (/^\/(img|data)\//.test(rel)) return 'public, max-age=3600'
  return 'no-cache'
}

export const SITE = 'https://vision.nonarkara.org'

/** The clean route a page file is served under (index → /), or null for 404. */
const ROUTE_OF = new Map(Object.entries(PAGES).map(([route, name]) => [name, route]))
export function routeOf(pageName) { return ROUTE_OF.get(pageName) ?? null }

/**
 * True only when this client told us it can read gzip.
 *
 * A bare /\bgzip\b/ test used to answer this, which matched the token whatever
 * its quality: "gzip;q=0" means "not acceptable" (RFC 9110 §12.5.3), and those
 * clients were served a gzipped body with a compressed Content-Length anyway.
 */
export function wantsGzip(req) {
  const header = String(req.headers?.['accept-encoding'] ?? '')
  for (const part of header.split(',')) {
    const [name, ...params] = part.trim().split(';')
    if (!/^(gzip|x-gzip)$/i.test(name.trim())) continue
    const q = params.map((p) => p.trim().toLowerCase()).find((p) => p.startsWith('q='))
    const quality = q ? Number.parseFloat(q.slice(2)) : 1
    return Number.isFinite(quality) && quality > 0
  }
  return false
}

/**
 * The tags a link preview and a crawler read, built from the page's own
 * `<title>` and description so they can never drift from what a visitor sees.
 * Pages that are not a real route (404) are kept out of the index.
 */
export function socialMeta(html, route, status = 200) {
  const attr = (s) => s.replace(/"/g, '&quot;')
  const tags = []
  if (status !== 200 || !route) {
    tags.push('<meta name="robots" content="noindex">')
  } else {
    const title = html.match(/<title>([^<]+)<\/title>/)?.[1]?.trim()
    const desc = html.match(/<meta name="description" content="([^"]+)"/)?.[1]?.trim()
    if (title) tags.push(`<meta property="og:title" content="${attr(title)}">`)
    if (desc) tags.push(`<meta property="og:description" content="${attr(desc)}">`)
    if (title && desc) {
      tags.push(
        '<meta property="og:type" content="website">',
        `<meta property="og:url" content="${SITE}${route}">`,
        '<meta property="og:site_name" content="Vision">',
        '<meta name="twitter:card" content="summary">',
        `<link rel="canonical" href="${SITE}${route}">`,
      )
    }
  }
  if (!tags.length) return html
  return html.replace('</head>', `${tags.join('\n')}\n</head>`)
}

export function createStatic({ root, version, log = () => {} }) {
  const partialDir = path.join(root, 'partials')
  const memo = new Map() // key -> { body, gz, type, etag }

  function partials() {
    const out = {}
    for (const f of fs.readdirSync(partialDir)) {
      if (f.endsWith('.html')) out[f.slice(0, -5)] = fs.readFileSync(path.join(partialDir, f), 'utf8')
    }
    return out
  }

  function load(key, full, st) {
    const etag = `W/"${st.size.toString(36)}-${Math.floor(st.mtimeMs).toString(36)}-${version}"`
    const hit = memo.get(key)
    if (hit && hit.etag === etag) return hit
    // The body used to be passed through a `transform` callback here. Nothing
    // ever supplied one — the transform branch was unreachable, and a reader
    // could reasonably believe page assembly happened inside it.
    const body = fs.readFileSync(full)
    const type = TYPES[path.extname(full)] ?? 'application/octet-stream'
    const gz = COMPRESSIBLE.test(type) && body.length > 1024 ? zlib.gzipSync(body, { level: 9 }) : null
    const entry = { body, gz, type, etag }
    // Large binaries (model shards) are NOT memoised, so they cost a full read per
    // request instead of one heap copy. The comment here used to claim they were
    // "streamed from the page cache", which nothing did — load() read the whole
    // file synchronously and send() ended with it. The skip itself is real and
    // worth keeping: it is what stops an 11 MB WASM blob from being held twice.
    if (body.length < 2 * 1024 * 1024) memo.set(key, entry)
    return entry
  }

  function send(req, res, entry, cc, status = 200, wasmWorker = false) {
    const headers = { 'Content-Type': entry.type, 'Cache-Control': cc, ETag: entry.etag, Vary: 'Accept-Encoding', ...securityHeaders() }
    // Only this worker may compile WASM; document scripts still cannot eval.
    if (wasmWorker) headers['Content-Security-Policy'] = CSP.replace("script-src 'self'", "script-src 'self' 'wasm-unsafe-eval'")
    if (status === 200 && req.headers['if-none-match'] === entry.etag) { res.writeHead(304, headers); return res.end() }
    const wantsGz = entry.gz && wantsGzip(req)
    const body = wantsGz ? entry.gz : entry.body
    if (wantsGz) headers['Content-Encoding'] = 'gzip'
    headers['Content-Length'] = body.length
    res.writeHead(status, headers)
    res.end(req.method === 'HEAD' ? undefined : body)
  }

  /** Assemble and send one page. Pages are rebuilt per request: partials can change without the page file changing. */
  function page(req, res, pageName, status = 200) {
    const found = safeResolve(root, `/${pageName}.html`)
    if (!found) return false
    const html = socialMeta(assemblePage(fs.readFileSync(found.full, 'utf8'), { partials: partials(), page: pageName, version, route: routeOf(pageName) }), routeOf(pageName), status)
    const body = Buffer.from(html)
    // Compress only when this client said it can read gzip — never for the rest.
    const gz = wantsGzip(req) ? zlib.gzipSync(body) : null
    send(req, res, { body, gz, type: TYPES['.html'], etag: `W/"${zlib.crc32 ? zlib.crc32(body).toString(36) : body.length.toString(36)}-${version}"` }, 'no-cache', status)
    return true
  }

  /** Serve a clean-URL page or a static file. Returns false when not found. */
  function serve(req, res, pathname) {
    const clean = pathname.replace(/\.html$/, '').replace(/\/$/, '') || '/'
    const pageName = PAGES[clean === '/index' ? '/' : clean]
    if (pageName) return page(req, res, pageName)
    if (pathname.startsWith('/partials/')) return false
    const found = safeResolve(root, pathname)
    if (!found) return false
    // Originals live under public/ for the repo; visitors get the resized copies in img/ioc/.
    // Compared case-insensitively and Unicode-normalised, because safeResolve used
    // statSync — on APFS that resolves "cctv photos/…" and "CCTV PHOTOS/…" to the same
    // directory, so a case-sensitive startsWith let the full-size originals out.
    const here = found.full.normalize('NFC').toLowerCase()
    if (PRIVATE_DIRS.some((d) => here.startsWith(path.join(root, d).normalize('NFC').toLowerCase() + path.sep))) return false
    // Page templates are only ever served assembled, under their clean URL.
    if (found.full.endsWith('.html')) return false
    // Memo by the resolved file, not the request path: `/a//b` and `/a/b` are one file, one entry.
    send(req, res, load(found.full, found.full, found.st), cacheControl('/' + path.relative(root, found.full).split(path.sep).join('/')), 200, ['js/focus/worker.js', 'js/gesture/worker.js'].includes(path.relative(root, found.full)))
    return true
  }

  return { serve, page }
}

/**
 * JSON response, gzipped when the client allows it.
 *
 * `encoded` is an optional `{ body, gz }` pair for a route that serves the same
 * large document to everyone. Passing it skips both the JSON.stringify and the
 * gzipSync, which on the camera catalogue cost ~19 ms of blocked event loop per
 * request — paid on the one thread that also serves frames.
 */
export function json(req, res, status, data, extra = {}, encoded = null) {
  const body = encoded ? encoded.body : Buffer.from(JSON.stringify(data))
  // Vary always: a cache must not hand a gzipped copy to a client that never asked for one.
  const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', Vary: 'Accept-Encoding', ...securityHeaders(), ...extra }
  let out = body
  if (wantsGzip(req)) {
    const gz = encoded ? encoded.gz : body.length > 1024 ? zlib.gzipSync(body) : null
    if (gz) { out = gz; headers['Content-Encoding'] = 'gzip' }
  }
  headers['Content-Length'] = out.length
  res.writeHead(status, headers)
  res.end(req.method === 'HEAD' ? undefined : out)
}

/**
 * The visitor's address. Behind the tunnel every socket is loopback, so the
 * Cloudflare header is the only signal — but it is trusted ONLY when the
 * socket really is loopback; a direct client could otherwise forge it.
 */
// A header we only trust from the tunnel has to still LOOK like an address
// before it becomes a rate-limiter key. Length alone let any loopback caller
// (the dev server, or anything else on the host) write arbitrary strings into
// the buckets and the logs.
const IPV4 = /^(?:\d{1,3}\.){3}\d{1,3}$/
const IPV6 = /^[0-9a-f:]{2,45}$/i

export function clientIp(req) {
  const remote = req.socket?.remoteAddress ?? ''
  const loopback = remote === '127.0.0.1' || remote === '::1' || remote === '::ffff:127.0.0.1'
  const cf = req.headers['cf-connecting-ip']
  if (loopback && typeof cf === 'string') {
    const value = cf.trim()
    if (value.length < 64 && (IPV4.test(value) || (value.includes(':') && IPV6.test(value)))) return value
  }
  return remote
}

/** Token bucket per key. `rate` tokens per minute, burst of `burst`. */
export function createLimiter({ rate, burst, now = () => Date.now(), max = 20_000 }) {
  const buckets = new Map()
  return {
    take(key) {
      const t = now()
      const b = buckets.get(key) ?? { tokens: burst, at: t }
      b.tokens = Math.min(burst, b.tokens + ((t - b.at) / 60_000) * rate)
      b.at = t
      const ok = b.tokens >= 1
      if (ok) b.tokens -= 1
      // Re-insert so Map iteration order is least-recently-USED first. It used to
      // be insertion-ordered, so the bucket evicted at the cap could be the
      // busiest one on the server.
      buckets.delete(key)
      buckets.set(key, b)
      while (buckets.size > max) buckets.delete(buckets.keys().next().value)
      return ok
    },
    // Read-only introspection. Which bucket the cap evicts is the whole point of
    // this object and was otherwise impossible to observe without spending tokens
    // and evicting further keys while you looked.
    has: (key) => buckets.has(key),
    get size() { return buckets.size },
  }
}
