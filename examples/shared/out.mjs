// Where examples write their pictures. `node examples/build-figures.mjs`
// sets FIG_DIR=docs/img so the documentation's figures are regenerated from
// the same code you can read; otherwise they go to examples/out/.

import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))

export function figDir() {
  return process.env.FIG_DIR ? path.resolve(process.env.FIG_DIR) : path.resolve(here, '..', 'out')
}
