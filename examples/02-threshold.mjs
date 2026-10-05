// Lesson 2 — light, colour, and the first decision: is this pixel bright?
//
//   node examples/02-threshold.mjs
//
// The oldest trick in computer vision is a threshold: one number, and every
// pixel above it is "on". Otsu's method (1979) picks that number for you by
// finding the split that best separates the histogram into two groups.
// You will also see grayscale quietly erase a red car — and a colour rule
// bring it back.

import * as ops from '../public/js/cv/ops.js'
import { scene, carsAt, W, H } from './shared/scene.mjs'
import { asciiMask, histogramChart, rule } from './shared/ascii.mjs'
import { writePng } from './shared/png.mjs'
import { row, tint, strokeRect, grayImage } from './shared/draw.mjs'
import { figDir } from './shared/out.mjs'

const img = scene()
const gray = ops.toGray(img)
const hist = ops.histogram(gray)
const t = ops.otsu(gray)

console.log(rule('Histogram: how many pixels at each brightness'))
console.log(histogramChart(hist, 16, 50, t))
console.log(`\nTwo hills: the dark road and ground (~60–110), the bright sky (~170–210).`)
console.log(`Otsu's method chooses ${t}: the split with the largest between-group variance.`)

const mask = ops.threshold(gray, t)
let on = 0
for (const m of mask) on += m
console.log(rule(`Threshold at ${t}: ${(100 * on / mask.length).toFixed(1)}% of pixels are "bright"`))
console.log(asciiMask(mask, W, H, 80))
console.log('\nSky, centre line, white car and the water patch light up. The red car does not —')
console.log('in brightness it is almost the same as the road.')

// Measure that, rather than assert it.
const red = carsAt(0)[0]
const meanIn = (arr, { x, y, w, h }) => {
  let s = 0, n = 0
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) { s += arr[yy * W + xx]; n++ }
  return s / n
}
// The car body below the windscreen, and a patch of plain road beside it.
const body = { x: red.x + 3, y: red.y + 12, w: red.w - 6, h: red.h - 15 }
const road = { x: 40, y: 160, w: 30, h: 12 }
const mean = (arr, box) => meanIn(arr, box === red ? body : road)
const roadBox = road
console.log(rule('Why grayscale loses the red car'))
console.log(`mean brightness, red car body: ${mean(gray, red).toFixed(1)}`)
console.log(`mean brightness, road:         ${mean(gray, roadBox).toFixed(1)}`)

// "Redness": how much more red than green a pixel is. A colour rule, not a brightness rule.
const redness = new Float32Array(W * H)
for (let i = 0, p = 0; i < redness.length; i++, p += 4) redness[i] = Math.max(0, img.data[p] - img.data[p + 1]) * 2
const redMask = ops.threshold(redness, 120)
const found = ops.blobs(redMask, W, H, 30)
console.log(`\nmean "redness" (R − G, doubled), red car: ${mean(redness, red).toFixed(1)}   road: ${mean(redness, roadBox).toFixed(1)}`)
console.log(`A rule on redness > 120 finds ${found.length} region(s):`, found.map((b) => `${b.w}×${b.h} at (${b.x},${b.y})`).join(', '))
console.log(`The answer key says the red car is ${red.w}×${red.h} at (${red.x},${red.y}).`)
console.log('\nLesson: throwing colour away is cheap and usually fine — until the thing you')
console.log('care about differs from its background only in colour. Every simplification')
console.log('a vision system makes is a bet about what does not matter.')

const dir = figDir()
writePng(`${dir}/02-threshold.png`, row([grayImage(gray, W, H), tint(grayImage(gray, W, H), mask, [251, 230, 160]), found.reduce((im, b) => strokeRect(im, b), tint(grayImage(gray, W, H), redMask))]))
console.log(`\nFigure written to ${dir}/02-threshold.png`)
