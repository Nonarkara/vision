// The bench: whichever camera you picked, seen through the same five lenses
// as the home page. The specimen bar above it names the camera and its owner,
// and offers the visitor's own camera and photos as equals — this room is
// about every camera, and yours is one of them.

import { t, lang, onLang } from '../core/i18n.js'
import { createSpecimen, startSpecimen, specimenBarHtml } from '../core/specimen.js'
import { SourceError } from '../core/source.js'
import { runLens, LENS_TEXT, createLensState } from '../cv/lenses.js'
import { cocoName } from '../ml/labels.js'

const MIN_SCORE = 0.3

function summarise(detections) {
  const counts = {}
  for (const d of detections) counts[d.cls] = (counts[d.cls] ?? 0) + 1
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([c, k]) => `${cocoName(+c, lang())} ×${k}`)
    .join(' · ')
}

export function createBench(root) {
  root.querySelector('[data-specimen-slot]').innerHTML = specimenBarHtml()
  const canvas = root.querySelector('[data-eye]')
  const stateEl = root.querySelector('[data-eye-state]')
  const sayEl = root.querySelector('[data-lens-say]')
  const buttons = [...root.querySelectorAll('[data-lens]')]
  const specimen = createSpecimen({ bar: root.querySelector('[data-specimen]'), prefer: 'still' })
  const lensState = createLensState()
  lensState.minScore = MIN_SCORE
  let lens = 'picture'
  let modelNote = ''
  let started = false

  function objectsText() {
    if (modelNote) return modelNote
    if (lensState.error) return t('โมเดลทำงานไม่สำเร็จในเบราว์เซอร์นี้', 'The model could not run in this browser')
    if (lensState.detections.length) {
      return `${t('เห็น', 'Sees')}: ${summarise(lensState.detections)} — ${Math.round(lensState.detectMs)} ms`
    }
    if (lensState.detectedAt) return t('ไม่พบอะไรที่มั่นใจเกิน 30% — ซึ่งไม่ได้แปลว่าไม่มีอะไร', 'Nothing above 30% confidence — which does not mean nothing is there')
    return ''
  }

  function say() {
    const [name, text] = LENS_TEXT[lens][lang()]
    let extra = lens === 'objects' ? objectsText() : ''
    if (lens === 'motion' && specimen.source?.kind === 'still') {
      extra = t('กล้องนี้ส่งภาพนิ่งทุก ~20 วินาที การเคลื่อนไหวจะเห็นเมื่อภาพถัดไปมาถึง', 'This camera sends a still every ~20 s; motion shows when the next one arrives')
    }
    sayEl.textContent = `${name}. ${text}${extra ? `\n${extra}` : ''}`
  }

  for (const b of buttons) {
    b.addEventListener('click', () => {
      lens = b.dataset.lens
      for (const x of buttons) x.setAttribute('aria-pressed', String(x === b))
      if (lens === 'objects' && !lensState.detectedAt) modelNote = t('กำลังโหลดโครงข่ายประสาทเทียม (18 MB ครั้งแรกเท่านั้น)…', 'Loading the neural network (18 MB, first time only)…')
      say()
    })
  }

  document.addEventListener('modelprogress', (e) => {
    if (e.detail.name !== 'detector') return
    modelNote = e.detail.done ? '' : `${t('กำลังโหลดโครงข่ายประสาทเทียม', 'Loading the neural network')} ${Math.round(e.detail.p * 100)}%`
    if (lens === 'objects') say()
  })

  runLens(canvas, () => specimen.source, () => ({ name: lens }), {
    fps: 12,
    state: lensState,
    onFrame: () => {
      stateEl.hidden = true
      if (lens === 'objects') say()
    },
  })

  specimen.on((src) => {
    stateEl.hidden = !!src
    Object.assign(lensState, { prevGray: null, motion: null, detections: [], detectedAt: 0, error: null })
    say()
  })
  specimen.onError((text, kept) => { if (!kept) { stateEl.hidden = false; stateEl.textContent = text } })
  onLang(say)
  say()

  function showState(text) {
    stateEl.hidden = false
    stateEl.textContent = text
  }

  return {
    specimen,
    /** Open whatever the page would open by default: the webcam if asked by URL, else a public camera. */
    async start() {
      if (started) return
      started = true
      showState(t('กำลังหากล้องที่ตอบ…', 'Finding a camera that answers…'))
      const src = await startSpecimen(specimen)
      if (!src && !specimen.source) showState(t('ยังไม่มีกล้องตอบ ลองกด ↻ หรือใช้กล้องของคุณ', 'No camera answered yet — press ↻ or use your own camera'))
    },
    /** Put one catalogue camera on the bench. Resolves true if it answered. */
    async study(cam) {
      started = true
      showState(t('กำลังเปิดกล้อง…', 'Opening camera…'))
      try {
        await specimen.useCamera(cam)
        return true
      } catch (err) {
        // Keep whatever was showing before; say why this one did not open.
        const why = err instanceof SourceError ? err.text : t('เปิดกล้องนี้ไม่ได้', 'Could not open this camera')
        if (specimen.source) stateEl.hidden = true
        else showState(why)
        sayEl.textContent = `${why}\n${t('กล้องเป็นของผู้อื่น บางครั้งก็ไม่ตอบ ลองกล้องอื่น', 'These cameras belong to other people and sometimes do not answer. Try another.')}`
        return false
      }
    },
    pickLens(name) { root.querySelector(`[data-lens="${name}"]`)?.click() },
  }
}
