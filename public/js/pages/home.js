// Home: one live camera, five lenses. The page's argument in one instrument.

import '../core/site.js?v=1.17.0'
import { t, lang, n, count, onLang } from '../core/i18n.js'
import { loadCatalog, isReadable } from '../core/catalog.js'
import { createSpecimen, startSpecimen } from '../core/specimen.js?v=1.17.0'
import { runLens, LENS_TEXT, LENS_ORDER, createLensState } from '../cv/lenses.js'
import { outlineEdges, mountSaw } from '../cv/feedback.js?v=1.17.0'
import { onSpotted } from '../cv/spotted.js?v=1.17.0'
import { cocoName } from '../ml/labels.js'
import { detectorFailureSentence } from '../ml/failure.js'

const canvas = document.querySelector('[data-eye]')
const stateEl = document.querySelector('[data-eye-state]')
const sayEl = document.querySelector('[data-lens-say]')
const lineEl = document.querySelector('[data-lens-line]')
const lineInput = document.querySelector('[data-lens-min]')
const lineOut = document.querySelector('[data-lens-min-out]')
const buttons = [...document.querySelectorAll('[data-lens]')]
const specimen = createSpecimen({ bar: document.querySelector('[data-specimen]'), prefer: 'video' })

let lens = 'picture'
let modelNote = ''
let modelSeen = false   // has this page ever finished a detection?
let machine = document.documentElement.dataset.machine === '1'
let sweeping = !matchMedia('(prefers-reduced-motion: reduce)').matches
const lensState = createLensState()
const saw = mountSaw(document.querySelector('.stage-view'))
const MACHINE = ['edges', 'motion', 'objects']
onSpotted((count) => {
  const el = document.querySelector('[data-spotted]')
  if (el) el.textContent = n(count)
})

/** The confidence line: what the network was asked for, and what the page draws. */
function showLine(on) {
  if (lineEl) lineEl.hidden = !on
  if (!on) return
  const pct = Math.round(lensState.minScore * 100)
  if (lineInput && Number(lineInput.value) !== pct) lineInput.value = String(pct)
  if (lineOut) lineOut.textContent = `${pct}%`
}

lineInput?.addEventListener('input', () => {
  lensState.minScore = Number(lineInput.value) / 100
  showLine(true)
  say()
})

function say() {
  const [name, text] = LENS_TEXT[lens][lang()]
  let extra = ''
  // The confidence line is a control for a working detector. When detection is
  // down, offering a slider that changes nothing is worse than offering nothing.
  if (lens === 'objects') {
    showLine(!lensState.error)
    if (lensState.error) extra = `\n${t('เปิดการตรวจจับไม่ได้ ', 'Detection could not start. ')}${detectorFailureSentence(lensState.error, t)}`
    else if (modelNote) extra = `\n${modelNote}`
    else if (lensState.detectedAt) {
      const all = lensState.detections
      const above = all.filter((d) => d.score >= lensState.minScore)
      const at = Math.round(lensState.minScore * 100)
      if (above.length) {
        const counts = {}
        for (const d of above) counts[d.cls] = (counts[d.cls] ?? 0) + 1
        const list = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([c, k]) => `${cocoName(+c, lang())} ×${k}`).join(' · ')
        const below = all.length - above.length
        const tail = below ? ` · ${t(`อีก ${n(below)} กรอบอยู่ใต้เส้น`, `${n(below)} below the line`)}` : ''
        extra = `\n${t('เห็น', 'Sees')}: ${list} — ${Math.round(lensState.detectMs)} ms${tail}`
      } else {
        // The honest sentence, plus the thing that makes it a lesson instead of a
        // dead end: the network did answer, and its weaker answers are one drag away.
        extra = `\n${t(`ไม่มีอะไรที่มั่นใจ ${at}% ขึ้นไป — ซึ่งไม่ได้แปลว่าไม่มีอะไร`, `Nothing at ${at}% or more — which does not mean nothing is there`)}`
        if (all.length) extra += `\n${t(`อีก ${n(all.length)} กรอบอยู่ใต้เส้น ลากเส้นลงมาดูว่าเครื่องเดาอะไรไว้`, `${count(all.length, 'box sits below the line', 'boxes sit below the line')} — drag it down and watch the machine guess`)}`
      }
    }
  }
  if (lens === 'motion' && specimen.source?.kind === 'still') {
    extra = `\n${t('กล้องนี้ส่งภาพนิ่งทุก ~20 วินาที การเคลื่อนไหวจะเห็นเมื่อภาพถัดไปมาถึง', 'This camera sends a still every ~20 s; motion shows when the next one arrives')}`
  }
  sayEl.textContent = `${name}. ${text}${extra}`
}

// The lenses take turns on their own until the visitor touches one, and the
// lens being left behind keeps a short trail so the eye can follow what the
// machine moved on from.
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
  // Two things this branch's refactor had dropped, kept because the page makes
  // both promises: "first time only" is a claim about THIS visitor's browser, so
  // once the network has answered, switching camera or lens must not repeat the
  // download; and showLine() draws the confidence line under the objects lens —
  // without it that lens has nothing to say.
  if (lens === 'objects' && !lensState.detectedAt) {
    modelNote = modelSeen
      ? t('กำลังอ่านภาพใหม่…', 'Reading the new picture…')
      : t('กำลังโหลดโครงข่ายประสาทเทียม (18 MB ครั้งแรกเท่านั้น)…', 'Loading the neural network (18 MB, first time only)…')
  }
  showLine(lens === 'objects')
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
    if (lens === 'objects') { if (lensState.detectedAt && !lensState.error) modelSeen = true; say() }
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
  document.querySelector(`[data-lens="${name}"]`)?.click()
}
// Detection is on when the page opens. If motion is welcome, the lenses take
// turns: picture, numbers, edges, motion, objects. Any deliberate choice stops
// this for good — `sweeping` is cleared inside applyLens and never set back.
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
