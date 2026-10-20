// Score a browser-exported report. Never substitutes invented model predictions.
import fs from 'node:fs'
import { PACK, referenceFrames } from '../public/js/evaluation/reference.js'
import { evaluate } from '../public/js/evaluation/metrics.js'
const file = process.argv[2]
if (!file) {
  console.log(JSON.stringify({ pack: PACK, frames: referenceFrames().length, evaluationFrames: referenceFrames().filter(f => f.split === 'evaluation').length, status: 'not run', next: 'Use System → Model reference check, download the report, then npm run evaluate -- report.json' }, null, 2))
} else {
  const report = JSON.parse(fs.readFileSync(file, 'utf8'))
  if (report.pack !== PACK.id || report.split !== 'evaluation' || !Array.isArray(report.records)) throw Error('Unsupported reference report')
  const result = evaluate(referenceFrames().filter(f => f.split === 'evaluation'), report.records)
  console.log(JSON.stringify({ pack: PACK.id, ...result }, null, 2))
  if (!result.complete) process.exitCode = 2
}
