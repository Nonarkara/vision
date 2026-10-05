// Lesson 3 — convolution: a 3×3 window slides over the picture.
//
//   node examples/03-convolution.mjs
//
// At every pixel, multiply the nine neighbours by nine weights and add them
// up. The weights (the "kernel") decide what the window finds: blur, sharpen,
// edges. A convolutional neural network is thousands of these windows whose
// weights were LEARNED instead of chosen — which is the whole bridge from
// classical vision to deep learning.

import * as ops from '../public/js/cv/ops.js'
import { scene, carsAt, W, H } from './shared/scene.mjs'
import { asciiImage, rule } from './shared/ascii.mjs'
import { writePng } from './shared/png.mjs'
import { row, column, magnitudeImage, grayImage } from './shared/draw.mjs'
import { figDir } from './shared/out.mjs'

const img = scene()
const gray = ops.toGray(img)
const white = carsAt(0)[1]

// One multiply-add, worked by hand, at the white car's left edge.
const x = white.x, y = white.y + 10
const K = ops.KERNELS.vertical
console.log(rule(`One step, worked by hand, at pixel (${x}, ${y}) — the white car's left edge`))
const n = [], prods = []
for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) n.push(Math.round(gray[(y + dy) * W + (x + dx)]))
K.forEach((k, i) => prods.push(k * n[i]))
const fmt = (a, w = 5) => a.map((v) => String(v).padStart(w)).join('')
console.log('neighbourhood (brightness)    ×   kernel "vertical edge"   =   products')
for (let r = 0; r < 3; r++) console.log(`${fmt(n.slice(r * 3, r * 3 + 3))}            ${fmt(K.slice(r * 3, r * 3 + 3), 4)}          ${fmt(prods.slice(r * 3, r * 3 + 3), 6)}`)
const sum = prods.reduce((a, b) => a + b, 0)
console.log(`\nsum = ${sum}. Left column dark road, right column bright car: a big positive number = a strong`)
console.log('dark→bright edge running up and down. On flat road the same sum is near 0.')
const flat = []
for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) flat.push(Math.round(gray[(170 + dy) * W + (110 + dx)]))
console.log(`Same kernel on flat road at (110, 170): sum = ${K.reduce((s, k, i) => s + k * flat[i], 0)}`)

console.log(rule('The kernels the site lets you play with (public/js/cv/ops.js KERNELS)'))
for (const [name, k] of Object.entries(ops.KERNELS)) {
  const show = k.map((v) => (Number.isInteger(v) ? String(v) : v.toFixed(2)).padStart(5))
  console.log(`${name.padEnd(11)} [${show.slice(0, 3).join('')} |${show.slice(3, 6).join('')} |${show.slice(6).join('')} ]`)
}

const { gx, gy, mag } = ops.sobel(gray, W, H)
console.log(rule('Sobel edge strength = √(vertical² + horizontal²), as text'))
let peak = 0
for (const v of mag) peak = Math.max(peak, v)
console.log(asciiImage(Float32Array.from(mag, (v) => Math.min(255, (v / peak) * 255 * 3)), W, H, 80))
console.log('\nOutlines survive; flat regions vanish. Notice the noise too: a camera\'s grain')
console.log('makes faint edges everywhere, which is why real pipelines blur first.')

const dir = figDir()
const show = (name) => {
  const out = ops.convolve3(gray, W, H, ops.KERNELS[name])
  return ['edges', 'vertical', 'horizontal'].includes(name) ? magnitudeImage(out, W, H) : grayImage(name === 'emboss' ? out.map((v) => v + 128) : out, W, H)
}
writePng(`${dir}/03-kernels.png`, column([row(['identity', 'blur', 'sharpen', 'emboss'].map(show)), row(['vertical', 'horizontal', 'edges'].map(show).concat([magnitudeImage(mag, W, H)]))]))
writePng(`${dir}/03-sobel-parts.png`, row([magnitudeImage(gx, W, H), magnitudeImage(gy, W, H), magnitudeImage(mag, W, H)]))
console.log(`\nFigures written to ${dir}/03-kernels.png and 03-sobel-parts.png`)
