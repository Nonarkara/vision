// Lesson 4 — motion: subtract one moment from the next.
//
//   node examples/04-motion.mjs
//
// Frame differencing is the plainest useful machine there is, and the one the
// /story wall uses: no model, no names, no faces — only "these pixels changed".
// Three steps, all in public/js/cv/ops.js:
//   diffMask  → 1 where brightness changed by more than `delta`
//   dilate    → grow each spot by a pixel so a broken outline joins up
//   blobs     → connected regions, each a box and an area

import * as ops from '../public/js/cv/ops.js'
import { scene, carsAt, W, H } from './shared/scene.mjs'
import { asciiMask, rule } from './shared/ascii.mjs'
import { writePng } from './shared/png.mjs'
import { row, tint, strokeRect, dim } from './shared/draw.mjs'
import { figDir } from './shared/out.mjs'

const before = scene({ t: 0 })
const after = scene({ t: 1 })
const g0 = ops.toGray(before), g1 = ops.toGray(after)

function detectMotion(a, b, delta, minArea = 12) {
  const raw = ops.diffMask(a, b, delta)
  const mask = ops.dilate(raw, W, H)
  return { raw, mask, found: ops.blobs(mask, W, H, minArea) }
}

const { mask, found } = detectMotion(g0, g1, 18)
console.log(rule('Two frames, one second apart (answer key: three vehicles moved)'))
for (const [i, c] of carsAt(0).entries()) console.log(`${c.label.padEnd(10)} x ${c.x} → ${carsAt(1)[i].x}`)
console.log(rule(`Changed pixels with delta = 18 → ${found.length} region(s)`))
console.log(asciiMask(mask, W, H, 80))
console.log('\n  #   box (x, y, w × h)      area')
found.forEach((b, i) => console.log(`${String(i + 1).padStart(3)}   (${b.x}, ${b.y}, ${b.w} × ${b.h})`.padEnd(26) + String(b.area).padStart(6)))
console.log('\nA moving car shows up as TWO slivers — where it arrived and where it left —')
console.log('or one long box when they join. Differencing sees change, not objects.')

console.log(rule('The threshold is a bet against noise'))
const still = scene({ t: 0, seed: 99 })   // same scene, nothing moved, new sensor noise
for (const delta of [4, 8, 18, 40, 90]) {
  const share = (m) => `${((100 * m.raw.reduce((a, b) => a + b, 0)) / m.raw.length).toFixed(1).padStart(5)}% px`
  const noiseOnly = detectMotion(g0, ops.toGray(still), delta)
  const real = detectMotion(g0, g1, delta)
  console.log(`delta ${String(delta).padStart(2)}:  nothing moved → ${share(noiseOnly)} changed, ${String(noiseOnly.found.length).padStart(3)} region(s)   ·   cars moved → ${share(real)}, ${String(real.found.length).padStart(3)} region(s)`)
}

// Which vehicle does each region belong to? (Answer key: a region near a car's path.)
function owner(b) {
  let best = 'noise', bestArea = 0
  for (const [i, c] of carsAt(0).entries()) {
    const c1 = carsAt(1)[i]
    const sx0 = Math.min(c.x, c1.x), sx1 = Math.max(c.x + c.w, c1.x + c1.w)   // the path it swept
    const ox = Math.max(0, Math.min(b.x + b.w, sx1) - Math.max(b.x, sx0))
    const oy = Math.max(0, Math.min(b.y + b.h, c.y + c.h) - Math.max(b.y, c.y))
    if (ox * oy > bestArea) { bestArea = ox * oy; best = c.label === 'motorcycle' ? 'motorcycle' : c.x === 96 ? 'red car' : 'white car' }
  }
  return best
}
console.log('\nWhich vehicles survive each threshold:')
for (const delta of [18, 40, 90]) {
  const found = detectMotion(g0, g1, delta).found
  console.log(`  delta ${String(delta).padStart(2)}  ${found.map((b) => `${owner(b)} ${b.w}×${b.h}`).join(' · ')}`)
}
console.log('The red car fades first: its body is about as bright as the asphalt.')
console.log('\nAt delta 4 grain flips a third of all pixels and they fuse into one frame-sized "region".')
console.log('Too low and grain becomes "motion". Too high and a dark car on a dark road')
console.log("stops counting. The site's motion lens uses 22 (the /learn slider runs 4–80):")
console.log('chosen, not learned — and not perfect.')

const dir = figDir()
const overlay = found.reduce((im, b) => strokeRect(im, b), tint(dim(after), mask))
writePng(`${dir}/04-motion.png`, row([before, after, overlay]))
console.log(`\nFigure written to ${dir}/04-motion.png`)
