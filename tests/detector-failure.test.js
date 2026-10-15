// When the detector cannot load, the page has to say why in words a person can
// act on, and point at the lenses that still work. These tests pin each
// classification so the explanation cannot quietly collapse into a dead end.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { detectorFailure, detectorFailureSentence } from '../public/js/ml/failure.js'

const en = (th, english) => english
const th = (thai, en) => thai

test('a blocked model library is named as a script or network problem', () => {
  const msg = detectorFailure(new Error('could not load /vendor/tf.min.js'), en)
  assert.match(msg, /could not fetch the model library/i)
  assert.match(msg, /network or script policy/i)
})
test('dropped weights are named as a download problem', () => {
  const msg = detectorFailure(new Error('could not load /models/ssdlite_mobilenet_v2/model.json'), en)
  assert.match(msg, /18 MB/i)
  assert.match(msg, /did not finish downloading/i)
})
test('a dead graphics engine is named as such', () => {
  const msg = detectorFailure(new Error('Failed to initialize WebGL backend'), en)
  assert.match(msg, /could not start its graphics engine/i)
})
test('out of memory is named as such', () => {
  const msg = detectorFailure(new Error('RangeError: Array buffer allocation failed — memory'), en)
  assert.match(msg, /ran out of memory/i)
})
test('an unknown failure still explains and still offers a way forward', () => {
  const msg = detectorFailure(new Error('kaboom 12345'), en)
  assert.match(msg, /something went wrong/i)
  assert.match(msg, /other lenses still work/i)
})
test('every message points at the lenses that still work, in both languages', () => {
  for (const translator of [en, th]) {
    const msg = detectorFailure(new Error('network'), translator)
    assert.match(msg, translator === en ? /buttons 1–4|refresh and try again/i : /ปุ่ม 1–4|รีเฟรช/)
  }
})
test('the Thai message is Thai when the page is Thai', () => {
  const msg = detectorFailure(new Error('could not load /vendor/tf.min.js'), th)
  assert.match(msg, /เบราว์เซอร์/)
  assert.doesNotMatch(msg, /the browser/i)
})
test('the sentence wrapper capitalises the clause so it reads as a sentence', () => {
  const msg = detectorFailureSentence(new Error('could not load /vendor/tf.min.js'), en)
  assert.match(msg, /^The browser could not fetch/)
})