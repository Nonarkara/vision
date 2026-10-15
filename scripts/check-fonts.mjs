/**
 * Font integrity.
 *
 * The pairing is a claim about who is speaking, and until this script nothing
 * in the gate checked it. Two ways it can quietly rot:
 *
 *   1. A family is named somewhere — a canvas `ctx.font`, an SVG figure, a
 *      font stack — that no @font-face ships. The browser falls back without a
 *      word, the page still renders, and the claim is now false. This is how
 *      the old pairing drifted for months: JetBrains Mono stayed hard-coded in
 *      six canvas draw calls long after the font was swapped out.
 *   2. A .woff2 sits in public/fonts that no @font-face loads. Nobody notices,
 *      because it is invisible — and it is still bytes every visitor pays for.
 *
 * Both directions are checked. Generics and var() references are allowed; an
 * unresolvable *named* family is not.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const rel = (f) => path.relative(ROOT, f)
const problems = []
const fail = (where, msg) => problems.push(`${where}: ${msg}`)

/** Families that need no @font-face: the CSS-wide keywords and the system stacks. */
const GENERIC = new Set([
  'serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui',
  'ui-serif', 'ui-sans-serif', 'ui-monospace', 'ui-rounded', 'math', 'emoji',
  'fangsong', '-apple-system', 'blinkmacsystemfont', 'segoe ui', 'segoe ui emoji',
  'segoe ui symbol', 'roboto', 'helvetica', 'helvetica neue', 'arial', 'times',
  'times new roman', 'georgia', 'verdana', 'tahoma', 'trebuchet ms', 'courier',
  'courier new', 'noto sans thai', 'noto sans', 'noto serif', 'apple color emoji',
])

function walk(dir, ext) {
  const out = []
  if (!fs.existsSync(dir)) return out
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...walk(p, ext))
    else if (p.endsWith(ext)) out.push(p)
  }
  return out
}

/** Split a font-family list into bare family names, dropping quotes and var(). */
function familiesIn(value) {
  return value
    .split(',')
    .map((s) => s.trim().replace(/^["'`]|["'`]$/g, '').trim())
    .filter((s) => s && !s.startsWith('var(') && !/^\d/.test(s) && !s.includes('('))
}

// ── 1. what the stylesheets actually ship ────────────────────────────────────
const cssFiles = walk(path.join(ROOT, 'public/css'), '.css')
if (!cssFiles.length) fail('public/css', 'no stylesheets found — is the path right?')

const declared = new Set()
const loaded = new Map() // /fonts/x.woff2 → css file that loads it

for (const file of cssFiles) {
  const text = fs.readFileSync(file, 'utf8')
  for (const m of text.matchAll(/@font-face\s*\{([^}]*)\}/g)) {
    const body = m[1]
    const fam = /font-family:\s*["']?([^;"']+?)\s*["']?\s*;/.exec(body)?.[1]?.trim()
    const src = /url\(\s*["']?(\/fonts\/[^"')]+)/.exec(body)?.[1]
    if (!fam) { fail(rel(file), '@font-face block names no font-family'); continue }
    if (!src) { fail(rel(file), `@font-face "${fam}" has no src url`); continue }
    declared.add(fam)
    if (loaded.has(src)) fail(rel(file), `${src} is loaded here and in ${loaded.get(src)}`)
    loaded.set(src, rel(file))
  }
}
if (!declared.size) fail('public/css', 'no @font-face rules at all — every family would silently fall back')

/** Every text surface that can name a family or point at a font file. */
const scan = [
  ...walk(path.join(ROOT, 'public'), '.css'),
  ...walk(path.join(ROOT, 'public'), '.svg'),
  ...walk(path.join(ROOT, 'public'), '.html'),
  ...walk(path.join(ROOT, 'public'), '.js'),
  ...walk(path.join(ROOT, 'docs'), '.svg'),
  ...walk(path.join(ROOT, 'docs'), '.md'),
]

// ── 2. every shipped woff2 is loaded, every loaded woff2 exists ──────────────
const fontDir = path.join(ROOT, 'public/fonts')
for (const f of fs.readdirSync(fontDir).filter((f) => f.endsWith('.woff2'))) {
  const url = `/fonts/${f}`
  if (!loaded.has(url)) {
    const kb = Math.round(fs.statSync(path.join(fontDir, f)).size / 1024)
    fail('public/fonts', `${url} is shipped but no @font-face loads it — ${kb} KB nobody downloads`)
  }
}
for (const [url, file] of loaded) {
  if (!fs.existsSync(path.join(ROOT, 'public', url))) fail(file, `${url} is loaded but the file is missing`)
}

// ── 2b. anything that *points* at a font file points at a real, loaded one ───
// The @font-face pass above cannot see this class of bug: a <link rel=preload>
// or an href naming a woff2 that no stylesheet loads is invisible to it, and
// 404s in silence. That is exactly how a deleted display font stayed preloaded
// on every page in the site.
for (const file of scan) {
  const text = fs.readFileSync(file, 'utf8')
  for (const m of text.matchAll(/\/fonts\/[A-Za-z0-9._-]+\.woff2/g)) {
    const url = m[0]
    if (!loaded.has(url)) {
      const line = text.slice(0, m.index).split('\n').length
      fail(rel(file), `references ${url} on line ${line} — no @font-face loads it, so it 404s`)
    }
  }
}

// ── 3. no unresolvable family is named anywhere ──────────────────────────────
for (const file of scan) {
  const text = fs.readFileSync(file, 'utf8')
  const named = new Set()

  // font-family: <list>   (CSS, and SVG/HTML presentation attributes)
  for (const m of text.matchAll(/font-family\s*[:=]\s*"?([^;"'\n}]+)/g)) {
    for (const f of familiesIn(m[1])) named.add(f)
  }
  // ctx.font = `600 12px "Some Face", monospace`   (canvas). The family list is
  // whatever follows the size, so the size has to be stepped over first —
  // otherwise the shorthand '20px sans-serif' reads as a family named "20px sans-serif".
  for (const m of text.matchAll(/\.font\s*=\s*([^\n;]+)/g)) {
    const px = m[1].search(/\bpx\b/)
    if (px < 0) continue // not a font shorthand — an object property, say
    for (const f of familiesIn(m[1].slice(px + 2))) named.add(f)
  }

  for (const fam of named) {
    if (declared.has(fam) || GENERIC.has(fam.toLowerCase())) continue
    fail(rel(file), `names font family "${fam}" — no @font-face ships it, so this silently falls back`)
  }
}

if (problems.length) {
  console.error(`✗ ${problems.length} font problem(s):\n  ` + problems.join('\n  '))
  process.exit(1)
}
console.log(`✓ ${declared.size} families, ${loaded.size} fonts, no unresolvable name and no orphaned file`)
process.exit(0)