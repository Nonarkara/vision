import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRewardLearner } from '../public/js/research/reward.js'

test('tries both unknown actions before using observed rewards', () => {
  const learner = createRewardLearner()
  assert.equal(learner.choose(), 0)
  learner.observe(0, -1)
  assert.equal(learner.choose(), 1)
  learner.observe(1, 1)
  assert.equal(learner.choose(), 1)
})
test('values are averages of feedback, and change when rewards change', () => {
  const learner = createRewardLearner()
  learner.observe(0, 1)
  learner.observe(0, -1)
  learner.observe(1, -0.5)
  assert.equal(learner.snapshot()[0].value, 0)
  assert.equal(learner.choose(), 0)
  learner.observe(0, -1)
  learner.observe(0, -1)
  learner.observe(0, -1)
  assert.equal(learner.choose(), 1)
})
