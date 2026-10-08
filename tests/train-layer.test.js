import { test } from 'node:test'
import assert from 'node:assert/strict'
import { trainLayer } from '../public/js/train/layer.js'

let next = 0
const frames = new Map()
globalThis.requestAnimationFrame = (fn) => { frames.set(++next, fn); return next }
globalThis.cancelAnimationFrame = (id) => frames.delete(id)
function tick() {
  const [id, fn] = frames.entries().next().value
  frames.delete(id)
  fn()
}

test('stopping training settles its completion and cancels scheduled work', async () => {
  const job = trainLayer([], 2)
  job.stop()
  assert.equal(await job.done, null)
  assert.equal(frames.size, 0)
})

test('training completes at the requested epoch and reports progress', async () => {
  const progress = []
  const job = trainLayer([{ x: new Float32Array(1280), y: 0 }], 2, { epochs: 3, onProgress: (p) => progress.push(p.epoch) })
  while (frames.size) tick()
  const result = await job.done
  assert.equal(result.layer.epochs, 3)
  assert.equal(progress.at(-1), 3)
  assert.ok(progress.every((epoch, i) => epoch > (progress[i - 1] ?? 0) && epoch - (progress[i - 1] ?? 0) <= 2), 'progress advances in bounded passes even on a busy CPU')
  assert.equal(frames.size, 0)
})

test('stopping from a progress callback does not schedule another frame', async () => {
  const job = trainLayer([], 2, { onProgress: () => job.stop() })
  tick()
  assert.equal(await job.done, null)
  assert.equal(frames.size, 0)
})
