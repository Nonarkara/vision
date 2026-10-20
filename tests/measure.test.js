import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join, relative } from 'node:path'

/**
 * THE HOUSE MEASURE — 65ch, and nowhere wider.
 *
 * ANTI-SLOP.md rule 2: "Lines too long to read. ≤65ch for prose." It is the second
 * most common slop pattern in the study — 64% of slop apps went over 40em, median
 * line 61em against 26em for the clean ones.
 *
 * This test exists because the CSS had drifted past its own rule without anyone
 * noticing: the prose was capped at 62ch while five other rules sat at 68ch, 70ch
 * and 80ch. None of them were visible as a defect in a screenshot — a line that is
 * ten percent too long looks like a line. It is a number, and numbers can be
 * checked.
 *
 * The number that matters is the one the reader gets. A container's `max-width` in
 * `ch` is measured against the container's own font-size, so a 70ch container
 * handing a 14px paragraph is a 70ch line on the page, whatever the container was
 * sized for. That is why the rule is checked on every declaration rather than on
 * the prose class alone: the house rule is about the line a person reads, and the
 * only reliable way to keep that honest is to keep every declaration under it.
 */

const CSS_ROOT = fileURLToPath(new URL('../public/css/', import.meta.url)).replace(/\/?$/, '/')

function cssFiles(dir = CSS_ROOT, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) cssFiles(p, out)
    else if (e.name.endsWith('.css')) out.push(p)
  }
  return out
}

test('no line on this site is wider than the house measure of 65ch', () => {
  const over = []
  for (const file of cssFiles()) {
    const src = readFileSync(file, 'utf8')
    for (const m of src.matchAll(/max-width:\s*(\d+(?:\.\d+)?)ch\b/g)) {
      const n = Number(m[1])
      if (n > 65) over.push(`${relative(CSS_ROOT, file)}: ${m[0]} (${n}ch)`)
    }
  }
  assert.deepEqual(over, [], `a line is wider than the house measure:\n  ${over.join('\n  ')}`)
})

test('the prose itself is capped at 62ch, which is the house number', () => {
  // 65ch is the ceiling; 62ch is what the house actually sets, and it is the
  // number .prose, .note and the timeline all use. If this moves, the reason
  // has to be written down.
  const src = readFileSync(new URL('../public/css/vision.css', import.meta.url), 'utf8')
  assert.match(src, /\.prose \{ max-width: 62ch; \}/)
  assert.match(src, /figcaption \{[^}]*max-width: 62ch; \}/)
  assert.match(src, /\.note \{[^}]*max-width: 62ch; \}/)
})

test('the measure is applied to the text, not only to a container around it', () => {
  // A cap on a container is measured in the container's font-size. The 1.18.0
  // audit found .prose capped at 62ch but handing a 14px paragraph, so the
  // paragraph underneath got 73ch. The fix was to put the cap on the elements
  // that carry the type. This pins that: the prose children carry the cap at
  // the size the reader sees, and the two elements that set their own size
  // carry it themselves.
  const src = readFileSync(new URL('../public/css/vision.css', import.meta.url), 'utf8')
  assert.match(
    src,
    /\.prose p, \.prose li, \.prose dd,[\s\S]*?\.session-results p \{ max-width: 62ch; \}/,
    'the prose children no longer carry the measure themselves',
  )
  assert.match(src, /figcaption \{[^}]*font-size: var\(--read\)[^}]*max-width: 62ch;/)
  assert.match(src, /\.note \{[^}]*font-size: var\(--read\)[^}]*max-width: 62ch;/)
})
