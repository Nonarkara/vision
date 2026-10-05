// Lesson 6 — the confidence slider is a trade, and here is the price list.
//
//   node examples/06-precision-recall.mjs
//
// Every detector answer has a score. Show only answers above a threshold and
// you choose between two kinds of mistake:
//   precision = of the boxes shown, how many are real?      (few false alarms)
//   recall    = of the real objects, how many were shown?   (few misses)
// Raise the threshold: precision up, recall down. There is no setting with
// neither mistake. This is why the site never says "no car" — only "nothing
// above N%".
//
// The detections are SIMULATED: a detector that is usually more confident
// about real objects than about false alarms, and worse at small ones —
// which is how real detectors behave. Change SEED to see the trade hold.

import { rule } from './shared/ascii.mjs'

const SEED = 2026
let s = SEED
const rand = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }

// 200 real objects in 50 frames; a third are small (far from the camera).
const real = Array.from({ length: 200 }, (_, i) => ({ small: i % 3 === 0 }))
const detections = []
for (const obj of real) {
  // A real object is found at all with probability 0.9 (0.6 if small)...
  if (rand() < (obj.small ? 0.6 : 0.9)) {
    // ...and when found, scored high-ish (lower if small).
    const score = Math.min(0.99, (obj.small ? 0.35 : 0.55) + rand() * 0.45)
    detections.push({ score, real: true, small: obj.small })
  }
}
// False alarms: shadows, signs, reflections — mostly low scores.
for (let i = 0; i < 120; i++) detections.push({ score: Math.pow(rand(), 2.2) * 0.85, real: false })

console.log(rule(`${real.length} real objects · ${detections.length} detector answers (simulated)`))
console.log(' threshold   shown   correct   false alarms   missed   precision   recall')
const curve = []
for (let t = 0.1; t <= 0.91; t += 0.1) {
  const shown = detections.filter((d) => d.score >= t)
  const tp = shown.filter((d) => d.real).length
  const fp = shown.length - tp
  const precision = shown.length ? tp / shown.length : 1
  const recall = tp / real.length
  curve.push({ t, precision, recall })
  console.log(`   ${t.toFixed(1)}       ${String(shown.length).padStart(4)}     ${String(tp).padStart(4)}        ${String(fp).padStart(4)}       ${String(real.length - tp).padStart(4)}       ${(precision * 100).toFixed(0).padStart(3)}%       ${(recall * 100).toFixed(0).padStart(3)}%`)
}

console.log(rule('Precision (↑) against recall (→)'))
const H = 12, Wd = 50
const grid = Array.from({ length: H }, () => Array(Wd).fill(' '))
for (const p of curve) {
  const c = Math.round(p.recall * (Wd - 1)), r = H - 1 - Math.round(p.precision * (H - 1))
  grid[r][c] = String(Math.round(p.t * 10) % 10)
}
grid.forEach((line, r) => console.log(`${(1 - r / (H - 1)).toFixed(2)} │${line.join('')}`))
console.log(`     └${'─'.repeat(Wd)}\n      0 recall                                  1.0`)
console.log('Digits are thresholds (1 = 0.1 … 9 = 0.9). Moving right finds more; moving up lies less.')

// Average precision: the area under the curve — the number papers report as "AP" / "mAP".
const sorted = [...detections].sort((a, b) => b.score - a.score)
let tp = 0, ap = 0, prevRecall = 0
sorted.forEach((d, i) => {
  if (!d.real) return
  tp++
  const recall = tp / real.length
  ap += (recall - prevRecall) * (tp / (i + 1))
  prevRecall = recall
})
console.log(rule('One number for the whole curve'))
console.log(`Average precision ≈ ${(ap * 100).toFixed(1)}%  (area under the precision–recall curve)`)
console.log('Benchmarks like COCO average this over classes and IoU limits: "mAP".')
const nSmall = real.filter((o) => o.small).length
console.log(rule('Who gets missed? (threshold 0.5)'))
const foundSmall = detections.filter((d) => d.real && d.small && d.score >= 0.5).length
const foundLarge = detections.filter((d) => d.real && !d.small && d.score >= 0.5).length
console.log(`small objects: ${foundSmall} of ${nSmall} shown  (${((100 * foundSmall) / nSmall).toFixed(0)}%)`)
console.log(`large objects: ${foundLarge} of ${real.length - nSmall} shown  (${((100 * foundLarge) / (real.length - nSmall)).toFixed(0)}%)`)
console.log('A detector\'s silence is weakest exactly where things are far away.')
