// Pre-ship check: every page assembles, every local link and asset resolves,
// every module import points at a real file, and nothing the CSP would block
// (inline script, style attributes) or a placeholder slipped into a page.
// Runs the real request handler on an ephemeral port; no FloodDash needed.
//
//   node scripts/check-site.mjs

import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { handler } from '../server/index.js'
import { PAGES } from '../server/http.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PUBLIC = path.join(ROOT, 'public')
const problems = new Set()
const fail = (where, what) => problems.add(`${where}: ${what}`)

function walk(dir, ext) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) return walk(p, ext)
    return p.endsWith(ext) ? [p] : []
  })
}

const server = http.createServer(handler)
server.keepAliveTimeout = 120_000 // the syntax pass below is slow; don't let pooled sockets go stale
await new Promise((r) => server.listen(0, '127.0.0.1', r))
const base = `http://127.0.0.1:${server.address().port}`

const checked = new Map()
async function status(url) {
  if (!checked.has(url)) checked.set(url, fetch(base + url, { method: 'HEAD' }).then((r) => r.status))
  return checked.get(url)
}

/** Which local routes each page links to — reachability is checked in section 3. */
const links = new Map()

// 1. Pages: assemble, scan for local references and CSP hazards.
for (const route of Object.keys(PAGES)) {
  const res = await fetch(base + route)
  if (res.status !== 200) { fail(route, `HTTP ${res.status}`); continue }
  const html = await res.text()
  links.set(route, new Set([...html.matchAll(/\shref="(\/[^"#?]*)/g)].map((m) => m[1] || '/')))
  if (/<!--#\w+-->/.test(html)) fail(route, 'unfilled partial')
  if (html.includes('{{v}}')) fail(route, 'unstamped version')
  if (/<script(?![^>]*\bsrc=)[^>]*>/i.test(html)) fail(route, 'inline <script> (CSP blocks it)')
  if (/\sstyle\s*=/i.test(html)) fail(route, 'style="" attribute (CSP blocks it)')
  if (/PLACEHOLDER/.test(html)) fail(route, 'placeholder text left in page')
  if (!/<title>[^<]+<\/title>/.test(html)) fail(route, 'missing <title>')
  if (!/<meta name="description"/.test(html)) fail(route, 'missing meta description')
  // Prose only: a diagram may set three English labels against two Thai ones
  // and still lose nothing, so `<svg>` is not counted here. Exact equality is
  // the point — one forgotten translation used to pass a tolerance of two.
  const prose = html.replace(/<svg[\s\S]*?<\/svg>/g, '')
  const span = (c) => (prose.match(new RegExp(`class="[^"]*\\b${c}\\b[^"]*"`, 'g')) ?? []).length
  const th = span('th'), en = span('en')
  if (th !== en) fail(route, `language parity: ${th} Thai vs ${en} English spans — a translation is missing`)
  const ariaTh = (html.match(/\bdata-aria-th=/g) ?? []).length
  const ariaEn = (html.match(/\bdata-aria-en=/g) ?? []).length
  if (ariaTh !== ariaEn) fail(route, `aria parity: ${ariaTh} data-aria-th vs ${ariaEn} data-aria-en`)
  if (!/property="og:title"/.test(html)) fail(route, 'missing og:title')
  if (!/rel="canonical"/.test(html)) fail(route, 'missing canonical')
  for (const [, ref] of html.matchAll(/\s(?:src|href)="(\/[^"#]*)/g)) {
    const url = ref.split('?')[0]
    if (url.startsWith('//')) continue
    const s = await status(url || '/')
    if (s !== 200) fail(route, `${url} → ${s}`)
  }
}

// 2. Anchors the footer and pages link to.
for (const [route, anchor] of [['/legal', 'takedown'], ['/system', 'credits']]) {
  const html = await (await fetch(base + route)).text()
  if (!new RegExp(`id="${anchor}"`).test(html)) fail(route, `missing #${anchor}`)
}

// 3. Every room is reachable from the home page in two hops at most — a page
// the nav forgot, and whose own index forgot it too, is a page nobody can find.
{
  const seen = new Set(['/'])
  let frontier = ['/']
  for (let hop = 0; hop < 2 && frontier.length; hop++) {
    const next = []
    for (const route of frontier) {
      for (const href of links.get(route) ?? []) {
        if (seen.has(href) || !(href in PAGES)) continue
        seen.add(href)
        next.push(href)
      }
    }
    frontier = next
  }
  for (const route of Object.keys(PAGES)) if (!seen.has(route)) fail('/', `room ${route} is not reachable from the home page within two links`)
}

// 4. What a crawler reads first: robots, a sitemap that names every room, and a title it can quote.
{
  const robots = await fetch(base + '/robots.txt')
  if (robots.status !== 200) fail('/robots.txt', `HTTP ${robots.status}`)
  else if (!robots.headers.get('content-type')?.startsWith('text/plain')) fail('/robots.txt', `content-type ${robots.headers.get('content-type')}`)
  const sitemap = await fetch(base + '/sitemap.xml')
  if (sitemap.status !== 200) fail('/sitemap.xml', `HTTP ${sitemap.status}`)
  else {
    const xml = await sitemap.text()
    const locs = new Set([...xml.matchAll(/<loc>https:\/\/vision\.nonarkara\.org([^<]*)<\/loc>/g)].map((m) => m[1] || '/'))
    for (const route of Object.keys(PAGES)) if (!locs.has(route)) fail('/sitemap.xml', `missing ${route}`)
    for (const loc of locs) if (!(loc in PAGES)) fail('/sitemap.xml', `unknown route ${loc}`)
  }
}

// 5. Every JS file parses, and every relative import resolves.
for (const file of walk(path.join(PUBLIC, 'js'), '.js')) {
  const rel = path.relative(ROOT, file)
  try { execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' }) } catch (e) { fail(rel, `syntax: ${String(e.stderr).split('\n').slice(0, 4).join(' ')}`) }
  const src = fs.readFileSync(file, 'utf8')
  for (const match of src.matchAll(/(?:^|[\s;])(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|^import\s+['"]([^'"]+)['"]/gm)) {
    const spec = match[1] ?? match[2] ?? match[3]
    if (!spec) continue
    const cleanSpec = spec.split(/[?#]/)[0]
    const target = cleanSpec.startsWith('/') ? path.join(PUBLIC, cleanSpec) : path.resolve(path.dirname(file), cleanSpec)
    if (!fs.existsSync(target)) fail(rel, `import ${spec} → missing`)
  }
}

// 6. Models: every weight shard the manifests name is present.
for (const manifest of walk(path.join(PUBLIC, 'models'), 'model.json')) {
  const m = JSON.parse(fs.readFileSync(manifest, 'utf8'))
  for (const group of m.weightsManifest ?? []) for (const p of group.paths) {
    if (!fs.existsSync(path.join(path.dirname(manifest), p))) fail(path.relative(ROOT, manifest), `missing shard ${p}`)
  }
}

// 7. Server basics.
const health = await fetch(base + '/api/health')
if (health.status !== 200) fail('/api/health', `HTTP ${health.status}`)
if (!health.headers.get('content-security-policy')) fail('/api/health', 'no CSP header')
// fetch() normalises dot segments, so send the raw path with http.get.
for (const raw of ['/%2e%2e/package.json', '/js/%2e%2e/%2e%2e/server/index.js', '/partials/nav.html']) {
  const code = await new Promise((resolve) => http.get(base + raw, (r) => { r.resume(); resolve(r.statusCode) }).on('error', () => resolve(0)))
  if (code !== 404) fail('path safety', `${raw} → ${code}`)
}

server.close()
if (problems.size) {
  console.error(`✗ ${problems.size} problem(s):\n  ` + [...problems].join('\n  '))
  process.exit(1)
}
console.log(`✓ ${Object.keys(PAGES).length} pages, ${checked.size} local references, all JS parses, all model shards present`)
process.exit(0)
