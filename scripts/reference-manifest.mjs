import fs from 'node:fs'
import { PACK, referenceFrames } from '../public/js/evaluation/reference.js'
fs.mkdirSync(new URL('../docs/evaluation/', import.meta.url), { recursive: true })
fs.writeFileSync(new URL('../docs/evaluation/reference-v1.json', import.meta.url), JSON.stringify({ ...PACK, frames: referenceFrames() }, null, 2) + '\n')
