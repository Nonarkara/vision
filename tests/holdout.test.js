import test from 'node:test'
import assert from 'node:assert/strict'
import { frameKey, testEligibility, testSummary } from '../public/js/train/holdout.js'
test('pixel identity survives a new image object and changes when its pixels change', () => {
  const a = { width: 1, height: 1, data: new Uint8ClampedArray([10, 20, 30, 255]) }
  assert.equal(frameKey(a), frameKey({ ...a, data: a.data.slice() }))
  assert.notEqual(frameKey(a), frameKey({ ...a, data: new Uint8ClampedArray([11, 20, 30, 255]) }))
})
test('training and previously tested pictures cannot masquerade as fresh tests', () => {
  assert.equal(testEligibility('one', [{ key: 'one' }], []), 'training')
  assert.equal(testEligibility('two', [], [{ key: 'two' }]), 'tested')
  assert.equal(testEligibility('three', [{ key: 'one' }], [{ key: 'two' }]), 'new')
})
test('unsure judgments do not become wrong answers or artificial accuracy', () => {
  assert.equal(testSummary([]).accuracy, null)
  assert.equal(testSummary([{ truth: null, guess: 0 }]).accuracy, null)
  assert.deepEqual(testSummary([{ truth: 0, guess: 0 }, { truth: 1, guess: 0 }, { truth: null, guess: 1 }]), { assessed: 2, correct: 1, unsure: 1, accuracy: 0.5 })
})
