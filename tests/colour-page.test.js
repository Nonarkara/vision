import { test } from 'node:test'
import assert from 'node:assert/strict'
import { gloss, describe, share, deal, HOUSE } from '../public/js/pages/colour.js'
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