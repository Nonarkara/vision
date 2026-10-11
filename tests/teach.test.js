// The tiny learner behind "Teach the machine my labels".
//
// The claim this file defends is the same one the Drive page makes out loud:
// nine labels teach very little, and the page shows exactly how little. These
// tests pin the two things that make that demonstration honest at all:
//   1. the features are on a scale gradient descent can actually learn from —
//      brightness centred on mid-grey, colour filters scaled up from a
//      fraction-of-a-percent to the same order as the brightness cells;
//   2. training is deterministic, so the same nine labels always teach the
//      same machine — the only honesty a toy this size can offer.
// The second point is also the regression the live fix addressed: with raw
// 0.002-sized filter readings, no reasonable number of gradient steps could
// lift those weights, and the "machine you taught" would have been a coin.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { features, train, predict, pick, VIEW } from '../public/js/drive/teach.js'

/** A w×h RGBA image where every pixel is one flat colour. */
function flat(r, g, b, w = 8, h = 8) {
  const data = new Uint8ClampedArray(w * h * 4)
  for (let i = 0; i < data.length; i += 4) { data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255 }
  return { data, w, h }
}

test('a tile becomes 64 brightness cells centred on mid-grey, plus 3 colour readings', () => {
  const out = features(flat(127, 127, 127).data, 8, 8)
  assert.equal(out.length, VIEW * VIEW + 3, '64 cells and exactly three filters')
  for (let i = 0; i < VIEW * VIEW; i++) {
    assert.ok(Math.abs(out[i]) < 0.01, `mid-grey must sit at 0, not at ${out[i]} — or darker and brighter are not equal moves`)
  }
  assert.equal(out[64], 0, 'mid-grey is nobody’s lamp')
  assert.equal(out[65], 0)
  assert.equal(out[66], 0)
})

test('brightness cells run from −0.5 (black) to +0.5 (white), mapped by position', () => {
  const { data, w, h } = flat(255, 255, 255)
  // Overwrite the left half of each row with black.
  for (let y = 0; y < h; y++) for (let x = 0; x < w / 2; x++) { const i = (y * w + x) * 4; data[i] = data[i + 1] = data[i + 2] = 0 }
  const out = features(data, w, h)
  for (let y = 0; y < VIEW; y++) {
    for (let x = 0; x < VIEW; x++) {
      const want = x < VIEW / 2 ? -0.5 : 0.5
      assert.ok(Math.abs(out[y * VIEW + x] - want) < 1e-9, `cell ${y},${x} should be ${want}, got ${out[y * VIEW + x]}`)
    }
  }
})

test('a lamp-coloured reading is scaled to the same order as the brightness cells', () => {
  // The whole tile is the gate's red. Unscaled this reading would be 1.0;
  // scaled it lands where a gradient step can actually reach it.
  const out = features(flat(232, 65, 43).data, 8, 8)
  assert.ok(out[64] > 1, `the scaled red reading must clear 1 (got ${out[64]}); a raw 0.002-ish fraction can never teach its weight`)
  assert.equal(out[65], 0, 'pure red is not amber')
  assert.equal(out[66], 0, 'pure red is not green')
  // And the three stay distinguishable.
  const amber = features(flat(244, 196, 48).data, 8, 8)
  assert.ok(amber[65] > 1 && amber[64] === 0, 'amber lights its own filter, not the red one')
})

test('training lifts the weight of the feature that separates the labels', () => {
  // A miniature of the gate's real situation: tiles are mostly grey
  // (brightness near 0 either way), and only the lamp colour tells
  // positive from negative. Before the scale fix this learner could not
  // learn this at all.
  const grey = () => Array.from({ length: VIEW * VIEW }, () => 0)
  const pos = [...grey(), 0.5, 0, 0]   // a red lamp in an ordinary street
  const neg = [...grey(), 0, 0, 0]
  const model = train([pos, neg, pos, neg, pos, neg].map((x, i) => ({ x, y: i % 2 === 0 })))
  assert.ok(model.w[VIEW * VIEW] > 0.2, `the lamp feature must carry real weight (got ${model.w[VIEW * VIEW]})`)
  // Nine labels teach very little — the page says so. This does not demand a
  // confident machine, only one that leans the right way from six examples.
  assert.ok(predict(model, pos) > 0.8, `a lamp tile should read as positive, got ${predict(model, pos)}`)
  assert.ok(predict(model, neg) < 0.2, `a lampless tile should read as negative, got ${predict(model, neg)}`)
})

test('the same labels always teach the same machine', () => {
  const samples = [
    { x: Array.from({ length: VIEW * VIEW + 3 }, (_, i) => (i === 5 ? 0.4 : 0)), y: true },
    { x: Array.from({ length: VIEW * VIEW + 3 }, () => -0.2), y: false },
  ]
  const a = train(samples)
  const b = train(samples)
  assert.deepEqual([...a.w], [...b.w], 'fixed order and fixed schedule must give identical weights')
  assert.equal(a.b, b.b)
})

test('predict never overflows, whichever side of the wall it is on', () => {
  const big = { w: new Float64Array([1000]), b: -500 }
  assert.ok(predict(big, [1]) > 1 - 1e-9, 'a huge score saturates near certainty, not NaN')
  assert.ok(predict(big, [0]) < 1e-9, 'a hugely negative score saturates near 0, not NaN')
})

test('pick answers only with tiles at or above half, and says how sure it is', () => {
  const model = train([
    { x: Array.from({ length: VIEW * VIEW + 3 }, (_, i) => (i === 0 ? 0.5 : 0)), y: true },
    { x: Array.from({ length: VIEW * VIEW + 3 }, () => -0.5), y: false },
  ])
  const tiles = [
    Array.from({ length: VIEW * VIEW + 3 }, (_, i) => (i === 0 ? 0.5 : 0)),
    Array.from({ length: VIEW * VIEW + 3 }, () => -0.5),
  ]
  const picks = pick(model, tiles)
  assert.equal(picks.length, 1, 'only the positive tile is picked')
  assert.equal(picks[0].i, 0)
  assert.ok(picks[0].p >= 0.5 && picks[0].p <= 1)
})

test('an empty lesson teaches nothing, and says so at half', () => {
  const model = train([])
  assert.equal(predict(model, Array(67).fill(0)), 0.5, 'no labels, no lean either way')
})
