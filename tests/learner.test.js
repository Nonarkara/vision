import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalize, dot, knnPredict, createLayer, pca2, leaveOneOut } from '../public/js/ml/learner.js'

// Two well-separated clusters in 8 dimensions.
function data(n = 10) {
  const out = []
  for (let i = 0; i < n; i++) {
    const jitter = (k) => Math.sin(i * 7.1 + k) * 0.1
    out.push({ x: normalize(Float32Array.from({ length: 8 }, (_, k) => (k < 4 ? 1 : 0) + jitter(k))), y: 0 })
    out.push({ x: normalize(Float32Array.from({ length: 8 }, (_, k) => (k >= 4 ? 1 : 0) + jitter(k))), y: 1 })
  }
  return out
}

test('normalize gives unit length and survives zero vectors', () => {
  const v = normalize(Float32Array.from([3, 4]))
  assert.ok(Math.abs(dot(v, v) - 1) < 1e-6)
  assert.deepEqual([...normalize(new Float32Array(3))], [0, 0, 0])
})

test('kNN labels a new point by its neighbours, with probabilities summing to 1', () => {
  const s = data()
  const { probs } = knnPredict(s, normalize(Float32Array.from([1, 1, 1, 1, 0, 0, 0, 0])), 2)
  assert.ok(probs[0] > 0.9)
  assert.ok(Math.abs(probs[0] + probs[1] - 1) < 1e-9)
  assert.deepEqual(knnPredict([], new Float32Array(8), 2).probs, [0.5, 0.5])
})

test('the trained layer lowers its loss and separates the clusters', () => {
  const s = data()
  const layer = createLayer(8, 2, { lr: 0.05 })
  const first = layer.step(s)
  let last = first
  for (let i = 0; i < 100; i++) last = layer.step(s)
  assert.ok(last.loss < first.loss / 2, `loss ${first.loss} → ${last.loss}`)
  assert.equal(last.acc, 1)
  assert.equal(layer.epochs, 101)
})

test('leave-one-out is perfect on separable data; pca2 needs three points', () => {
  assert.equal(leaveOneOut(data(), 2, 3), 1)
  assert.equal(pca2([new Float32Array(2), new Float32Array(2)]), null)
  const p = pca2(data(3).map((d) => d.x))
  assert.equal(p.points.length, 6)
  // The first axis should split the two clusters.
  const a = p.points.filter((_, i) => i % 2 === 0).map((q) => q[0])
  const b = p.points.filter((_, i) => i % 2 === 1).map((q) => q[0])
  assert.ok(Math.max(...a) < Math.min(...b) || Math.min(...a) > Math.max(...b))
})
