// The street around the road, and the challenge in front of it.
//
// The load-bearing claim this file defends is a teaching claim: the simulated
// camera only ever names things the site's real detector was actually trained
// to name. If that drifts, the room starts lying to visitors about what a COCO
// model can and cannot see — so it is checked against ml/labels.js rather than
// against a list written here.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createWorld, run } from '../public/js/drive/sim.js'
import { buildStreet, detectable, unnameable, ITEMS, STREET_ID_BASE, STREET } from '../public/js/drive/street.js'
import { buildTrack, LANE, at } from '../public/js/drive/track.js'
import { makeChallenge, check, score, TARGETS, TILES } from '../public/js/drive/captcha.js'
import { COCO } from '../public/js/ml/labels.js'

const layouts = ['two', 'four', 'practice', 'city']

test('every class the street can be named by is a real COCO class the site model knows', () => {
  for (const [kind, item] of Object.entries(ITEMS)) {
    if (!item.detectable) continue
    assert.ok(item.coco, `${kind} is detectable, so it must carry a COCO id`)
    const known = COCO[item.coco]
    assert.ok(known, `${kind} claims COCO id ${item.coco}, which ml/labels.js does not have`)
    // The one liberty the room takes is a question mark on a doubtful call: the
    // class is still "cat", the camera is just admitting it is not sure.
    const shown = item.label[0].replace(/\?$/, '')
    assert.equal(
      shown,
      known[1],
      `${kind}: the Thai name in the room must be the one the site's own model prints`,
    )
    assert.ok(item.dims?.L > 0 && item.dims?.W > 0 && item.dims?.H > 0, `${kind} needs real metres`)
  }
})

test('the things a detector cannot name are named here as unnameable, not quietly given a class', () => {
  for (const kind of ['lamp', 'pole', 'building', 'pedSignal']) {
    assert.equal(ITEMS[kind].coco, null, `${kind} must not claim a COCO class it does not have`)
    assert.equal(ITEMS[kind].detectable, false)
  }
  assert.equal(ITEMS.cat.coco, 17, 'a mis-called dog is a cat — COCO really has that class')
  assert.equal(ITEMS.cat.detectable, false, 'but a cat is never placed in the world')
})

test('a world contains a street, and every piece of it has its own identity', () => {
  for (const layout of layouts) {
    const w = createWorld({ seed: 3, layout, traffic: 6 })
    const ids = w.street.items.map((it) => it.id)
    assert.equal(new Set(ids).size, ids.length, `${layout}: two street objects share one id`)
    for (const it of w.street.items) {
      assert.ok(it.id >= STREET_ID_BASE, `${layout}: street ids must clear the cars and walkers`)
      assert.ok(w.cars.every((c) => c.id !== it.id), `${layout}: street id collides with a car`)
      assert.ok(w.walkers.every((x) => x.id !== it.id), `${layout}: street id collides with a walker`)
    }
  }
})

test('the camera can only ever believe in one object at a time per id — so the tracker must key uniquely', () => {
  // The bug this guards against: every street object built without an id, so the
  // tracker's Map collapsed onto a single undefined key and the camera could
  // believe in exactly one piece of street at a time.
  const w = createWorld({ seed: 5, layout: 'city', traffic: 6 })
  const seen = new Set()
  run(w, 20)
  for (const car of w.cars) for (const id of car.tracks.keys()) seen.add(id)
  assert.ok(seen.size > 5, `expected the cars to believe in many things at once, saw ${seen.size}`)
})

test('nothing stands in another road\'s carriageway — a junction is kept clear', () => {
  for (const layout of layouts) {
    const track = buildTrack(layout)
    const { items } = buildStreet(track, { seed: 9, layout })
    for (const it of items) {
      if (it.kind === 'building') continue
      for (const [id, route] of Object.entries(track)) {
        if (id === it.route || !route.pts) continue
        for (const p of route.pts) {
          assert.ok(
            Math.hypot(p.x - it.x, p.y - it.y) > LANE,
            `${layout}: a ${it.kind} for route ${it.route} sits inside route ${id}'s lane`,
          )
        }
      }
    }
  }
})

test('parked bicycles and motorbikes wait at the kerb, not in the running lane', () => {
  for (const layout of layouts) {
    const track = buildTrack(layout)
    const { items } = buildStreet(track, { seed: 11, layout })
    for (const it of items.filter((x) => x.kind === 'bicycle' || x.kind === 'motorcycle')) {
      const route = track[it.route]
      let near = Infinity
      for (const p of route.pts) near = Math.min(near, Math.hypot(p.x - it.x, p.y - it.y))
      // The driver model treats LANE as the half-width of the running lane; a
      // parked bike has to sit outside it or every car brakes for it forever.
      assert.ok(
        near > LANE,
        `${layout}: a parked ${it.kind} is ${near.toFixed(2)} m from the centreline — inside the lane`,
      )
    }
  }
})

