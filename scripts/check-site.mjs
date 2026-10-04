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

// 1. Pages: assemble, scan for local references and CSP hazards.
for (const route of Object.keys(PAGES)) {
  const res = await fetch(base + route)
  if (res.status !== 200) { fail(route, `HTTP ${res.status}`); continue }
  const html = await res.text()
  if (/<!--#\w+-->/.test(html)) fail(route, 'unfilled partial')
  if (html.includes('{{v}}')) fail(route, 'unstamped version')
  if (/<script(?![^>]*\bsrc=)[^>]*>/i.test(html)) fail(route, 'inline <script> (CSP blocks it)')
  if (/\sstyle\s*=/i.test(html)) fail(route, 'style="" attribute (CSP blocks it)')
  if (/PLACEHOLDER/.test(html)) fail(route, 'placeholder text left in page')
  if (!/<title>[^<]+<\/title>/.test(html)) fail(route, 'missing <title>')
  if (!/<meta name="description"/.test(html)) fail(route, 'missing meta description')
  const th = (html.match(/class="th"/g) ?? []).length
  const en = (html.match(/class="en"/g) ?? []).length
  if (Math.abs(th - en) > 2) fail(route, `language parity: ${th} Thai vs ${en} English spans`)
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

// 3. Every JS file parses, and every relative import resolves.
for (const file of walk(path.join(PUBLIC, 'js'), '.js')) {
  const rel = path.relative(ROOT, file)
  try { execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' }) } catch (e) { fail(rel, `syntax: ${String(e.stderr).split('\n').slice(0, 4).join(' ')}`) }
  const src = fs.readFileSync(file, 'utf8')
  for (const match of src.matchAll(/(?:^|[\s;])(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|^import\s+['"]([^'"]+)['"]/gm)) {
    const spec = match[1] ?? match[2] ?? match[3]
    if (!spec) continue
    const target = spec.startsWith('/') ? path.join(PUBLIC, spec) : path.resolve(path.dirname(file), spec)
    if (!fs.existsSync(target)) fail(rel, `import ${spec} → missing`)
  }
}

// 4. Models: every weight shard the manifests name is present.
for (const manifest of walk(path.join(PUBLIC, 'models'), 'model.json')) {
  const m = JSON.parse(fs.readFileSync(manifest, 'utf8'))
  for (const group of m.weightsManifest ?? []) for (const p of group.paths) {
    if (!fs.existsSync(path.join(path.dirname(manifest), p))) fail(path.relative(ROOT, manifest), `missing shard ${p}`)
  }
}

// 5. Server basics.
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
