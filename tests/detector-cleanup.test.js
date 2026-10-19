import { test } from 'node:test'
import assert from 'node:assert/strict'
import { detect, loadDetector } from '../public/js/ml/detector.js'

const live = new Set()
let fail = ''
function tensor(kind, shape, values) {
  const t = { kind, shape, dispose() { live.delete(t) }, async data() {
    if (fail === kind) throw new Error(`failed ${kind}`)
    return values
  } }
  live.add(t)
  return t
}
const model = { async executeAsync(input) {
  if (fail === 'warm' || (fail === 'execute' && input.kind !== 'zero')) throw new Error(`failed ${fail}`)
  return [tensor('scores', [1, 1, 3], new Float32Array([0, 0, .9])), tensor('boxes', [1, 1, 4], new Float32Array([.1, .2, .6, .8]))]
} }
globalThis.window = { tf: {
  enableProdMode() {}, async setBackend() { return true }, async ready() {},
  async loadGraphModel() { return model },
  zeros: () => tensor('zero'), tidy: f => f(), browser: { fromPixels: x => x },
  expandDims: () => tensor('input'), tensor2d: () => tensor('nmsBoxes'),
  tensor1d() { if (fail === 'allocate') throw new Error('failed allocate'); return tensor('nmsScores') },
  dispose(xs) { for (const x of [xs].flat(Infinity)) x?.dispose() },
  image: { async nonMaxSuppressionAsync() {
    if (fail === 'nms') throw new Error('failed nms')
    return tensor('keep', [1], new Int32Array([0]))
  } },
} }
globalThis.document = { dispatchEvent() {} }
globalThis.CustomEvent = class {}

test('detector releases every temporary tensor on failure and can retry', async () => {
  fail = 'warm'
  await assert.rejects(loadDetector(), /failed warm/)
  assert.equal(live.size, 0, 'failed warm-up releases its input')
  fail = ''
  await loadDetector()
  assert.equal(live.size, 0)
  for (const phase of ['execute', 'scores', 'boxes', 'allocate', 'nms', 'keep']) {
    fail = phase
    await assert.rejects(detect({}), new RegExp(`failed ${phase}`))
    assert.equal(live.size, 0, `${phase} leaked a tensor`)
    fail = ''
    const result = await detect({})
    assert.equal(result.detections.length, 1, 'retry returns a detection')
    assert.equal(result.detections[0].cls, 3)
    assert.equal(live.size, 0, 'successful retry releases its tensors too')
  }
})
