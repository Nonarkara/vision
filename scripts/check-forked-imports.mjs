// Would any module be fetched under two different URLs?
//
// The rule that keeps module identity whole: a given source file is always
// requested by the same URL. Two ways to break it, both easy to miss by eye:
//
//   1. one site stamps an import `?v=1.13.0` and another does not
//   2. two sites stamp the same import with different versions
//
// (1) is the nastier one, because a grep for `?v=` only ever sees the stamped
// half and reports the file as consistently versioned.
//
//   node scripts/check-forked-imports.mjs

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const JS = path.join(ROOT, 'public', 'js')

const seen = new Map() // resolved path -> Set of '?v=1.2.3' or 'unstamped'
const files = []

function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p)
    else if (e.name.endsWith('.js')) files.push(p)
  }
}
walk(JS)

// `import … from` AND `export … from`. Re-exports used to slip past this check
// entirely — the regex required the literal keyword `import` — so a module pulled
// in by one file as './x.js?v=1.2.3' and by another as './x.js' through a
// re-export was reported as consistent. There are two live re-exports today
// (drive/sim.js, games/common.js); both are stamped consistently, which is what
// this now proves rather than assumes.
const IMPORT = /(?:^|[\s;])(?:import|export)\s+(?:[^'"]*?\sfrom\s+)?['"]([^'"]+)['"]/g

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8')
  for (const m of src.matchAll(IMPORT)) {
    const spec = m[1]
    if (!spec.startsWith('.')) continue // bare/absolute specifier, not ours to resolve
    const stamp = /[?&]v=[0-9.]+/.exec(spec)?.[0] ?? 'unstamped'
    // Strip the query BEFORE resolving, or the two forms become two different
    // keys and the map never notices they are the same file. That is precisely
    // the bug this script exists to catch.
    const bare = spec.replace(/[?&]v=[0-9.]+/, '')
    const resolved = path.resolve(path.dirname(file), bare)
    if (!seen.has(resolved)) seen.set(resolved, new Set())
    seen.get(resolved).add(stamp)
  }
}

const forked = [...seen.entries()].filter(([, stamps]) => stamps.size > 1)

if (forked.length) {
  for (const [file, stamps] of forked) {
    console.error(`✗ ${path.relative(ROOT, file)} is imported as ${[...stamps].join(' AND ')}`)
    console.error('  the browser would fetch it under two URLs and the module would exist twice')
  }
  process.exit(1)
}
console.log(`✓ ${files.length} modules, ${seen.size} resolved imports, no module loaded under two URLs`)