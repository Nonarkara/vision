// Learn: eight chapters, one picture. The specimen bar at the top chooses
// what every bench studies — a public camera, the visitor's own camera, or a
// photo — so switching to your own face re-teaches the whole page at once.

import '../core/site.js?v=1.10.0'
import { t, onLang } from '../core/i18n.js'
import { createSpecimen, startSpecimen, specimenBarHtml } from '../core/specimen.js?v=1.10.0'
import { numbersChapter, colourChapter, thresholdChapter } from '../learn/pixels.js'
import { convolutionChapter, edgesChapter, motionChapter } from '../learn/filters.js'
import { detectorChapter, limitsChapter } from '../learn/neural.js'

const CHAPTERS = {
  numbers: numbersChapter,
  colour: colourChapter,
  threshold: thresholdChapter,
  convolution: convolutionChapter,
  edges: edgesChapter,
  motion: motionChapter,
  detector: detectorChapter,
  limits: limitsChapter,
}

const slot = document.querySelector('[data-specimen-slot]')
slot.insertAdjacentHTML('afterend', specimenBarHtml())
slot.remove()
const specimen = createSpecimen({ bar: document.querySelector('[data-specimen]'), prefer: 'video' })
const getSource = () => specimen.source

const benches = Object.entries(CHAPTERS).flatMap(([name, init]) => {
  const chapter = document.querySelector(`[data-chapter="${name}"]`)
  return chapter ? [init(chapter, getSource)] : []
})

const states = [...document.querySelectorAll('[data-state]')]
function showState(text) {
  for (const el of states) { el.hidden = false; el.textContent = text }
}

specimen.on((src) => {
  for (const el of states) el.hidden = !!src
  for (const b of benches) { b.reset?.(); b.invalidate() }
})
specimen.onError((text, kept) => { if (!kept) showState(text) })
onLang(() => { for (const b of benches) b.invalidate() })

// "Use my camera for the whole page": the same as the bar's button, but where people read first.
document.querySelector('[data-learn-mine]')?.addEventListener('click', () => specimen.useWebcam())

showState(t('กำลังหากล้องที่ตอบ…', 'Finding a camera that answers…'))
startSpecimen(specimen).then((src) => {
  if (!src) showState(t('ยังไม่มีกล้องตอบ ลองกด ↻ หรือใช้กล้องของคุณ', 'No camera answered yet — press ↻ or use your own camera'))
})
