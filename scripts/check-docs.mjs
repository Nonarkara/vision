// Every relative link and image in the repository's Markdown must resolve —
// files, and #anchors computed the way GitHub computes heading ids. External
// links are not fetched here (they were checked by hand; see
// docs/reference/reading-list.md), so this stays fast and offline.
// Also lints Mermaid sequence diagrams for ';', which breaks them on GitHub.
//
//   node scripts/check-docs.mjs

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { slug } from './slug.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const problems = []

function markdownFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (['node_modules', '.git', 'public', 'out'].includes(e.name)) return []
    const p = path.join(dir, e.name)
    if (e.isDirectory()) return markdownFiles(p)
    return e.name.endsWith('.md') ? [p] : []
  })
}

function anchorsOf(file) {
  const text = fs.readFileSync(file, 'utf8').replace(/```[\s\S]*?```/g, '')
  const seen = new Map()
  const out = new Set()
  for (const m of text.matchAll(/^#{1,6}\s+(.+)$/gm)) {
    const base = slug(m[1])
    const n = seen.get(base) ?? 0
    seen.set(base, n + 1)
    out.add(n ? `${base}-${n}` : base)
  }
  return out
}

for (const file of markdownFiles(ROOT)) {
  const raw = fs.readFileSync(file, 'utf8')
  const text = raw.replace(/```[\s\S]*?```/g, '')
  const rel = path.relative(ROOT, file)
  // Mermaid treats ';' as a statement end, so one inside a sequence-diagram
  // message or note silently breaks the whole diagram on GitHub.
  for (const m of raw.matchAll(/```mermaid\n([\s\S]*?)```/g)) {
    if (!/^\s*sequenceDiagram/.test(m[1])) continue
    m[1].split('\n').forEach((line, i) => {
      if (line.includes(';')) problems.push(`${rel}: mermaid sequence line ${i + 1} contains ';' — "${line.trim()}"`)
    })
  }
  for (const m of text.matchAll(/!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
    const target = m[1]
    if (/^(https?:|mailto:)/.test(target)) continue
    if (target.startsWith('/')) continue // site routes — validated by check-site against the router
    const [p, anchor] = target.split('#')
    const resolved = p ? path.resolve(path.dirname(file), decodeURI(p)) : file
    if (!fs.existsSync(resolved)) { problems.push(`${rel}: missing ${target}`); continue }
    if (anchor && resolved.endsWith('.md') && !anchorsOf(resolved).has(anchor)) {
      problems.push(`${rel}: no heading for #${anchor} in ${path.relative(ROOT, resolved)}`)
    }
  }
}

if (problems.length) {
  console.error(problems.join('\n'))
  console.error(`\n✗ ${problems.length} documentation problem(s)`)
  process.exit(1)
}
console.log('✓ documentation links and anchors resolve; mermaid sequence diagrams are free of \';\'')
