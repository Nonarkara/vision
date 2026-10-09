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
  '/games': 'games',
  '/everyday': 'everyday',
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
  "frame-src 'none'",
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

/** Assemble a page: partials in, current page marked, version stamped. */
export function assemblePage(html, { partials, page, version }) {
  let out = html.replace(/<!--#(\w+)-->/g, (m, name) => partials[name] ?? m)
  out = out.replace(`data-page="${page}"`, `data-page="${page}" aria-current="page"`)
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

/** True only when this client told us it can read gzip. */
export function wantsGzip(req) {
  return /\bgzip\b/.test(String(req.headers?.['accept-encoding'] ?? ''))
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

  function load(key, full, st, transform) {
    const etag = `W/"${st.size.toString(36)}-${Math.floor(st.mtimeMs).toString(36)}-${version}"`
    const hit = memo.get(key)
    if (hit && hit.etag === etag) return hit
    let body = fs.readFileSync(full)
    if (transform) body = Buffer.from(transform(body.toString('utf8')))
    const type = TYPES[path.extname(full)] ?? 'application/octet-stream'
    const gz = COMPRESSIBLE.test(type) && body.length > 1024 ? zlib.gzipSync(body, { level: 9 }) : null
    const entry = { body, gz, type, etag }
    // Large binaries (model shards) are streamed from the page cache, not memo'd.
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
    const html = socialMeta(assemblePage(fs.readFileSync(found.full, 'utf8'), { partials: partials(), page: pageName, version }), routeOf(pageName), status)
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
    if (PRIVATE_DIRS.some((d) => found.full.startsWith(path.join(root, d) + path.sep))) return false
    // Page templates are only ever served assembled, under their clean URL.
    if (found.full.endsWith('.html')) return false
    // Memo by the resolved file, not the request path: `/a//b` and `/a/b` are one file, one entry.
    send(req, res, load(found.full, found.full, found.st), cacheControl('/' + path.relative(root, found.full).split(path.sep).join('/')), 200, path.relative(root, found.full) === 'js/focus/worker.js')
    return true
  }

  return { serve, page }
}

/** JSON response, gzipped when the client allows it. */
export function json(req, res, status, data, extra = {}) {
  const body = Buffer.from(JSON.stringify(data))
  // Vary always: a cache must not hand a gzipped copy to a client that never asked for one.
  const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', Vary: 'Accept-Encoding', ...securityHeaders(), ...extra }
  let out = body
  if (body.length > 1024 && wantsGzip(req)) {
    out = zlib.gzipSync(body)
    headers['Content-Encoding'] = 'gzip'
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
export function clientIp(req) {
  const remote = req.socket?.remoteAddress ?? ''
  const loopback = remote === '127.0.0.1' || remote === '::1' || remote === '::ffff:127.0.0.1'
  const cf = req.headers['cf-connecting-ip']
  if (loopback && typeof cf === 'string' && cf.length < 64) return cf
  return remote
}

/** Token bucket per key. `rate` tokens per minute, burst of `burst`. */
export function createLimiter({ rate, burst, now = () => Date.now() }) {
  const buckets = new Map()
  return {
    take(key) {
      const t = now()
      const b = buckets.get(key) ?? { tokens: burst, at: t }
      b.tokens = Math.min(burst, b.tokens + ((t - b.at) / 60_000) * rate)
      b.at = t
      const ok = b.tokens >= 1
      if (ok) b.tokens -= 1
      buckets.set(key, b)
      if (buckets.size > 20_000) buckets.delete(buckets.keys().next().value)
      return ok
    },
  }
}
