import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createHash } from 'node:crypto'
import { referenceFrames } from '../public/js/evaluation/reference.js'
import { evaluate } from '../public/js/evaluation/metrics.js'
import { assessPixels } from '../public/js/cv/quality.js'
const box = { cls: 3, x: 0.1, y: 0.2, w: 0.3, h: 0.2 }
const frames = [{ id: 'a', boxes: [box] }, { id: 'empty', boxes: [] }]
test('reference split is reproducible and separates complete view groups', () => {
  const a = referenceFrames(); assert.deepEqual(a, referenceFrames()); assert.equal(a.length, 200)
  const train = new Set(a.filter(f => f.split === 'development').map(f => f.group))
  const holdout = a.filter(f => f.split === 'evaluation')
  assert.equal(holdout.length, 100); assert.ok(holdout.every(f => !train.has(f.group)))
  assert.equal(new Set(a.filter(f => f.boxes.length).map(f => f.group)).size, 12)
})
test('one ground truth cannot match duplicate predictions; empty-frame errors count', () => {
  const r = evaluate(frames, [{ id: 'a', ms: 10, detections: [{ ...box, score: 0.8 }, { ...box, score: 0.7 }] }, { id: 'empty', ms: 20, detections: [{ ...box, score: 0.9 }] }])
  assert.equal(r.tp, 1); assert.equal(r.fp, 2); assert.equal(r.fn, 0); assert.equal(r.precision, 1 / 3); assert.equal(r.p95Ms, 20)
})
test('wrong classes miss the target and partial or empty runs never imply success', () => {
  const r = evaluate(frames, [{ id: 'a', ms: 10, detections: [{ ...box, cls: 4, score: 0.9 }] }])
  assert.equal(r.tp, 0); assert.equal(r.fn, 1); assert.equal(r.fp, 1); assert.equal(r.complete, false)
  const empty = evaluate(frames, []); assert.equal(empty.precision, null); assert.equal(empty.recall, null); assert.equal(empty.p95Ms, null)
})
test('invalid, unknown and duplicate predictions are rejected', () => {
  assert.throws(() => evaluate(frames, [{ id: 'wrong', ms: 1, detections: [] }]))
  const r = { id: 'a', ms: 1, detections: [] }; assert.throws(() => evaluate(frames, [r, r]))
  assert.throws(() => evaluate(frames, [{ ...r, detections: [{ ...box, score: NaN }] }]))
})
test('quality clues distinguish darkness and little detail without claiming safety', () => {
  const image = value => ({ width: 4, height: 4, data: new Uint8ClampedArray(64).fill(value) })
  assert.equal(assessPixels(null).state, 'unknown')
  assert.equal(assessPixels(image(5)).state, 'dark')
  assert.equal(assessPixels(image(150)).state, 'low-detail')
})

test('saved manifest and actual model baseline remain reproducible', () => {
  const manifest = JSON.parse(fs.readFileSync(new URL('../docs/evaluation/reference-v1.json', import.meta.url)))
  assert.deepEqual(manifest.frames, referenceFrames())
  const report = JSON.parse(fs.readFileSync(new URL('../docs/evaluation/ssdlite-synthetic-baseline.json', import.meta.url)))
  assert.equal(report.pack, manifest.id)
  assert.deepEqual(evaluate(referenceFrames().filter(f => f.split === 'evaluation'), report.records), report.metrics)
  for (const artifact of report.modelArtifacts) {
    const bytes = fs.readFileSync(new URL('../public/' + artifact.path, import.meta.url))
    assert.equal(createHash('sha256').update(bytes).digest('hex'), artifact.sha256, artifact.path)
  }
})
