import test from 'node:test'
import assert from 'node:assert/strict'
import {
  classify,
  cluster,
  groupOf,
  policy,
} from '../public/js/train/video-learning.js'
import { relative, project } from '../public/js/drive/perspective.js'
import { createWorld, run } from '../public/js/drive/sim.js'

test('labelled frames decide unseen frames, while clustering uses no labels', () => {
  const a = [0, 0],
    b = [1, 1],
    samples = [
      { x: a, y: 0 },
      { x: [0.02, 0], y: 0 },
      { x: b, y: 1 },
      { x: [0.98, 1], y: 1 },
    ]
  assert.equal(classify(samples, [0.95, 0.95]).y, 1)
  const groups = cluster(samples.map((s) => s.x))
  assert.equal(groupOf(groups.centres, a), groupOf(groups.centres, [0.02, 0]))
  assert.notEqual(groupOf(groups.centres, a), groupOf(groups.centres, b))
  assert.equal(
    cluster([a, a, a]),
    null,
    'identical frames cannot form two meaningful groups',
  )
})
test('rewarded policy changes by context, explores and responds to correction', () => {
  const feedback = [
    { x: [0, 0], action: 0, reward: 1 },
    { x: [0, 0], action: 1, reward: -1 },
    { x: [1, 1], action: 0, reward: -1 },
    { x: [1, 1], action: 1, reward: 1 },
  ]
  assert.equal(policy(feedback, [0, 0], 2).action, 0)
  assert.equal(policy(feedback, [1, 1], 2).action, 1)
  assert.equal(policy(feedback, [0, 0], 4).exploring, true)
  assert.equal(policy([], [0, 0]).action, 0)
  assert.equal(policy([feedback[0]], [0, 0]).action, 1, 'try untested action')
})
test('windshield projects the actual heading; boxes cannot appear behind the car', () => {
  const car = { x: 10, y: 20, h: Math.PI / 2 }
  const front = { x: 10, y: 30 },
    side = { x: 5, y: 30 }
  assert.ok(Math.abs(relative(car, front).side) < 1e-6)
  assert.ok(Math.abs(project(car, front, 800, 450).x - 400) < 1e-6)
  assert.ok(project(car, side, 800, 450).x > 400)
  assert.equal(project(car, { x: 10, y: 10 }, 800, 450), null)
})
test('sun glare reduces sight; decisions expose the actual limiting tracked object', () => {
  const w = run(
    createWorld({
      weather: 'sun',
      people: 'many',
      dogs: 'many',
      layout: 'city',
      traffic: 24,
    }),
    15,
  )
  assert.ok(w.cars.every((c) => Number.isFinite(c.v)))
  for (const c of w.cars)
    if (c.decision.targetId != null)
      assert.ok(c.tracks.has(c.decision.targetId))
})
