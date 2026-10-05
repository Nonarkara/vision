// Lesson 5 — how a detector turns thousands of guesses into a few boxes.
//
//   node examples/05-detection-nms.mjs
//
// SSDLite (the detector on the site) does not output "a car here". It outputs
// 1,917 candidate boxes (anchors on 6 feature grids), each with a score for
// every one of 90 classes. Then
// three plain steps — the same ones in public/js/ml/detector.js:
//   1. for each box keep its best class and that class's score
//   2. drop boxes below a minimum score
//   3. non-maximum suppression (NMS): walk from the most confident box down;
//      drop any box that overlaps an already-kept box by more than an IoU limit
//
// The candidate boxes below are SIMULATED around the scene's answer key, so
// the arithmetic can be shown exactly. The steps are the real ones.

import { scene, carsAt } from './shared/scene.mjs'
import { rule } from './shared/ascii.mjs'
import { writePng } from './shared/png.mjs'
import { row, strokeRect, dim, GRAY } from './shared/draw.mjs'
import { figDir } from './shared/out.mjs'

/** Intersection over union: overlap area ÷ combined area. 1 = identical, 0 = disjoint. */
export function iou(a, b) {
  const x0 = Math.max(a.x, b.x), y0 = Math.max(a.y, b.y)
  const x1 = Math.min(a.x + a.w, b.x + b.w), y1 = Math.min(a.y + a.h, b.y + b.h)
  const inter = Math.max(0, x1 - x0) * Math.max(0, y1 - y0)
  return inter / (a.w * a.h + b.w * b.h - inter)
}

/** Greedy NMS — the algorithm behind tf.image.nonMaxSuppression. */
export function nms(boxes, { iouLimit = 0.5, minScore = 0.3, max = 50 } = {}) {
  const sorted = boxes.filter((b) => b.score >= minScore).sort((a, b) => b.score - a.score)
  const kept = []
  for (const b of sorted) {
    if (kept.length >= max) break
    if (kept.every((k) => iou(k, b) <= iouLimit)) kept.push(b)
  }
  return kept
}

// Step 1, shown on one candidate: 90 class scores → one label.
console.log(rule('Step 1 · one candidate box, its class scores (illustrative), its best class'))
const scores = { car: 0.71, truck: 0.22, bus: 0.06, motorcycle: 0.03, person: 0.02 }
for (const [k, v] of Object.entries(scores)) console.log(`  ${k.padEnd(10)} ${'█'.repeat(Math.round(v * 40)).padEnd(30)} ${v.toFixed(2)}`)
console.log('  …and 85 more classes, mostly near 0.')
console.log('  Each class gets its own score from 0 to 1 (a sigmoid in the SSDLite graph), so the')
console.log('  90 scores need not add up to 1 — "car" and "truck" can both be fairly high.')
console.log('  → this box is reported as "car 71%". The 22% truck opinion is thrown away.')

// Simulated candidates: a cluster of jittered boxes around every true object,
// plus two classic false alarms (a lamp post, a puddle).
let s = 11
const rand = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
const candidates = []
for (const obj of carsAt(0)) {
  for (let i = 0; i < 6; i++) {
    const j = () => Math.round((rand() - 0.5) * obj.w * 0.3)
    candidates.push({ label: obj.label, x: obj.x + j(), y: obj.y + j(), w: obj.w + j(), h: obj.h + j(), score: +(0.9 - i * 0.12 - rand() * 0.05).toFixed(2) })
  }
}
candidates.push({ label: 'person', x: 55, y: 34, w: 10, h: 110, score: 0.34 })
candidates.push({ label: 'boat', x: 214, y: 146, w: 70, h: 22, score: 0.22 })

console.log(rule(`Steps 2–3 · ${candidates.length} candidates → minimum score → NMS`))
const truth = carsAt(0)
for (const minScore of [0.2, 0.3, 0.5]) {
  const kept = nms(candidates, { minScore })
  console.log(`\nminScore ${minScore}, IoU limit 0.5 → ${kept.length} box(es):`)
  // Benchmark matching: most confident box first; each real object may be claimed ONCE.
  const claimed = new Set()
  let right = 0
  for (const k of kept) {
    const options = truth.map((t, i) => ({ t, i, o: iou(t, k) })).sort((a, b) => b.o - a.o)
    const free = options.find((c) => c.o >= 0.5 && !claimed.has(c.i))
    let verdict
    if (free) { claimed.add(free.i); right++; verdict = `correct — the ${free.t.label} at x=${free.t.x} (IoU ${free.o.toFixed(2)})` }
    else if (options[0].o >= 0.5) verdict = `WRONG — duplicate; the ${options[0].t.label} at x=${options[0].t.x} was already claimed`
    else if (options[0].o > 0) verdict = `WRONG — sloppy box on the ${options[0].t.label} at x=${options[0].t.x} (IoU ${options[0].o.toFixed(2)} < 0.5)`
    else verdict = 'WRONG — nothing real there'
    console.log(`  ${k.label.padEnd(10)} ${String(Math.round(k.score * 100)).padStart(3)}%  ${verdict}`)
  }
  console.log(`  → ${right} of ${truth.length} real vehicles found, ${kept.length - right} wrong box(es)`)
}

console.log('\nDuplicates and sloppy boxes survive NMS when they overlap the better box on the')
console.log('same object by LESS than the NMS limit. Benchmarks then let each real object be')
console.log('claimed once, by IoU ≥ 0.5: the extra boxes count as wrong. This is how a detector')
console.log('double-counts a busy road — and why counts from a detector are estimates.')

console.log(rule('Why IoU, and why 0.5'))
const a = truth[0]
for (const shift of [0, 5, 13, 26, 52]) {
  const b = { ...a, x: a.x + shift }
  console.log(`  same size, shifted ${String(shift).padStart(2)} px → IoU ${iou(a, b).toFixed(2)}`)
}
console.log('\n  Two boxes on the same car overlap a lot (IoU high) → one is a duplicate.')
console.log('  Two cars side by side overlap little → both are kept. Set the limit too low')
console.log('  and a car parked behind another disappears; too high and duplicates survive.')

const dir = figDir()
const img = scene()
const all = candidates.reduce((im, b) => strokeRect(im, b, GRAY, 1, 0), dim(img, 0.6))
const kept = nms(candidates, { minScore: 0.3 }).reduce((im, b) => strokeRect(im, b, undefined, 2, 0), dim(img, 0.6))
writePng(`${dir}/05-nms.png`, row([all, kept]))
console.log(`\nFigure written to ${dir}/05-nms.png (left: every candidate; right: after NMS)`)
