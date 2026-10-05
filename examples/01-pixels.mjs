// Lesson 1 — a picture is a grid of numbers.
//
//   node examples/01-pixels.mjs
//
// What you will see: the scene as text, the actual numbers under one car,
// how three colour numbers become one brightness number, and what happens
// when you throw resolution away.

import * as ops from '../public/js/cv/ops.js'
import { scene, carsAt, W, H } from './shared/scene.mjs'
import { asciiImage, numberGrid, rule } from './shared/ascii.mjs'
import { writePng } from './shared/png.mjs'
import { row, strokeRect, copy } from './shared/draw.mjs'
import { figDir } from './shared/out.mjs'

const img = scene()
const gray = ops.toGray(img)

console.log(rule(`The scene: ${W} × ${H} = ${(W * H).toLocaleString()} pixels`))
console.log(asciiImage(gray, W, H, 80))
console.log('\nEach character stands for a block of pixels: dark → " .:-=+*#%@" ← bright.')

console.log(rule('Three numbers per pixel (red, green, blue), each 0–255'))
const sample = (name, x, y) => {
  const p = (y * W + x) * 4
  const [r, g, b] = img.data.slice(p, p + 3)
  const L = ops.luma(r, g, b)
  console.log(`${name.padEnd(12)} at (${String(x).padStart(3)},${String(y).padStart(3)})  R=${String(r).padStart(3)} G=${String(g).padStart(3)} B=${String(b).padStart(3)}  →  brightness ${L.toFixed(1)}`)
}
const red = carsAt(0)[0]
sample('sky', 160, 10)
sample('road', 120, 170)
sample('red car', red.x + 4, red.y + red.h - 8)
sample('water patch', 249, 157)
console.log('\nbrightness = 0.299·R + 0.587·G + 0.114·B   (ITU-R BT.601: eyes are most sensitive to green)')

console.log(rule('The actual numbers at the red car\'s top-left corner (brightness, 0–255)'))
console.log(numberGrid(gray, W, red.x - 3, red.y - 3, 16, 8))
console.log('\nRoad on the left and top (~70), car body (~80 — red is dark once colour is gone),')
console.log('windscreen (~50). A computer sees ONLY this. "Car" is nowhere in these numbers.')

console.log(rule('Throwing resolution away'))
for (const block of [32, 16, 8, 4]) {
  console.log(`block ${String(block).padStart(2)} px → ${Math.ceil(W / block)} × ${Math.ceil(H / block)} = ${(Math.ceil(W / block) * Math.ceil(H / block)).toLocaleString()} numbers per channel`)
}
console.log('\nAt 32-pixel blocks the cars are smudges. Somewhere between 16 and 8 a person')
console.log('can tell what they are. Detectors have the same problem: far-away objects are')
console.log('only a few pixels tall, and that is where they fail first.')

const dir = figDir()
const boxed = strokeRect(copy(img), red)
writePng(`${dir}/01-scene.png`, img, 2)
writePng(`${dir}/01-pixelate.png`, row([32, 16, 8, 1].map((b) => (b === 1 ? boxed : ops.pixelate(img, b)))), 1)
writePng(`${dir}/01-gray.png`, row([img, ops.grayToRgba(gray, W, H)]), 1)
const channels = row(['r', 'g', 'b'].map((c) => ops.channel(img, c)))
writePng(`${dir}/01-channels.png`, channels, 1)
console.log(`\nFigures written to ${dir}/01-*.png`)
