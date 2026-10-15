import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRewardLearner, describeReward } from '../public/js/research/reward.js'

function asLang(lang) { globalThis.document = { documentElement: { dataset: { lang } } } }

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
test('one try on a path reads "1 time", never "1 times"', () => {
  asLang('en')
  const learner = createRewardLearner()
  learner.observe(0, 1)
  const { readout } = describeReward(learner.snapshot(), 0)
  assert.match(readout, /Last try: left \+1 · Left tried 1 time, right 0 times\./)
  assert.doesNotMatch(readout, /1 times/)
})
test('the thai readout never pluralises, and unknown paths say so', () => {
  asLang('th')
  const learner = createRewardLearner()
  learner.observe(1, -1)
  const { values, readout } = describeReward(learner.snapshot(), 1)
  assert.match(values, /ซ้าย ยังไม่รู้/)
  assert.match(readout, /ลองซ้าย 0 ครั้ง ขวา 1 ครั้ง/)
})
test('before anything is tried, the readout invites both paths', () => {
  asLang('en')
  const { readout } = describeReward(createRewardLearner().snapshot(), null)
  assert.match(readout, /No paths tried yet/)
})

test('the next-choice explanation distinguishes exploration, learned preference and ties', () => {
  asLang('en')
  const learner = createRewardLearner()
  assert.match(describeReward(learner.snapshot(), null).next, /left: it has not tried/)
  learner.observe(0, 1)
  assert.match(describeReward(learner.snapshot(), 0).next, /right: it has not tried/)
  learner.observe(1, -1)
  assert.match(describeReward(learner.snapshot(), 1).next, /left: it has the better average/)
  learner.observe(0, -3)
  assert.match(describeReward(learner.snapshot(), 0).next, /scores are tied/)
})
