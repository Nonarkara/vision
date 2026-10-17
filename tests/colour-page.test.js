import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { gloss, describe, share, deal, HOUSE } from '../public/js/pages/colour.js'
import { assignments, contrast, ladder } from '../public/js/core/palette.js'

const PLATES = assignments()
const byDeal = (deal) => PLATES.find((p) => ROLES.every((r) => p.at[r] === deal[r]))
const ROLES = ['ground', 'ink', 'quiet', 'signal']

test('the house arrangement is recognised and says nothing was swapped', () => {
  const house = byDeal(HOUSE)
  assert.ok(house, 'the site’s own arrangement must exist among the 24')
  assert.match(gloss(house).en, /normally wears/)
  assert.match(gloss(house).th, /ยังไม่มีอะไรถูกสับ/)
})

test('every plate gets a gloss in both languages', () => {
  for (const p of PLATES) {
    const g = gloss(p)
    assert.ok(g.th && g.en, `${p.id} has no gloss`)
    assert.notEqual(g.th, g.en)
  }
})

test('a peach-red ground is called out by name, in both languages', () => {
  for (const p of PLATES.filter((x) => x.at.ground === 'signal')) {
    assert.match(gloss(p).en, /Peach red is the paper/)
    assert.match(gloss(p).th, /แดงพีชกลายเป็นพื้นกระดาษ/)
  }
})

test('the gloss leads with the paper, because that is what a person feels first', () => {
  // Where both the paper and the ink moved, the gloss must name the new paper —
  // that is the ordering decision the function encodes, and it is the whole reason
  // a background is discussed before the words sitting on it.
  const NAME = { naples: 'Naples yellow', olive: 'olive green', gray: 'grey', signal: 'Peach red' }
  const moved = PLATES.filter((p) => p.at.ground !== HOUSE.ground && p.at.ink !== HOUSE.ink)
  assert.ok(moved.length, 'expected plates that move both the paper and the ink')
  for (const p of moved) {
    assert.ok(gloss(p).en.includes(NAME[p.at.ground]), `${p.id} did not name the new paper`)
  }
})

test('the machine line reports the measured worst reading and the verdict', () => {
  const legal = PLATES.find((p) => p.legible)
  assert.match(describe(legal).machine.en, /READABLE/)
  assert.ok(!describe(legal).machine.en.includes('NOT READABLE'))
  assert.ok(describe(legal).machine.en.includes(legal.worst.toFixed(2)))

  const bad = PLATES.find((p) => !p.legible)
  assert.match(describe(bad).machine.en, /NOT READABLE/)
  assert.ok(describe(bad).machine.en.includes(bad.worst.toFixed(2)))
})

test('share is a percentage of the honest denominator, and survives a zero', () => {
  assert.deepEqual(share([{ id: 'a', count: 1 }, { id: 'b', count: 3 }], 4).map((r) => r.pct), [25, 75])
  assert.deepEqual(share([{ id: 'a', count: 5 }], 0).map((r) => r.pct), [0])
  assert.deepEqual(share([], 10), [])
})

test('dealing always moves, and never leaves the pool', () => {
  const pool = PLATES.filter((p) => p.legible)
  const first = pool[0]
  const next = deal(pool, first.id)
  assert.notEqual(next.id, first.id)
  assert.ok(pool.some((p) => p.id === next.id))
})

test('dealing falls back to the pool rather than returning nothing', () => {
  const one = [PLATES[0]]
  assert.ok(deal(one, PLATES[0].id))
})

// ─────────────────────────────────────────────────────────────────────────────
// WHAT THE PAGE DRAWS
//
// This section does not test the study — the twenty above do that, and they
// were all here before this one. It pins the decisions that took the noise out,
// because each is exactly the kind of change that returns later as a tidy-up.
//
// Two of these are negative assertions on a stylesheet, which is a strange thing
// to write and an easy thing to mock. They are here because the failure they
// guard against is invisible: a solid field that draws no attention to itself
// still reads as a button-shaped object on the page, and no assertion about
// colour, contrast or meaning would ever notice it had come back.

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const html = read('public/colour.html')
const css = read('public/css/pages/colour.css')

