// Every relative link and image in the repository's Markdown must resolve —
// files, and #anchors computed the way GitHub computes heading ids. External
// links are not fetched here (they were checked by hand; see
// docs/reference/reading-list.md), so this stays fast and offline.
// Also lints Mermaid sequence diagrams for ';', which breaks them on GitHub, and
// checks that no element in the BUILT handbook is labelled with the wrong
// language. The handbook prints both languages at once, so `lang` is the only
// thing a screen reader has to go on — and it used to be picked per element by
// character count, which got it wrong on roughly 130 lines across eight chapters.
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


// ── BUILT handbook: no element may claim the wrong language ────────────────
// The generator now splits a bilingual line into <span lang="th">…</span> —
// <span lang="en">…</span>. What this catches is a line that still holds both
// scripts under ONE lang, which tells a screen reader it is about to hear the
// wrong language for half of it.
const THAI = /[\u0E00-\u0E7F]/
const LATIN = /[A-Za-z]/
const handbookDir = path.join(ROOT, 'public', 'handbook')
let mismatched = 0
for (const name of fs.existsSync(handbookDir) ? fs.readdirSync(handbookDir).filter((f) => f.endsWith('.html')) : []) {
  const file = path.join(handbookDir, name)
  const html = fs.readFileSync(file, 'utf8').replace(/<svg[\s\S]*?<\/svg>/g, '')
  for (const m of html.matchAll(/<(p|li|h[1-6]|figcaption|blockquote|a)\b[^>]*\blang="(th|en)"[^>]*>([\s\S]*?)<\/\1>/g)) {
    // No skip for elements that merely CONTAIN split spans: an element carrying
    // its own lang= *and* bilingual children is exactly the bug (a correctly
    // split element gets no lang of its own, so it never matches this pattern).
    const text = m[3].replace(/<[^>]+>/g, '')
    const th = (text.match(new RegExp(THAI, 'g')) ?? []).length
    const en = (text.match(new RegExp(LATIN, 'g')) ?? []).length
    if (!th || !en) continue                              // single language, nothing to get wrong
    if ((m[2] === 'en' && th > en) || (m[2] === 'th' && en > th)) {
      mismatched++
      problems.push(`public/handbook/${name}: <${m[1]} lang="${m[2]}"> holds both scripts — split it with build-handbook.mjs body()`)
    }
  }
}


// ── Broken emphasis: literal ** outside code ──────────────────────────────
// The bilingual splitter cuts a line at a separator and runs each half through
// the inline renderer separately. A bold label straddling the separator
// ("**เป้าหมาย · Goal:**") hands each half an unpaired "**", the emphasis stops
// rendering, and the handbook ships literal asterisks. Silent, and it only shows
// up if you read the built page rather than the source.
const stars = []
for (const name of fs.readdirSync(handbookDir).filter((f) => f.endsWith('.html'))) {
  const html = fs.readFileSync(path.join(handbookDir, name), 'utf8')
  const outsideCode = html.replace(/<code>[\s\S]*?<\/code>/g, '')
  const stray = (outsideCode.match(/\*\*/g) ?? []).length
  if (stray) problems.push(`public/handbook/${name}: ${stray} literal ** in rendered output — a bold span was split in half`)
}

if (problems.length) {
  console.error(problems.join('\n'))
  console.error(`\n✗ ${problems.length} documentation problem(s)`)
  process.exit(1)
}
console.log(`✓ documentation links and anchors resolve; mermaid sequence diagrams are free of ';'; ${mismatched === 0 ? 'every handbook element names the language it is written in' : `${mismatched} mismatched`}`)
