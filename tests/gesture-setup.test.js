import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setupState } from '../public/js/gesture/setup.js'
const poses = (...counts) => counts.map(n => ({ samples: Array(n).fill({}) }))

test('teaching waits for a picture, even when every pose has examples', () => {
  assert.deepEqual(setupState(poses(3, 4), false), { missing: 0, taught: true, stage: 'picture' })
})
test('a well-taught pose cannot hide another pose that still needs pictures', () => {
  assert.deepEqual(setupState(poses(10, 1, 0), true), { missing: 5, taught: false, stage: 'examples' })
})
test('three examples for each of at least two poses makes the room ready', () => {
  assert.deepEqual(setupState(poses(3, 3), true), { missing: 0, taught: true, stage: 'ready' })
  assert.equal(setupState(poses(8), true).stage, 'examples')
  assert.equal(setupState([], true).taught, false)
})
test('clearing examples returns a ready room to teaching', () => {
  assert.equal(setupState(poses(3, 3, 3), true).stage, 'ready')
  assert.equal(setupState(poses(3, 0, 3), true).stage, 'examples')
})