/**
 * The declaration block of one rule, by exact selector.
 * Anchored to the start of a line so `.feel-btn` never matches `.feel-btn:hover`
 * and `.machine-line` never matches the line it shares a selector list with.
 */
const ruleBody = (selector, source = css) => {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`^[ \\t]*${esc}[ \\t]*\\{([^}]*)\\}`, 'm').exec(source)?.[1] ?? null
}

/** What a rule's `background` actually is — '' when it declares none. */
const fill = (body) => (/(?:^|;)\s*background\s*:\s*([^;]*)/.exec(body ?? '')?.[1] ?? '').trim()

test('the deal is drawn once — on the plate — and nowhere else', () => {
  // The spine repeated the plate's four colours as four bands running the height
  // of the chapter, with a key underneath naming them. The key named two of them
  // in the same words the plate already printed in place, twenty pixels away. It
  // was a legend for something the page was already showing, and on a deal that
  // put peach red on the ground it became four coloured rectangles arguing with
  // the one that meant something.
  for (const gone of ['band-stack', 'band-key', 'data-band', 'data-seam', 'class="bands"', 'study-chapter']) {
    assert.ok(!html.includes(gone), `${gone} is back in the markup`)
    assert.ok(!css.includes(gone), `${gone} is back in the stylesheet`)
  }
  assert.equal(html.match(/id="plate"/g).length, 1, 'there must be exactly one thing that receives the deal')

  const js = read('public/js/pages/colour.js')
  assert.match(js, /const s = el\.plate\.style/, 'the four dealt values no longer reach the plate')
  for (const gone of ['--c-ground', '--c-ink', '--c-quiet', '--c-signal', '--seam-']) {
    assert.ok(!js.includes(gone), `${gone} is back in the page script`)
  }
})

test('the seam engine does not come back with it', () => {
  // Dead code that exports itself is not neutral — it looks load-bearing, and
  // this repo has lost parked work twice. If a band ever returns it can be
  // rewritten; it should not find a solved problem already waiting for it.
  for (const gone of ['SEAM_SET', 'SEAM_FLOOR', 'spineSeams', 'seamFor']) {
    assert.ok(!js_has(gone), `${gone} is exported again with nothing to serve`)
  }
})
function js_has(name) {
  return read('public/js/pages/colour.js').includes(name)
}

test('the ten answers are words, and only the chosen one is a field', () => {
  // Ten solid chips was a wall of ten identical objects, and it wrapped nine and
  // one. The resting state is now the word alone; the fill appears when you have
  // answered, so the page has exactly one filled object in the group and it is
  // telling you something true.
  const resting = ruleBody('.feel-btn')
  assert.ok(resting, 'the chip rule is gone')
  assert.ok(
    ['', 'transparent'].includes(fill(resting)),
    `an unchosen answer is a filled field again: background: ${fill(resting)}`
  )

  const chosen = ruleBody('.feel-btn[aria-pressed="true"]')
  assert.ok(chosen, 'there is no chosen state, so choosing shows nothing')
  assert.ok(fill(chosen) && fill(chosen) !== 'transparent', 'the chosen answer is invisible against the page')
})

test('the answers stayed reachable by thumb after losing the box', () => {
  // The box was doing one real job the padding now does invisibly: making a
  // 44px target. Dropping the fill must not quietly drop the size, because that
  // is the one thing a person with a thumb notices and a screenshot does not.
  assert.match(ruleBody('.feel-btn'), /min-height:\s*var\(--target\)/, 'the answers are no longer a thumb-sized target')
})

