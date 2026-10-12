import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spot, spottedRecord, dayKey } from '../public/js/cv/spotted.js'
import { konamiStep, KONAMI } from '../public/js/core/konami.js'
import { sawLatch } from '../public/js/cv/feedback.js'

const car = (x, y) => ({ cls: 3, score: 0.8, x, y, w: 0.1, h: 0.1 })

test('a car counts once while it stays put, and again after it leaves', () => {
  const t0 = Date.parse('2026-10-10T09:00:00')
  let m = spot({ day: '', n: 0, seen: [] }, [car(0.2, 0.4)], t0)
  assert.equal(m.n, 1)
  m = spot(m, [car(0.21, 0.41)], t0 + 1000)
  assert.equal(m.n, 1)
  m = spot(m, [car(0.7, 0.4)], t0 + 2000)
  assert.equal(m.n, 2)
})

test('the stored record is a date and a count, and a new day starts again', () => {
  const t0 = Date.parse('2026-10-10T23:30:00')
  const m = spot({ day: '', n: 0, seen: [] }, [car(0.2, 0.2), { cls: 1, score: 0.9, x: 0, y: 0, w: 0.2, h: 0.4 }], t0)
  assert.equal(m.n, 1)
  assert.deepEqual(Object.keys(spottedRecord(m)).sort(), ['day', 'n'])
  assert.equal(spottedRecord(m).day, dayKey(t0))
  const next = spot(m, [car(0.2, 0.2)], t0 + 24 * 60 * 60 * 1000)
  assert.equal(next.n, 1)
  assert.notEqual(next.day, m.day)
})

test('the Konami code fires only on the full sequence', () => {
  let buf = []
  let fires = 0
  for (const key of ['ArrowUp', 'x', ...KONAMI]) {
    const step = konamiStep(buf, key)
    buf = step.buf
    if (step.fire) fires++
  }
  assert.equal(fires, 1)
  assert.deepEqual(buf, [])
})

test('I saw you flashes once per appearance', () => {
  let state = { armed: true, last: 0 }
  let step = sawLatch(state, 0.1, 1000)
  state = step.state
  assert.equal(step.flash, false)
  step = sawLatch(state, 0.8, 1100)
  state = step.state
  assert.equal(step.flash, true)
  step = sawLatch(state, 0.9, 2000)
  state = step.state
  assert.equal(step.flash, false)
  step = sawLatch(state, 0.1, 3000)
  state = step.state
  step = sawLatch(state, 0.8, 4000)
  assert.equal(step.flash, false)
  step = sawLatch(state, 0.8, 3000 + 6000)
  assert.equal(step.flash, true)
})
