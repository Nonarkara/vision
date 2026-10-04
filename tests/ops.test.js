import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as ops from '../public/js/cv/ops.js'

function img(width, height, fill) {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    const [r, g, b] = fill(i % width, (i / width) | 0)
    data.set([r, g, b, 255], i * 4)
  }
  return { data, width, height }
}

test('luma weights sum to 1 so white stays 255', () => {
  assert.ok(Math.abs(ops.luma(255, 255, 255) - 255) < 1e-9)
})

test('otsu splits a two-tone picture between the tones', () => {
  const gray = new Float32Array(100).map((_, i) => (i < 50 ? 40 : 200))
  const t = ops.otsu(gray)
  assert.ok(t >= 40 && t < 200, `threshold ${t}`)
  assert.deepEqual([...new Set(ops.threshold(gray, t + 1))].sort(), [0, 1])
})

test('identity kernel leaves the picture unchanged; sobel finds a vertical edge', () => {
  const w = 6, h = 4
  const gray = new Float32Array(w * h).map((_, i) => (i % w < 3 ? 0 : 255))
  assert.deepEqual([...ops.convolve3(gray, w, h, ops.KERNELS.identity)], [...gray])
  const { mag } = ops.sobel(gray, w, h)
  assert.ok(mag[1 * w + 2] > 0 && mag[1 * w + 0] === 0)
})

test('pixelate averages blocks', () => {
  const p = ops.pixelate(img(2, 2, (x) => (x ? [200, 200, 200] : [0, 0, 0])), 2)
  assert.equal(p.data[0], 100)
  assert.equal(p.data[4], 100)
})

test('diffMask + dilate + blobs find one moving square', () => {
  const w = 20, h = 20
  const a = new Float32Array(w * h)
  const b = a.map((_, i) => ((i % w) >= 5 && (i % w) < 10 && ((i / w) | 0) >= 5 && ((i / w) | 0) < 10 ? 255 : 0))
  const mask = ops.dilate(ops.diffMask(a, b, 20), w, h)
  const found = ops.blobs(mask, w, h, 4)
  assert.equal(found.length, 1)
  assert.deepEqual([found[0].x, found[0].y, found[0].w, found[0].h], [4, 4, 7, 7])
})

test('readFrame calls a black frame dark and flat', () => {
  const r = ops.readFrame(img(4, 4, () => [5, 5, 5]))
  assert.equal(r.dark, true)
  assert.equal(r.flat, true)
})