test('the machine reads out; it does not shout', () => {
  // It was a full-width black field, which made a machine's verdict the loudest
  // object on a page whose one human question is the reason to be there. It was
  // also perfectly legible and perfectly wrong, which is how it survived review.
  const line = ruleBody('.machine-line')
  assert.ok(line, 'the readout rule is gone')
  assert.ok(['', 'transparent'].includes(fill(line)), `the readout is a slab again: background: ${fill(line)}`)
  assert.match(line, /font-family:\s*var\(--mono\)/, 'the readout stopped reading as the machine')
})

test('one way to change the plate is a field; the other two are words', () => {
  // Three solid buttons at the top of the page, equal in weight, competing with
  // the plate they exist to change. Two of them are things you do once.
  const btns = html.match(/<button[^>]*data-deal[^>]*>/g) ?? []
  assert.equal(btns.length, 3, 'expected three ways to change the plate')
  for (const b of btns) {
    const everyday = /data-deal>/.test(b)
    assert.equal(
      /btn-word/.test(b),
      !everyday,
      everyday ? 'the everyday button lost its field' : 'a rare button is competing as a field'
    )
  }
})

test('the chosen answer clears the text floor in both schemes', () => {
  // Pressed inverts ground and text. Light: olive on Naples. Dark: Naples on
  // olive. The same pair both ways, measured once — with the shared instrument,
  // not with arithmetic copied out of the thing being tested.
  const body = ruleBody('.feel-btn[aria-pressed="true"]')
  assert.match(body, /background:\s*var\(--text\)/, 'the choice no longer inverts on the page’s own pairing')
  assert.match(body, /color:\s*var\(--ground\)/)
  const ratio = contrast(ladder().olive.base, ladder().naples.base)
  assert.ok(ratio >= 4.5, `the chosen answer sits at ${ratio.toFixed(2)}:1, under the 4.5 floor`)
})

// ── A TOKEN THAT LOOKS INTERCHANGEABLE AND IS NOT ───────────────────────────
//
// --quiet-text is declared once, as olive, and neither dark block re-declares it.
// Every other use in the site pairs it with `background: var(--quiet)` — a grey
// field — where olive is the right ink in both schemes. That is why it was left
// alone: it is not broken, it is specialised.
//
// The two uses that put it straight on the page were broken, and both were found
// by rendering rather than by reading. The machine's readout and the sentence
// inviting the first answer both measured 1.00:1 in dark mode: olive on olive,
// i.e. not on the page at all. --text follows the scheme and is the right token
// for the page's own ink.
//
// This is repo-wide because the mistake is not local to one file — it is the
// token that looks like --text and is not.

test('--quiet-text is only ever used as ink on a grey field', () => {
  const files = []
  const walk = (dir) => {
    for (const e of readdirSync(new URL(dir, import.meta.url), { withFileTypes: true })) {
      if (e.isDirectory()) walk(`${dir}${e.name}/`)
      else if (e.name.endsWith('.css')) files.push(`${dir}${e.name}`)
    }
  }
  walk('../public/css/')

  const bad = []
  for (const file of files) {
    const src = readFileSync(new URL(file, import.meta.url), 'utf8')
    // Comments carry no declarations but they do carry braces-free prose, which
    // a selector-matching regex will happily read as the selector.
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // Every `selector { body }`, keeping the selector so the failure can be found.
    for (const m of src.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const [, sel, body] = m
      if (!/color\s*:\s*var\(\s*--quiet-text\s*\)/.test(body)) continue
      // …unless the rule puts a grey field behind it, which is the only place
      // an olive that never changes is the correct answer.
      if (/background(?:-color)?\s*:\s*var\(\s*--quiet\s*\)/.test(body)) continue
      bad.push(`${file.replace('../public/css/', '')}: ${sel.trim().replace(/\s+/g, ' ').slice(0, 60)}`)
    }
  }
  assert.deepEqual(bad, [], `--quiet-text is used as ink directly on the page:\n  ${bad.join('\n  ')}`)
})
