import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  HUES, ladder, contrast, pairings, FLOOR, ROLES, assignments, toneFor, plate,
} from '../public/js/core/palette.js'

test('the four hues are the ones the site wears now', () => {
  assert.deepEqual(Object.keys(HUES), ['ivory', 'indigo', 'gray', 'jasper'])
})

test('the tone ladder is one shared move, applied to every hue', () => {
  const p = ladder()
  // deep = 24% black, pale = 22% white — the same percentages for every hue, which
  // is the whole reason four hues read as one system rather than eight colours.
  for (const hue of Object.keys(HUES)) {
    assert.equal(contrast(p[hue].deep, HUES[hue]) > 0, true)
    assert.equal(contrast(p[hue].pale, HUES[hue]) > 0, true)
    assert.notEqual(p[hue].deep, HUES[hue])
    assert.notEqual(p[hue].pale, HUES[hue])
  }
})

test('every required pairing clears its floor and every banned one stays under', () => {
  for (const r of pairings()) {
    if (r.claim === 'required') assert.ok(r.ratio >= r.floor, `${r.name} ${r.ratio}`)
    else assert.ok(r.ratio < r.floor, `${r.name} ${r.ratio}`)
  }
})

test('there are exactly 24 deals of four hues to four roles, each used once', () => {
  const all = assignments()
  assert.equal(all.length, 24)
  for (const a of all) {
    assert.equal(Object.keys(a.at).sort().join(), [...ROLES].sort().join())
    assert.equal(new Set(Object.values(a.at)).size, 4, `${a.id} repeats a hue`)
  }
})

test('every plate id is unique', () => {
  const ids = assignments().map((a) => a.id)
  assert.equal(new Set(ids).size, ids.length)
})

/**
 * The bug this pins: the plate was drawn with ink on the signal bar, which clears
 * nothing — it was under 4.5:1 on all twenty-four plates — while `legible` still
 * said true, because the flag was measuring a pairing the plate does not paint.
 * The check now has to agree with a measurement made from the colours themselves.
 */
test('legible agrees with an independent measurement of the pairings the plate paints', () => {
  for (const a of assignments()) {
    const inkOnPaper = contrast(a.reads.ink.value, a.ground)
    const quietOnPaper = contrast(a.reads.quiet.value, a.ground)
    const markOnPaper = contrast(a.reads.signal.value, a.ground)
    const measured = inkOnPaper >= FLOOR.text && quietOnPaper >= FLOOR.text && markOnPaper >= FLOOR.mark
    assert.equal(a.legible, measured, `${a.id}: flag ${a.legible} but measured ${measured}`)
  }
})

test('a mark needs the non-text floor, not the text floor', () => {
  const p = ladder()
  const a = assignments().find((x) => x.at.ground === 'ivory' && x.at.signal === 'jasper')
  assert.ok(a, 'expected an ivory-ground plate with jasper as the mark')
  assert.equal(a.reads.signal.floor, FLOOR.mark)
  assert.notEqual(FLOOR.mark, FLOOR.text)
})

test('jasper red is the one hue the machine refuses as paper', () => {
  const p = plate()
  assert.deepEqual([...new Set(p.forbidden.map((a) => a.groundHue))], ['jasper'])
  // and it is refused for the honest reason: nothing reaches 4.5:1 against it
  assert.ok(p.forbidden.every((a) => a.worst < FLOOR.text))
  assert.equal(p.legal.length + p.forbidden.length, 24)
})

test('toneFor prefers the base tone and steps down only when it must', () => {
  const p = ladder()
  assert.equal(toneFor(p, 'indigo', p.ivory.base, FLOOR.text).tone, 'base')
  const stepped = toneFor(p, 'gray', p.ivory.base, FLOOR.text)
  assert.notEqual(stepped.tone, 'base')
  assert.ok(stepped.ratio >= FLOOR.text)
})

test('toneFor reports the best it managed when nothing clears', () => {
  const p = ladder()
  // On Jasper Red only indigo.base (5.10), indigo.deep (5.66) and jasper.deep
  // (4.56) reach 4.5:1, which is why every jasper-red-as-paper plate fails:
  // three roles, one usable hue.
  const failed = toneFor(p, 'ivory', p.jasper.base, FLOOR.text)
  assert.equal(failed.pass, false)
  assert.ok(failed.ratio < FLOOR.text)
  assert.equal(failed.value, p.ivory.deep, 'it should still report the tone it tried last')
  // And the ladder really is doing work here, not just failing everything.
  assert.equal(toneFor(p, 'indigo', p.jasper.base, FLOOR.text).pass, true)
})