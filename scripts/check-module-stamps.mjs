// A module that changed must be fetched under a new URL.
//
// The house stamps `?v=` on browser-module imports so a reload sees a new
// file, and the server serves those with `Cache-Control: no-cache` — but the
// edge in front of it rewrites that to `max-age=14400`, and a browser that
// already has the old response treats it as fresh for four hours. So the
// stamp is the only thing standing between a changed module and a stale copy.
//
// HTML references do not need this: they carry `{{v}}`, which the server
// renders as the package version on every request, so their URL changes with
// the release. Only a module imported by *another module* has to have its
// stamp moved by hand — which is exactly what gets forgotten.
//
//   node scripts/check-module-stamps.mjs <previous-public-dir>
//
// Exits non-zero and names the file when a changed module is still imported
// under the stamp it had before.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

// fileURLToPath, not new URL(...).pathname: this repo's path contains a
// space, and the URL form percent-encodes it into a path that does not exist.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const nowDir = path.join(root, 'public', 'js')
const prevDir = process.argv[2] ? path.resolve(process.argv[2]) : null

const IMPORT = /(?:^|[\s;])(?:import|export)\s+(?:[^'"]*?\sfrom\s+)?['"]([^'"]+)['"]/g

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else if (e.name.endsWith('.js')) out.push(p)
  }
  return out
}

const hash = (p) => crypto.createHash('sha1').update(fs.readFileSync(p)).digest('hex')

/**
 * Every import in this tree, keyed by the module's path RELATIVE to the tree
 * root — two trees have different absolute paths, so keying by absolute path
 * would never match one against the other and the check would pass forever.
 */
function imports(dir) {
  const map = new Map() // relative module path → Map(relative importer path → stamp)
  for (const file of walk(dir)) {
    const src = fs.readFileSync(file, 'utf8')
    for (const m of src.matchAll(IMPORT)) {
      const spec = m[1]
      if (!spec.startsWith('.')) continue
      const target = path.resolve(path.dirname(file), spec.replace(/[?&]v=[0-9.]+/, ''))
      if (!target.startsWith(dir + path.sep)) continue
      const rel = path.relative(dir, target)
      const stamp = /[?&]v=[0-9.]+/.exec(spec)?.[0] ?? 'unstamped'
      if (!map.has(rel)) map.set(rel, new Map())
      map.get(rel).set(path.relative(dir, file), stamp)
    }
  }
  return map
}

if (!prevDir) {
  console.error('usage: node scripts/check-module-stamps.mjs <previous-public-dir>')
  process.exit(2)
}

const prevJs = path.join(prevDir, 'js')
const nowJs = path.join(root, 'public', 'js')
if (!fs.existsSync(nowJs)) {
  console.error(`✗ no module tree at ${nowJs}`)
  process.exit(2)
}
if (!fs.existsSync(prevJs)) {
  console.log('✓ no previous runtime to compare — every module is fetched under a new URL')
  process.exit(0)
}

const before = imports(prevJs)
const after = imports(nowDir)
const failures = []

for (const [relTarget, importers] of after) {
  const prevImporters = before.get(relTarget)
  if (!prevImporters) continue // a new module: its URL has never been used
  const prevFile = path.join(prevJs, relTarget)
  const target = path.join(nowDir, relTarget)
  if (!fs.existsSync(prevFile) || !fs.existsSync(target)) continue
  if (hash(prevFile) === hash(target)) continue // unchanged: the old URL is still correct
  const nowStamps = new Set(importers.values())
  const prevStamps = new Set(prevImporters.values())
  if (nowStamps.size === prevStamps.size && [...nowStamps].every((s) => prevStamps.has(s))) {
    failures.push({
      module: relTarget,
      stamp: [...nowStamps].join(', '),
      importers: [...importers.keys()],
    })
  }
}

if (failures.length) {
  console.error('✗ a changed module is still imported under its old stamp:')
  for (const f of failures) {
    console.error(`    ${f.module} — imported as ?v=${f.stamp.replace(/[?&]v=/, '')} by ${f.importers.join(', ')}`)
  }
  console.error('  The stamp is the only thing that stops a four-hour stale copy. Move it:')
  console.error('  bump the ?v= in every importer of the files above, then redeploy.')
  process.exit(1)
}

console.log('✓ every changed module is fetched under a new URL')
