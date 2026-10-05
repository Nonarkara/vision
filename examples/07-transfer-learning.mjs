// Lesson 7 — teaching a machine from a handful of examples.
//
//   node examples/07-transfer-learning.mjs
//
// On /train, MobileNetV2 turns each picture into 1,280 numbers (an
// "embedding"), and a tiny learner decides on top. This lesson runs the SAME
// learner code (public/js/ml/learner.js) on SIMULATED embeddings, so you can
// see every number: nearest neighbours, a trained layer and its loss curve,
// the 2-D map — and the trap that catches real projects: shortcut learning.
//
// Simulated embeddings: each class has a "typical look" (a centre in
// 1,280-D space); an example is that centre plus variation. Real embeddings
// behave like this closely enough for the lessons to transfer.

import { normalize, knnPredict, createLayer, pca2, leaveOneOut, dot } from '../public/js/ml/learner.js'
import { rule, lineChart, scatter } from './shared/ascii.mjs'
import { writePng } from './shared/png.mjs'
import { figDir } from './shared/out.mjs'
import { NAPLES, SIGNAL, GRAY, OLIVE } from './shared/draw.mjs'

const D = 1280
let s = 7
const rand = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
const gauss = () => Math.sqrt(-2 * Math.log(rand() + 1e-12)) * Math.cos(2 * Math.PI * rand())
// Embeddings from MobileNetV2's last pooling layer are non-negative (ReLU6), mostly small.
const centre = () => Float32Array.from({ length: D }, () => Math.max(0, gauss() * 0.6 + 0.2))
const sample = (c, spread = 1.1, extra = null) => normalize(Float32Array.from(c, (v, i) => Math.max(0, v + gauss() * spread * 0.5 + (extra ? extra[i] : 0))))

const NAMES = ['river camera', 'road camera']
// The two classes share half their "look" (sky, trees, concrete...), like real cameras do.
const base = centre(), other = centre()
const centres = [base, base.map((v, i) => 0.5 * v + 0.5 * other[i])]
const make = (n, spread = 1.4) => centres.flatMap((c, y) => Array.from({ length: n }, () => ({ x: sample(c, spread), y })))

console.log(rule('1 · Nearest neighbours: no training at all'))
const train5 = make(5, 1.1)
const probe = { x: sample(centres[0]), y: 0 }
const { probs, neighbours } = knnPredict(train5, probe.x, 2, 5)
console.log(`A new ${NAMES[0]} picture. Its 5 most similar examples (cosine similarity, 1 = identical):`)
for (const n of neighbours) console.log(`  example #${String(n.i).padStart(2)}  ${NAMES[n.y].padEnd(13)} similarity ${n.sim.toFixed(3)}`)
console.log(`Vote → ${NAMES.map((nm, i) => `${nm} ${(probs[i] * 100).toFixed(0)}%`).join(' · ')}`)
console.log('\n"Training" a nearest-neighbour learner is just remembering. That is why /train')
console.log('answers the moment you add a single example.')

console.log(rule('2 · How many examples? (leave-one-out accuracy, averaged over 4 draws)'))
console.log('  per class    k = 1 (closest one decides)       k = 5 (five closest vote)')
const loo = (n, k) => { let t = 0; for (let r = 0; r < 4; r++) t += leaveOneOut(make(n), 2, k) ?? 0; return t / 4 }
for (const n of [1, 2, 3, 5, 10, 20, 40]) {
  const a1 = loo(n, 1), a5 = loo(n, 5)
  const bar = (a) => `${(a * 100).toFixed(0).padStart(3)}% ${'█'.repeat(Math.round(a * 20)).padEnd(20)}`
  console.log(`  ${String(n).padStart(4)}        ${bar(a1)}       ${bar(a5)}`)
}
console.log('\nLeave-one-out: hide each example in turn, predict it from the rest.')
console.log('· One per class can never work: the hidden example\'s class has nobody left to vote.')
console.log('· k = 5 with ≤ 3 per class fails outright: the other class always has more voters.')
console.log('· After that, more examples help — with diminishing returns. Variety beats volume.')

console.log(rule('3 · A trained layer: weights adjusted until the loss falls'))
const train = make(15)
const layer = createLayer(D, 2)
const losses = []
for (let epoch = 0; epoch < 200; epoch++) losses.push(layer.step(train).loss)
console.log(lineChart(losses, { height: 10, width: 60, label: 'cross-entropy loss per pass (200 passes)' }))
const test = make(40)
const accOf = (predict) => test.filter((t) => { const p = predict(t.x); return p.indexOf(Math.max(...p)) === t.y }).length / test.length
console.log(`\nfirst loss ${losses[0].toFixed(3)} → last ${losses.at(-1).toFixed(3)} · accuracy on 80 NEW examples: layer ${(accOf(layer.predict) * 100).toFixed(0)}%, k-NN ${(accOf((x) => knnPredict(train, x, 2, 5).probs) * 100).toFixed(0)}%`)
console.log('The layer beats k-NN here: training taught it WHICH of the 1,280 numbers separate')
console.log('the classes; k-NN weighs all of them equally, noise included.')
console.log('Loss is "how surprised the layer is by the right answers". Each pass nudges 2,562')
console.log('weights (1,280 × 2 + 2) a little downhill — gradient descent, here with Adam.')

