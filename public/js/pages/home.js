// Home: one live camera, five lenses. The page's argument in one instrument.

import '../core/site.js?v=1.16.0'
import { t, lang, n, onLang } from '../core/i18n.js'
import { loadCatalog, isReadable } from '../core/catalog.js'
import { createSpecimen, startSpecimen } from '../core/specimen.js?v=1.16.0'
import { runLens, LENS_TEXT, LENS_ORDER, createLensState } from '../cv/lenses.js'
import { outlineEdges, mountSaw } from '../cv/feedback.js?v=1.16.0'
import { onSpotted } from '../cv/spotted.js?v=1.16.0'
import { cocoName } from '../ml/labels.js'

const canvas = document.querySelector('[data-eye]')
const stateEl = document.querySelector('[data-eye-state]')
const sayEl = document.querySelector('[data-lens-say]')
const buttons = [...document.querySelectorAll('[data-lens]')]
const specimen = createSpecimen({ bar: document.querySelector('[data-specimen]'), prefer: 'video' })

let lens = 'objects'
let modelNote = ''
let machine = document.documentElement.dataset.machine === '1'
let sweeping = !matchMedia('(prefers-reduced-motion: reduce)').matches
const lensState = createLensState()
const saw = mountSaw(document.querySelector('.stage-view'))
const MACHINE = ['edges', 'motion', 'objects']
onSpotted((count) => {
  const el = document.querySelector('[data-spotted]')
  if (el) el.textContent = n(count)
})

function say() {
  const [name, text] = LENS_TEXT[lens][lang()]
  let extra = ''
  if (lens === 'objects') {
    if (lensState.error) extra = `\n${t('เปิดการตรวจจับไม่ได้ ลองเลือกสิ่งของอีกครั้ง หรือใช้เลนส์อื่น', 'Detection is unavailable. Try Objects again, or use another lens.')}`
    else if (modelNote) extra = `\n${modelNote}`
    else if (lensState.detections.length) {
      const counts = {}
      for (const d of lensState.detections) counts[d.cls] = (counts[d.cls] ?? 0) + 1
      const list = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([c, k]) => `${cocoName(+c, lang())} ×${k}`).join(' · ')
      extra = `\n${t('เห็น', 'Sees')}: ${list} — ${Math.round(lensState.detectMs)} ms`
    } else if (lensState.detectedAt) {
      extra = `\n${t('ไม่พบอะไรที่มั่นใจเกิน 30% — ซึ่งไม่ได้แปลว่าไม่มีอะไร', 'Nothing above 30% confidence — which does not mean nothing is there')}`
    }
  }
  if (lens === 'motion' && specimen.source?.kind === 'still') {
    extra = `\n${t('กล้องนี้ส่งภาพนิ่งทุก ~20 วินาที การเคลื่อนไหวจะเห็นเมื่อภาพถัดไปมาถึง', 'This camera sends a still every ~20 s; motion shows when the next one arrives')}`
  }
  sayEl.textContent = `${name}. ${text}${extra}`
}

function applyLens(name, byUser) {
  if (byUser) sweeping = false
  const prev = buttons.find((x) => x.getAttribute('aria-pressed') === 'true')
  lens = name
  const b = buttons.find((x) => x.dataset.lens === name)
  const allowTrail = prev && prev !== b && !matchMedia('(prefers-reduced-motion: reduce)').matches
  for (const x of buttons) {
    x.setAttribute('aria-pressed', String(x === b))
    x.classList.toggle('machine-trail', allowTrail && x === prev)
  }
  if (lens === 'objects') { lensState.error = null; lensState.detectedAt = 0; lensState.detectedFrame = null }
  if (lens === 'objects' && !lensState.detectedAt) modelNote = t('กำลังโหลดโครงข่ายประสาทเทียม (18 MB ครั้งแรกเท่านั้น)…', 'Loading the neural network (18 MB, first time only)…')
  say()
}

