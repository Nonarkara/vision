// The handbook (docs/) quotes numbers printed by examples/. If a change to
// public/js/cv/ops.js or public/js/ml/learner.js moves one of them, this test
// fails and names the chapter whose text must be updated — so the docs can
// never silently drift from the code they explain.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const FIG_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'vision-figs-'))

function run(lesson) {
  return execFileSync(process.execPath, [path.join(ROOT, 'examples', `${lesson}.mjs`)], {
    env: { ...process.env, FIG_DIR },
    encoding: 'utf8',
  })
}

const QUOTED = {
  '01-pixels': ['docs/01', [
    'red car      at (100,138)  R=174 G= 40 B= 36  →  brightness 79.6',
    'road         at (120,170)  R= 71 G= 73 B= 78  →  brightness 73.0',
    'block 32 px → 10 × 6 = 60 numbers per channel',
  ]],
  '02-threshold': ['docs/02', [
    "Otsu's method chooses 103",
    '39.2% of pixels are "bright"',
    'mean brightness, red car body: 81.6',
    'mean brightness, road:         72.0',
    'finds 1 region(s): 52×28 at (96,118)',
  ]],
  '03-convolution': ['docs/03 and img/convolution.svg', [
    'sum = 588.',
    'Same kernel on flat road at (110, 170): sum = -14',
  ]],
  '04-motion': ['docs/04', [
    'Changed pixels with delta = 18 → 9 region(s)',
    'delta 18:  nothing moved →   0.0% px changed,   0 region(s)',
    'delta  8:  nothing moved →   0.8% px changed,  60 region(s)',
    'delta 90  white car 18×19 · white car 17×19 · motorcycle 6×17 · white car 16×4 · red car 5×7',
  ]],
  '05-detection-nms': ['docs/06', [
    '→ 3 of 3 real vehicles found, 4 wrong box(es)',
    'WRONG — sloppy box on the car at x=96 (IoU 0.49 < 0.5)',
    'same size, shifted 13 px → IoU 0.60',
  ]],
  '06-precision-recall': ['docs/06', [
    'Average precision ≈ 74.8%',
    'small objects: 25 of 67 shown  (37%)',
    'large objects: 125 of 133 shown  (94%)',
  ]],
  '07-transfer-learning': ['docs/07', [
    'first loss 0.693 → last 0.012',
    'layer 100%, k-NN 88%',
    'trained on: rivers-at-night vs roads-by-day   → training accuracy 100%',
    'tested on:  rivers and roads, same lighting   → 50%',
    'tested on:  rivers by day vs roads at night   → 0%',
  ]],
}

for (const [lesson, [where, lines]] of Object.entries(QUOTED)) {
  test(`${lesson} still prints what ${where} quotes`, () => {
    const out = run(lesson)
    for (const line of lines) assert.ok(out.includes(line), `${lesson} no longer prints:\n  ${line}\n→ update ${where}`)
  })
}

test('lessons write their figures', () => {
  const files = fs.readdirSync(FIG_DIR)
  for (const f of ['01-scene.png', '02-threshold.png', '03-kernels.png', '04-motion.png', '05-nms.png', '07-pca.png']) {
    assert.ok(files.includes(f), `missing figure ${f}`)
  }
})