console.log(rule('4 · The map: 1,280 numbers squeezed to 2 (PCA)'))
const proj = pca2(train.map((t) => t.x))
console.log(scatter(proj.points, train.map((t) => (t.y ? '■' : '●')), { width: 60, height: 16 }))
console.log(`\n● ${NAMES[0]}   ■ ${NAMES[1]}   — two clouds means the classes look different to the network.`)
console.log('Points close here may be far apart in 1,280-D: the map is a shadow, not the room.')

console.log(rule('5 · The trap: shortcut learning'))
// Every river example was taken at NIGHT; every road example by DAY. "Night" is a
// strong direction in embedding space — stronger than river-vs-road.
const night = Float32Array.from({ length: D }, () => Math.max(0, gauss() * 1.4))
const biased = [
  ...Array.from({ length: 15 }, () => ({ x: sample(centres[0], 1.4, night), y: 0 })),
  ...Array.from({ length: 15 }, () => ({ x: sample(centres[1], 1.4), y: 1 })),
]
const fair = make(40)
const flipped = [
  ...Array.from({ length: 40 }, () => ({ x: sample(centres[0], 1.4), y: 0 })),          // rivers by day
  ...Array.from({ length: 40 }, () => ({ x: sample(centres[1], 1.4, night), y: 1 })),   // roads at night
]
const biasedLayer = createLayer(D, 2)
for (let e = 0; e < 200; e++) biasedLayer.step(biased)
const acc = (set) => set.filter((t) => { const p = biasedLayer.predict(t.x); return p.indexOf(Math.max(...p)) === t.y }).length / set.length
console.log(`trained on: rivers-at-night vs roads-by-day   → training accuracy ${(acc(biased) * 100).toFixed(0)}%`)
console.log(`tested on:  rivers and roads, same lighting   → ${(acc(fair) * 100).toFixed(0)}%`)
console.log(`tested on:  rivers by day vs roads at night   → ${(acc(flipped) * 100).toFixed(0)}%`)
console.log('\nThe layer learned "dark = river". It scores perfectly on its own examples and')
console.log('fails the moment the lighting flips. It happens in practice: a skin-cancer')
console.log('classifier swayed by surgical ink markings (Winkler et al., JAMA Dermatology 2019);')
console.log('pneumonia models that learned which hospital took the X-ray (Zech et al., PLOS')
console.log('Medicine 2018). The cure is not a bigger model — it is examples that vary the')
console.log('things that should not matter.')
const overlap = dot(normalize(night), normalize(centres[0].map((v, i) => v - centres[1][i])))
console.log(`(Overlap between "night" and the real river/road difference: ${Math.abs(overlap) < 0.005 ? '0.00' : overlap.toFixed(2)} — unrelated, yet decisive.)`)

// Figures: loss curve and PCA map, drawn as pixels.
const dir = figDir()
const canvas = (w, h) => { const d = new Uint8ClampedArray(w * h * 4); for (let p = 0; p < d.length; p += 4) d.set([...OLIVE, 255], p); return { data: d, width: w, height: h } }
const dot2 = (img, x, y, c, r = 2) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const X = Math.round(x + dx), Y = Math.round(y + dy); if (X >= 0 && Y >= 0 && X < img.width && Y < img.height) img.data.set([...c, 255], (Y * img.width + X) * 4) } }
const loss = canvas(480, 200)
const lmax = Math.max(...losses), lmin = Math.min(...losses)
losses.forEach((l, i) => dot2(loss, 20 + (i / 199) * 440, 180 - ((l - lmin) / (lmax - lmin || 1)) * 160, SIGNAL, 1))
writePng(`${dir}/07-loss.png`, loss, 1)
const map = canvas(480, 320)
const xs = proj.points.map((p) => p[0]), ys = proj.points.map((p) => p[1])
const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
proj.points.forEach(([x, y], i) => dot2(map, 30 + ((x - x0) / (x1 - x0)) * 420, 290 - ((y - y0) / (y1 - y0)) * 260, train[i].y ? GRAY : NAPLES, 4))
const live = proj.project(probe.x)
dot2(map, 30 + ((live[0] - x0) / (x1 - x0)) * 420, 290 - ((live[1] - y0) / (y1 - y0)) * 260, SIGNAL, 6)
writePng(`${dir}/07-pca.png`, map, 1)
console.log(`\nFigures written to ${dir}/07-loss.png and 07-pca.png`)
