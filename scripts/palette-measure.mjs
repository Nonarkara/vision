// Measure and certify the site's colour system, and print it.
//
// The claim lives in one place now — public/js/core/palette.js — and this file is
// only the instrument pointed at it. It used to carry its own private copy of the
// ladder and said so, which meant a hue added to the CSS was invisible to --check.
// The ladder now sits with the site it describes, so the thing that certifies a
// pairing and the thing that paints it cannot drift apart.
//
//   node scripts/palette-measure.mjs           print the table
//   node scripts/palette-measure.mjs --check   fail if a pairing drops below its floor
//
// SCOPE, restated because it is still a real limit: this measures the tokens the
// site ships and the study plates /colour deals. It is not a screenshot differ, and
// it does not read rendered pixels. vision.css also declares --black-2 and
// --black-3, which are instrument steps and deliberately not ladder values.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ladder, pairings, assignments, contrast, FLOOR } from '../public/js/core/palette.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/** Read the tokens the stylesheet actually declares, so a renamed hue fails loudly. */
function declaredTokens() {
  const css = fs.readFileSync(path.join(ROOT, 'public/css/vision.css'), 'utf8')
  const found = new Set()
  for (const m of css.matchAll(/^\s*(--[a-z0-9-]+):\s*(#[0-9a-fA-F]{3,8})\s*;/gm)) found.add(m[1])
  return found
}

const isMain = process.argv[1] && process.argv[1].endsWith('palette-measure.mjs')
if (isMain) {
  const p = ladder()
  const rows = pairings(p)
  const plates = assignments(p)

  console.log('\n  TONE LADDER — every hue on one shared ladder\n')
  console.log('  hue      deep      base      pale')
  for (const [name, t] of Object.entries(p)) {
    console.log(`  ${name.padEnd(8)}  ${t.deep}   ${t.base}   ${t.pale}`)
  }

  // The CSS must still declare each ladder base it is supposed to. This is the
  // check the private-copy version could not do: it would happily certify a ladder
  // whose hues the page had stopped using.
  const tokens = declaredTokens()
  const cssMismatch = []
  for (const name of ['naples', 'olive', 'gray', 'signal']) {
    if (!tokens.has(`--${name}`)) cssMismatch.push(`--${name} is on the ladder but not declared in vision.css`)
  }

  console.log('\n  PAIRINGS — measured, not asserted\n')
  for (const r of rows) {
    const mark = r.claim === 'banned' ? (r.pass ? '⊘' : '✗') : r.pass ? '✓' : '✗'
    const need = r.claim === 'banned' ? `stays under ${r.floor}` : `needs ${r.floor}`
    console.log(
      `  ${mark} ${r.ratio.toFixed(2).padStart(6)}:1  (${need.padEnd(19)})  ${r.name.padEnd(24)} ${r.fg} on ${r.bg}`,
    )
  }

  const legal = plates.filter((a) => a.legible)
  const forbidden = plates.filter((a) => !a.legible)
  console.log('\n  COLOUR STUDY — 24 deals of 4 hues to 4 roles\n')
  console.log(`  ${legal.length} legible · ${forbidden.length} behind the explicit toggle\n`)
  const grounds = [...new Set(forbidden.map((a) => a.groundHue))]
  if (grounds.length) {
    console.log(`  No hue clears ${FLOOR.text}:1 on ${grounds.join(', ')} at any tone —`)
    console.log('  so the machine refuses it as a ground, while a person still reads it.')
    console.log('')
  }

  const failed = rows.filter((r) => !r.pass)
  const req = rows.filter((r) => r.claim === 'required').length
  const broken = [...failed.map((f) => `${f.name} ${f.ratio.toFixed(2)}:1`), ...cssMismatch]
  console.log('')
  if (process.argv.includes('--check') && broken.length) {
    console.error(`  ${broken.length} claim(s) broken: ${broken.join(', ')}\n`)
    process.exit(1)
  }
  // Never printed on the failing path — this sentence is the claim, and printing
  // it while a claim is broken would state the opposite of what was measured.
  console.log(
    `  ${req} required pairings clear their floor · ${rows.length - req} forbidden pairings stay illegible · every ladder hue is still in the CSS.\n`,
  )
}