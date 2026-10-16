import { test } from 'node:test'
import assert from 'node:assert/strict'
import { gloss, describe, share, deal, HOUSE, spineSeams, SEAM_SET } from '../public/js/pages/colour.js'
import { assignments } from '../public/js/core/palette.js'

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
// THE SPINE
//
// The audit's finding was that /colour dealt four hues onto one card and left the
// rest of the page identical, so the colour had nowhere to go. The spine is the
// fix: the deal at page scale, in the chapter's own column.
//
// These tests assert the REASON the seam is computed, never the colour it
// currently returns. Four of five first-draft mutations survived this file — the
// floor was imported from the module under test, the candidate set was never
// inspected, optimality was never checked, and the edge's boundary list lived in
// a caller the tests did not exercise. Each is fixed below, and the literal
// FLOOR is deliberately NOT imported: a test that loosens its own threshold
// alongside the code it is testing is a test that cannot fail.

// The instrument's own arithmetic, so these are not the code under test
// agreeing with itself.
const lum = (h) => {
  const s = h.replace('#', '')
  return [0, 2, 4].map((i) => {
    const c = parseInt(s.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }).reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0)
}
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

// A seam is a mark between fields, so it is held to the mark floor — and to it
// literally, not to whatever the module says the floor is.
const FLOOR = 3

// How well can a boundary be seen, given a seam drawn in `seam`?
const visible = (a, b, seam) =>
  Math.max(ratio(a, b), Math.min(ratio(seam, a), ratio(seam, b)))

// An independent copy of the search, so "did it find the best one" is checkable
// rather than assumed. Brute force over the same five legal values.
const CANDIDATES = ['#0a0a0a', '#101010', '#161616', '#f7f5ef', '#ffffff']
const bestAchievable = (...pairs) =>
  Math.max(...CANDIDATES.map((s) => Math.min(...pairs.map(([a, b]) => visible(a, b, s)))))

test('every seam reaches the mark floor on every plate, in both schemes', () => {
  for (const p of PLATES) {
    for (const page of ['#fbe6a0', '#253122']) {
      const s = spineSeams(p, page)
      const v = [p.ground, p.reads.ink.value, p.reads.quiet.value, p.reads.signal.value]
      // Each seam is checked against the boundary it is KEYED to. Checking a
      // seam against some other pair would pass even when the wiring is wrong.
      const keyed = [['ground|ink', v[0], v[1]], ['ink|quiet', v[1], v[2]], ['quiet|signal', v[2], v[3]]]
      for (const [key, a, b] of keyed) {
        assert.ok(
          visible(a, b, s[key]) >= FLOOR,
          `${p.id} seam ${key} on ${page} left its boundary below ${FLOOR}:1`
        )
      }
      // The edge has to clear the page at BOTH ends, not just the top.
      for (const band of [v[0], v[3]]) {
        assert.ok(
          visible(page, band, s.edge) >= FLOOR,
          `${p.id} edge on ${page} fell below ${FLOOR}:1 against ${band}`
        )
      }
    }
  }
})

test('the seam found is the best one available, not merely a passing one', () => {
  // Guards against scoring by average, which can satisfy the floor on one
  // boundary while abandoning another. Optimality is the property.
  for (const p of PLATES) {
    for (const page of ['#fbe6a0', '#253122']) {
      const s = spineSeams(p, page)
      const v = [p.ground, p.reads.ink.value, p.reads.quiet.value, p.reads.signal.value]
      const got = [
        visible(v[0], v[1], s['ground|ink']),
        visible(v[1], v[2], s['ink|quiet']),
        visible(v[2], v[3], s['quiet|signal']),
      ]
      const want = [
        bestAchievable([v[0], v[1]]),
        bestAchievable([v[1], v[2]]),
        bestAchievable([v[2], v[3]]),
      ]
      for (let i = 0; i < 3; i++) {
        assert.ok(
          Math.abs(got[i] - want[i]) < 0.01,
          `${p.id} seam${i + 1} scored ${got[i].toFixed(2)} when ${want[i].toFixed(2)} was available`
        )
      }
      const gotEdge = Math.min(visible(page, v[0], s.edge), visible(page, v[3], s.edge))
      const wantEdge = bestAchievable([page, v[0]], [page, v[3]])
      assert.ok(
        Math.abs(gotEdge - wantEdge) < 0.01,
        `${p.id} edge on ${page} scored ${gotEdge.toFixed(2)} when ${wantEdge.toFixed(2)} was available`
      )
    }
  }
})

test('no seam colour is a colour a plate can deal', () => {
  // Black and white are the instrument's values; a plate's roles are four hues.
  // A seam drawn in a plate colour is a seam that can vanish — the first draft
  // widened the candidate set to include two plate hues and nothing noticed.
  const plateValues = new Set()
  for (const p of PLATES) {
    plateValues.add(p.ground)
    for (const role of ['ink', 'quiet', 'signal']) plateValues.add(p.reads[role].value)
  }
  for (const s of SEAM_SET) {
    assert.ok(!plateValues.has(s), `${s} is both a seam candidate and a plate colour`)
  }
})

test('the near-black run a deep-tone deal produces is still three bands', () => {
  // The case that motivated computing a seam per pair: ink signal.deep, quiet
  // olive and signal gray.deep sit within ~1.1:1 of each other. Without seams
  // the spine would show one dark blob where there are three roles.
  const p = PLATES.find((x) => x.id === 'naples-signal-olive-gray')
  assert.ok(p, 'this deal must exist')
  const v = [p.ground, p.reads.ink.value, p.reads.quiet.value, p.reads.signal.value]
  assert.ok(
    Math.min(ratio(v[1], v[2]), ratio(v[2], v[3])) < 1.5,
    'the fixture no longer exercises near-identical bands'
  )
  const s = spineSeams(p, '#fbe6a0')
  for (const [a, b, seam] of [[v[1], v[2], s['ink|quiet']], [v[2], v[3], s['quiet|signal']]]) {
    assert.ok(visible(a, b, seam) >= FLOOR, `near-black boundary left at ${visible(a, b, seam).toFixed(2)}:1`)
  }
})

test('the page ground is read the way a computed style hands it back', () => {
  // The EDGE is the only seam that depends on the page, so the edge is what this
  // must compare. The first draft compared an internal seam, which does not
  // depend on the page at all — and so agreed with itself no matter what toHex
  // did. Broken toHex changes the edge on 34 of 48 plates; this is the test that
  // notices.
  for (const p of PLATES) {
    assert.equal(
      spineSeams(p, '#fbe6a0').edge,
      spineSeams(p, 'rgb(251, 230, 160)').edge,
      `${p.id}: the edge seam ignored how the page colour was written`
    )
    assert.equal(
      spineSeams(p, '#253122').edge,
      spineSeams(p, 'rgb(37, 49, 34)').edge,
      `${p.id}: the edge seam ignored how the page colour was written`
    )
  }
})

test('spineSeams is a pure function of plate and page — nothing else', () => {
  const p = PLATES[7]
  assert.deepEqual(spineSeams(p, '#fbe6a0'), spineSeams(p, '#fbe6a0'))
  assert.notDeepEqual(spineSeams(p, '#fbe6a0'), spineSeams(p, '#253122'))
})

test('every deal reaches the spine with four distinct colours', () => {
  for (const p of PLATES) {
    const v = [p.ground, p.reads.ink.value, p.reads.quiet.value, p.reads.signal.value]
    assert.equal(new Set(v).size, 4, `${p.id} does not deal four distinct colours to the spine`)
  }
})