for (const b of buttons) b.addEventListener('click', () => applyLens(b.dataset.lens, true))

document.addEventListener('modelprogress', (e) => {
  if (e.detail.name !== 'detector') return
  modelNote = e.detail.done ? '' : `${t('กำลังโหลดโครงข่ายประสาทเทียม', 'Loading the neural network')} ${Math.round(e.detail.p * 100)}%`
  if (lens === 'objects') say()
})

runLens(canvas, () => specimen.source, () => ({ name: lens }), {
  fps: 12,
  state: lensState,
  onFrame: (rect, state, src) => {
    stateEl.hidden = true
    if (lens === 'objects') say()
    const person = src?.kind === 'webcam' && (lens === 'objects' || lens === 'picture')
      ? state.detections.filter((d) => d.cls === 1 && d.score >= 0.45).sort((a, b) => b.score - a.score)[0]
      : null
    if (!person || !rect) { saw.clear(); return }
    const img = src.grab(96)
    if (img) outlineEdges(canvas.getContext('2d'), img, person, rect)
    saw.update(person.score, 'COCO')
  },
})

specimen.on((src) => {
  stateEl.hidden = !!src
  lensState.prevGray = null
  lensState.motion = null
  lensState.detections = []
  lensState.detectedAt = 0
  say()
})

onLang(say)
say()
stateEl.textContent = t('กำลังหากล้องที่ตอบ…', 'Finding a camera that answers…')
startSpecimen(specimen).then((src) => { if (!src) stateEl.textContent = t('ยังไม่มีกล้องตอบ ลองกด ↻ หรือใช้กล้องของคุณ', 'No camera answered yet — press ↻ or use your own camera') })

// "Try it on your own camera": open the webcam, jump to the objects lens, bring the stage into view.
const stage = document.querySelector('.opening-stage')
function pickLens(name) {
  applyLens(name, true)
}
// Detection is on when the page opens. If motion is welcome, the five lenses
// then take turns: picture, numbers, edges, motion, objects.
modelNote = t('กำลังโหลดโครงข่ายประสาทเทียม (18 MB ครั้งแรกเท่านั้น)…', 'Loading the neural network (18 MB, first time only)…')
document.addEventListener('machinevision', (e) => {
  machine = e.detail.on
  if (!machine) return
  sweeping = !matchMedia('(prefers-reduced-motion: reduce)').matches
  applyLens('edges', false)
})
setInterval(() => {
  if (!sweeping || document.hidden) return
  const order = machine ? MACHINE : LENS_ORDER
  const i = order.indexOf(lens)
  applyLens(order[(i + 1) % order.length], false)
}, 4200)
document.querySelector('[data-mine]')?.addEventListener('click', async () => {
  stage.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' })
  const src = await specimen.useWebcam()
  if (src) pickLens('objects')
})
specimen.onError((text, kept) => { if (!kept) { stateEl.hidden = false; stateEl.textContent = text } })

// Number keys 1–5 switch lenses, like the labels on the buttons say.
document.addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey || /input|textarea|select/i.test(e.target.tagName)) return
  const lensName = LENS_ORDER[Number(e.key) - 1]
  if (lensName) pickLens(lensName)
})

// Figures, from the live catalogue.
loadCatalog().then((data) => {
  const set = (k, v) => { const el = document.querySelector(`[data-fig="${k}"]`); if (el) el.textContent = n(v) }
  const paint = () => {
    set('total', data.counts.total)
    set('readable', data.cameras.filter(isReadable).length)
    set('video', data.counts.video)
  }
  paint()
  onLang(paint)
}).catch(() => { /* figures stay as dashes: honest */ })

const clock = document.querySelector('[data-clock]')
const tick = () => { clock.textContent = new Date().toLocaleTimeString(lang() === 'th' ? 'th-TH' : 'en-GB', { hour12: false }) }
tick()
setInterval(tick, 1000)
