// The /drive room: the track, the simulated camera, the decision rule, and
// the claims the page makes about how the three habits behave.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildTrack, at, alongMyLane } from '../public/js/drive/track.js'
import { detectChance, perceive } from '../public/js/drive/perceive.js'
import { idm } from '../public/js/drive/decide.js'
import { createWorld, step, run, DT, STYLES, VEHICLES, circles } from '../public/js/drive/sim.js'

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

test('road choices have actual distinct lanes, opposing directions and bounded traffic', () => {
  for (const [layout,lanes] of [['two',2],['four',4],['city',4]]) {
    const w=run(createWorld({seed:9,layout,traffic:24}),20)
    assert.equal(Object.keys(w.track).length,lanes)
    assert.equal(w.cars.length,24)
    assert.ok(w.cars.every((c)=>Number.isFinite(c.x+c.y+c.v+c.s)))
    const repeat=run(createWorld({seed:9,layout,traffic:24}),20)
    assert.deepEqual(w.cars.map((c)=>c.s),repeat.cars.map((c)=>c.s))
    if(layout!=='city') {
      assert.equal(w.zebras.length,0)
      const routes=Object.values(w.track)
      assert.ok(routes.every((r)=>r.stopS===null))
      // Opposite winding is a physical opposing lane, not a decorative stripe.
      const area=(r)=>r.pts.reduce((n,p,i)=>{const q=r.pts[(i+1)%r.pts.length];return n+p.x*q.y-q.x*p.y},0)
      assert.ok(area(routes[0])*area(routes.at(-1))<0)
    }
  }
  assert.equal(createWorld({traffic:1000}).cars.length,32)
})

test('vehicles have their real Thai sizes — the sizes every view shares', () => {
  // The registry the track, the top view, the windshield view and the
  // collision maths all read from. Thai traffic, measured in metres.
  assert.deepEqual(VEHICLES.car, { L: 4.4, W: 1.8, H: 1.5 })      // Honda City / Vios class
  assert.deepEqual(VEHICLES.pickup, { L: 5.3, W: 1.9, H: 1.9 })  // D-Max / Revo class
  assert.deepEqual(VEHICLES.truck, { L: 9.6, W: 2.5, H: 3.2 })   // 6-wheel cargo lorry
  assert.deepEqual(VEHICLES.bus, { L: 11.95, W: 2.5, H: 3.3 })   // Bangkok city bus
  // Nothing wider than the legal 2.5 m, nothing taller than a real roof.
  for (const [name, v] of Object.entries(VEHICLES)) {
    assert.ok(v.W <= 2.5, `${name} fits a Thai lane legally`)
    assert.ok(v.L > v.W && v.H > 0.5, `${name} has a body`)
  }
})

test('traffic mixes sedans, pickups, lorries and buses — and lorries drive like lorries', () => {
  const bodies = (w) => new Set(w.cars.map((c) => c.body))
  const w6 = createWorld({ seed: 4 })
  assert.ok(bodies(w6).has('car') && bodies(w6).has('pickup') && bodies(w6).has('truck'), 'even a 6-vehicle street shows the mix')
  const w24 = createWorld({ seed: 4, layout: 'city', traffic: 24 })
  assert.ok(bodies(w24).has('bus'), 'a crowded city run has buses')
  assert.ok(w24.cars.every((c) => c.dims === VEHICLES[c.body]), 'every vehicle carries its true dims')
  const lorry = w24.cars.find((c) => c.body === 'truck')
  assert.ok(lorry.style.v0 <= 11.1 && lorry.style.s0 > STYLES[lorry.styleName].s0, 'lorries cruise slower and keep more space')
})

test('collision footprints follow real lengths: a lorry outweighs two sedans of road', () => {
  const shape = (body) => circles({ x: 0, y: 0, h: 0, dims: VEHICLES[body] })
  const reach = (c) => Math.max(...c.map((p) => Math.abs(p[0]))) + c[0][2]
  assert.ok(reach(shape('truck')) > 2 * reach(shape('car')), 'a 9.6 m lorry occupies more than two 4.4 m sedans')
  assert.ok(shape('bus').length > shape('car').length, 'long vehicles get more collision circles')
})

test('a lorry fills more of the frame — and the detector calls it a lorry', () => {
  const viewer = { style: STYLES.normal, blind: false }
  assert.ok(detectChance(viewer, 'car', 20, 'day', 'truck') > detectChance(viewer, 'car', 20, 'day', 'car'))
  assert.ok(detectChance(viewer, 'car', 20, 'day', 'bus') > detectChance(viewer, 'car', 20, 'day', 'car'))
  const w = createWorld({ seed: 1, layout: 'two', traffic: 24, people: 'none', dogs: 'none' })
  const eye = w.cars[0]
  const lorry = w.cars.find((c) => c.body === 'truck')
  lorry.route = eye.route
  lorry.s = eye.s + 15
  const p = at(eye.route, lorry.s)
  lorry.x = p.x; lorry.y = p.y; lorry.h = p.h
  perceive(eye, w, () => 0)
  assert.equal(eye.tracks.get(lorry.id)?.label, 'truck', 'COCO really has a truck class')
})

test('cars sharing city roads never spawn inside each other', () => {
  for (const layout of ['two', 'four', 'practice', 'city']) {
    const w = createWorld({ layout, traffic: 24 })
    for (let i = 0; i < w.cars.length; i++)
      for (let j = i + 1; j < w.cars.length; j++) {
        const a = circles(w.cars[i]), b = circles(w.cars[j])
        assert.ok(
          a.every((p) => b.every((q) => Math.hypot(p[0] - q[0], p[1] - q[1]) >= p[2] + q[2] - 0.01)),
          `${layout}: vehicles ${i + 1}/${j + 1} overlap at start`,
        )
      }
  }
})