test('the footway is outside the kerb, and the kerb is at the real 3.2 m', () => {
  const track = buildTrack('city')
  const { footways } = buildStreet(track, { seed: 4, layout: 'city' })
  assert.ok(footways.length > 0, 'a city road has footways')
  for (const fw of footways) {
    const route = track[fw.id]
    for (let i = 0; i < fw.kerb.length; i += 20) {
      let near = Infinity
      for (const p of route.pts) near = Math.min(near, Math.hypot(p.x - fw.kerb[i].x, p.y - fw.kerb[i].y))
      assert.ok(Math.abs(near - LANE) < 0.6, `kerb sits ${near.toFixed(2)} m out, not ${LANE}`)
      assert.ok(STREET.kerbHeight > 0 && STREET.kerbHeight < 0.25, 'a kerb is about 15 cm, not a step')
    }
  }
})

test('a car on the road comes to believe in real street classes, and in the right words', () => {
  const w = createWorld({ seed: 21, layout: 'city', traffic: 12 })
  run(w, 30)
  const labelled = new Set()
  for (const car of w.cars) for (const tr of car.tracks.values()) labelled.add(tr.label)
  assert.ok(labelled.size >= 3, `expected several classes across the fleet, saw ${[...labelled]}`)
  for (const label of labelled) {
    if (label === 'cat') continue
    assert.ok(ITEMS[label], `the camera printed "${label}", which ITEMS has no entry for`)
  }
})

test('a street object with no COCO class is never given a detection box', () => {
  const track = buildTrack('practice')
  const street = buildStreet(track, { seed: 2, layout: 'practice' })
  const named = new Set(detectable(street).map((it) => it.kind))
  const unnamed = new Set(unnameable(street).map((it) => it.kind))
  for (const kind of named) assert.ok(ITEMS[kind].detectable, `${kind} must be detectable`)
  for (const kind of unnamed) assert.equal(ITEMS[kind].detectable, false, `${kind} must not be`)
  assert.ok(named.has('bicycle') && named.has('motorcycle'), 'kerbside bikes are nameable')
  assert.ok(unnamed.has('lamp') && unnamed.has('building'), 'lamp posts and buildings are not')
})

// ── The challenge ─────────────────────────────────────────────────────

test('a challenge is fair: between two and six of the nine squares hold the target', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const c = makeChallenge(seed)
    assert.ok(c.answer.length >= 2 && c.answer.length <= 6, `seed ${seed}: ${c.answer.length} squares to find`)
    assert.equal(c.tiles.length, TILES)
    const marked = c.tiles.filter((t) => t.has).map((t) => t.slot).sort((a, b) => a - b)
    assert.deepEqual(marked, c.answer, 'the answer must be exactly the squares drawn with it')
  }
})

test('the same seed always produces the same challenge — reloading is not a new question', () => {
  assert.deepEqual(makeChallenge(42).answer, makeChallenge(42).answer)
  assert.deepEqual(makeChallenge(42).tiles, makeChallenge(42).tiles)
})

test('you pass only by selecting exactly the right squares', () => {
  const c = makeChallenge(7)
  assert.equal(check(c, c.answer), true)
  assert.equal(check(c, [...c.answer, c.answer[0]]), true, 'selecting a square twice is still selecting it once')
  const missing = c.answer.slice(1)
  if (missing.length) assert.equal(check(c, missing), false, 'missing one square is a fail')
  // A square the answer does not contain. Picking a slot next to a correct one
  // can land on another correct one, which is not an over-selection at all.
  const spare = [...Array(TILES).keys()].find((n) => !c.answer.includes(n))
  assert.equal(check(c, [...c.answer, spare]), false, 'one square too many is a fail, not a pass')
})

test('a wrong answer explains itself without scolding anyone', () => {
  const c = makeChallenge(13)
  const s = score(c, [])
  assert.equal(s.right, 0)
  assert.equal(s.missed, c.answer.length)
  const all = score(c, [0, 1, 2, 3, 4, 5, 6, 7, 8])
  assert.equal(all.right, c.answer.length)
  assert.equal(all.missed, 0)
  assert.equal(all.extra, TILES - c.answer.length)
})

test('every challenge asks about a class COCO really has', () => {
  for (const t of TARGETS) {
    assert.ok(COCO[t.coco], `challenge target "${t.key}" is not a COCO class`)
    assert.equal(COCO[t.coco][1], t.label[0], `${t.key}: Thai name must match the model's`)
  }
})