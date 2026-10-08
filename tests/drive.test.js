// The /drive room: the track, the simulated camera, the decision rule, and
// the claims the page makes about how the three habits behave.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildTrack, at, alongMyLane } from '../public/js/drive/track.js'
import { detectChance } from '../public/js/drive/perceive.js'
import { idm } from '../public/js/drive/decide.js'
import { createWorld, step, run, DT, STYLES } from '../public/js/drive/sim.js'

const MINUTES = 10

test('both loops close, and each finds its stop line, its zebras and the roundabout', () => {
  const { A, B } = buildTrack()
  for (const r of [A, B]) {
    const first = r.pts[0], last = r.pts.at(-1)
    assert.ok(Math.hypot(first.x - last.x, first.y - last.y) < 1, `${r.id} is closed`)
    assert.ok(r.stopS != null, `${r.id} has a stop line`)
    assert.ok(r.pts.some((p) => p.ring), `${r.id} passes through the roundabout`)
  }
  assert.equal(A.zebras.length, 2)
  assert.equal(B.zebras.length, 1)
})

test('a point on my road ahead is "in my lane"; one beside the road is not', () => {
  const { A } = buildTrack()
  const p = at(A, 30)
  assert.ok(alongMyLane(A, 0, 50, p.x, p.y))
  assert.equal(alongMyLane(A, 0, 50, p.x, p.y + 12), null)
})

test('the camera misses more when things are far, small or in the dark — and sees nothing when covered', () => {
  const car = { style: STYLES.normal, blind: false }
  assert.ok(detectChance(car, 'person', 5, 'day') > detectChance(car, 'person', 30, 'day'))
  assert.ok(detectChance(car, 'car', 20, 'day') > detectChance(car, 'dog', 20, 'day'))
  assert.ok(detectChance(car, 'person', 15, 'day') > detectChance(car, 'person', 15, 'night'))
  assert.equal(detectChance(car, 'person', 30, 'night'), 0, 'beyond night-time range')
  assert.equal(detectChance({ ...car, blind: true }, 'person', 5, 'day'), 0)
})

test('the driver model accelerates on an empty road and brakes hard for something stopped close ahead', () => {
  const st = STYLES.normal
  assert.ok(idm(8, st.v0, Infinity, 0, st) > 0)
  assert.ok(idm(10, st.v0, 6, 10, st) < -3)
  assert.ok(idm(10, st.v0, 6, 10, st) < idm(10, st.v0, 30, 10, st), 'closer means harder')
})

test('the same seed gives the same race', () => {
  const a = run(createWorld({ seed: 7 }), 60)
  const b = run(createWorld({ seed: 7 }), 60)
  assert.deepEqual(a.cars.map((c) => [c.laps, c.s.toFixed(3)]), b.cars.map((c) => [c.laps, c.s.toFixed(3)]))
})

function race(weather, seed) {
  const w = createWorld({ seed, weather, people: 'many', dogs: 'many' })
  let redRuns = 0
  for (let i = 0; i < (MINUTES * 60) / DT; i++) {
    const before = w.cars.map((c) => c.s)
    step(w)
    w.cars.forEach((c, j) => {
      const s = c.route.stopS
      if (c.styleName !== 'hasty' && before[j] < s && c.s >= s && w.light[c.route.id] === 'red') redRuns++
    })
  }
  return { w, redRuns }
}

const harm = (cars, style) => cars.filter((c) => c.styleName === style).reduce((n, c) => n + c.crashes + c.hitPeople + c.hitDogs, 0)

test('in daylight nobody is hit, every car keeps lapping, and careful drivers cause no crash', () => {
  for (const seed of [1, 2, 3]) {
    const { w, redRuns } = race('day', seed)
    assert.equal(w.cars.reduce((n, c) => n + c.hitPeople, 0), 0, `seed ${seed}: people hit`)
    assert.equal(harm(w.cars, 'careful'), 0, `seed ${seed}: careful harm`)
    assert.ok(w.cars.every((c) => c.laps >= 5), `seed ${seed}: every car laps`)
    assert.equal(redRuns, 0, `seed ${seed}: careful/normal red-light runs`)
  }
})

test('at night the hasty cars do more harm than the careful ones — the lesson the page teaches', () => {
  let hasty = 0, careful = 0
  for (const seed of [1, 2, 3]) {
    const { w } = race('night', seed)
    hasty += harm(w.cars, 'hasty')
    careful += harm(w.cars, 'careful')
  }
  assert.ok(hasty > careful, `hasty ${hasty} vs careful ${careful}`)
})

test('a car with its camera covered runs red lights — and the others still have to dodge it', () => {
  const w = createWorld({ seed: 3, people: 'many', dogs: 'many' })
  const blind = w.cars[0]
  blind.blind = true
  let redRuns = 0
  for (let i = 0; i < 300 / DT; i++) {
    const before = blind.s
    step(w)
    if (before < blind.route.stopS && blind.s >= blind.route.stopS && w.light.A === 'red') redRuns++
  }
  assert.ok(redRuns > 0)
  assert.equal(blind.tracks.size, 0, 'it believes in nothing')
})
