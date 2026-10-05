// Rebuild every figure in docs/img/ from the examples, so the pictures in the
// documentation are always the output of code you can read and run.
//
//   node examples/build-figures.mjs

import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const FIG_DIR = path.resolve(here, '..', 'docs', 'img')
const lessons = ['01-pixels', '02-threshold', '03-convolution', '04-motion', '05-detection-nms', '07-transfer-learning']

for (const name of lessons) {
  execFileSync(process.execPath, [path.join(here, `${name}.mjs`)], { env: { ...process.env, FIG_DIR }, stdio: ['ignore', 'ignore', 'inherit'] })
  console.log(`✓ ${name}`)
}
console.log(`Figures in ${FIG_DIR}`)
