// Everyday: eight cases in prose, one instrument. The instrument is the first
// step two of those cases share — deciding, for every pixel, light or dark —
// run on whatever the visitor holds up to their own camera. No model, no
// download: just ops.otsu, ops.threshold and ops.blobs, small enough to read.

import '../core/site.js?v=1.11.1'
import { whenVisible } from '../core/site.js?v=1.11.1'
import { t, n, onLang } from '../core/i18n.js'
import { createSpecimen, startSpecimen, specimenBarHtml, wantsWebcam } from '../core/specimen.js?v=1.11.1'
import * as ops from '../cv/ops.js'
import { fitCanvas, paintImageData, drawBlobs, clear } from '../cv/draw.js'

const WIDTH = 320          // analysis width: a QR finder square survives, a phone keeps up
const FPS = 12
const MIN_REGION = 0.02    // a light region under 2% of the frame is not a sheet of paper
const WEAK_CONTRAST = 40   // light and dark means closer than this: a reader would struggle

const bench = document.querySelector('[data-bench]')
const canvas = bench.querySelector('[data-view]')
const stateEl = bench.querySelector('[data-state]')
const readout = bench.querySelector('[data-readout]')
const slider = bench.querySelector('[data-t]')
const sliderOut = bench.querySelector('[data-t-out]')
const autoBtn = bench.querySelector('[data-auto]')
const modeBtns = [...bench.querySelectorAll('[data-mode]')]

const barHost = bench.querySelector('[data-bar]')
barHost.innerHTML = specimenBarHtml()
const specimen = createSpecimen({ bar: barHost.querySelector('[data-specimen]') })

let mode = 'threshold'
let isAuto = true
let started = false

const pct = (x) => `${n(Math.round(x * 100))}%`

/** Mean brightness of the light and the dark pixels: how far apart the two groups are. */
function groupMeans(gray, mask) {
  let sl = 0, nl = 0, sd = 0, nd = 0
  for (let i = 0; i < gray.length; i++) {
    if (mask[i]) { sl += gray[i]; nl++ } else { sd += gray[i]; nd++ }
  }
  return { light: nl ? sl / nl : 0, dark: nd ? sd / nd : 0, share: nl / gray.length }
}

/** Light pixels as paper-white, dark as instrument-black: exactly the 0/1 the reader keeps. */
function maskImage(mask, w, h) {
  const out = new ImageData(w, h)
  for (let i = 0, p = 0; i < mask.length; i++, p += 4) {
    const v = mask[i] ? [247, 245, 239] : [16, 16, 16]
    out.data[p] = v[0]; out.data[p + 1] = v[1]; out.data[p + 2] = v[2]; out.data[p + 3] = 255
  }
  return out
}

function sayThreshold(tv, auto, m) {
  const how = isAuto ? t('อัตโนมัติ', 'auto') : t('ของคุณ', 'yours')
  let text = `${t('ค่าขีดแบ่ง', 'Threshold')} ${tv} (${how}) · ${t('Otsu จะเลือก', 'Otsu would pick')} ${auto}\n`
  text += `${t('สว่าง', 'Light')} ${pct(m.share)} · ${t('มืด', 'dark')} ${pct(1 - m.share)} · ${t('ห่างกัน', 'apart by')} ${Math.round(m.light - m.dark)} ${t('ระดับ', 'levels')}`
  if (m.light - m.dark < WEAK_CONTRAST) text += `\n${t('มืดกับสว่างใกล้กันมาก เครื่องอ่าน QR จะลำบาก', 'Light and dark are close together here — a QR reader would struggle')}`
  return text
}

function sayPage(best, w, h) {
  if (!best) return t('ไม่พบบริเวณสว่างที่ใหญ่พอ ซึ่งไม่ได้แปลว่าไม่มีกระดาษ ลองเลื่อนค่าขีดแบ่ง หรือวางกระดาษบนพื้นสีเข้ม', 'No light region big enough — which does not mean there is no paper. Try the threshold, or a dark background.')
  const cover = best.area / (w * h)
  const fill = best.area / (best.w * best.h)
  return `${t('บริเวณสว่างที่ใหญ่ที่สุด', 'Largest light region')}: ${t('กินพื้นที่', 'covers')} ${pct(cover)} ${t('ของภาพ', 'of the frame')} · ${t('เต็มกรอบ', 'fills its box')} ${pct(fill)}\n` +
    `${t('กระดาษแบนที่มองตรง ๆ เต็มกรอบเกือบ 100% — นี่คือการวัด ไม่ใช่ความมั่นใจของแบบจำลอง', 'A flat sheet seen straight on fills nearly 100% — a measurement, not a model\'s confidence')}`
}

function render(src) {
  const img = src.grab(WIDTH)
  if (!img) return
  const { width: w, height: h } = img
  const gray = ops.toGray(img)
  const auto = ops.otsu(gray)
  const tv = isAuto ? auto : Number(slider.value)
  if (isAuto) slider.value = String(auto)
  sliderOut.textContent = String(tv)
  const mask = ops.threshold(gray, tv)
  const ctx = fitCanvas(canvas)

  if (mode === 'threshold') {
    paintImageData(ctx, maskImage(mask, w, h))
    readout.textContent = sayThreshold(tv, auto, groupMeans(gray, mask))
    return
  }

  clear(ctx)
  const rect = src.drawTo(ctx, ctx.canvas.width, ctx.canvas.height)
  ctx.fillStyle = 'rgba(16,16,16,0.55)'
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h)
  const best = ops.blobs(ops.dilate(mask, w, h), w, h, Math.round(w * h * MIN_REGION))[0] ?? null
  if (best) drawBlobs(ctx, [best], rect, w, h, `${t('กระดาษ?', 'paper?')} ${Math.round((best.area / (best.w * best.h)) * 100)}%`)
  readout.textContent = sayPage(best, w, h)
}

// A small loop of our own: runLens only knows the five shared lenses.
let last = 0
let visible = true
if ('IntersectionObserver' in window) {
  new IntersectionObserver((es) => { visible = es.some((e) => e.isIntersecting) }).observe(canvas)
}
function tick(now) {
  requestAnimationFrame(tick)
  if (!visible || document.hidden || now - last < 1000 / FPS) return
  last = now
  const src = specimen.source
  if (!src?.ready) return
  try {
    render(src)
  } catch {
    readout.textContent = t('วาดภาพนี้ไม่สำเร็จ ลองกล้องหรือรูปอื่น', 'Could not process this frame — try another camera or photo')
  }
}
requestAnimationFrame(tick)

for (const b of modeBtns) {
  b.addEventListener('click', () => {
    mode = b.dataset.mode
    for (const x of modeBtns) x.setAttribute('aria-pressed', String(x === b))
  })
}
autoBtn.addEventListener('click', () => {
  isAuto = !isAuto
  autoBtn.setAttribute('aria-pressed', String(isAuto))
})
slider.addEventListener('input', () => {
  isAuto = false
  autoBtn.setAttribute('aria-pressed', 'false')
  sliderOut.textContent = slider.value
})

specimen.on((src) => { stateEl.hidden = !!src })
specimen.onError((text, kept) => { if (!kept) { stateEl.hidden = false; stateEl.textContent = text } })

function openWith(pending) {
  stateEl.textContent = t('กำลังหากล้องที่ตอบ…', 'Finding a camera that answers…')
  pending.then((src) => {
    if (!src && !specimen.source) stateEl.textContent = t('ยังไม่มีกล้องตอบ กดใช้กล้องของคุณ หรือเลือกรูป', 'No camera answered yet — use your own camera or a photo')
  })
}

function start() {
  if (started) return
  started = true
  openWith(startSpecimen(specimen))
}

// Webcam first: the big button opens the visitor's camera; a public camera is the fallback.
document.querySelector('[data-mine]')?.addEventListener('click', async () => {
  started = true
  bench.scrollIntoView({ behavior: 'smooth', block: 'start' })
  const src = await specimen.useWebcam()
  if (!src && !specimen.source) openWith(specimen.next())
})

stateEl.textContent = t('เลื่อนลงมาที่นี่ หรือกดใช้กล้องของคุณ', 'Scroll here, or use your own camera')
if (wantsWebcam()) {
  bench.scrollIntoView({ block: 'start' })
  start()
} else {
  whenVisible(bench, start)
}

onLang(() => { if (!specimen.source && !started) stateEl.textContent = t('เลื่อนลงมาที่นี่ หรือกดใช้กล้องของคุณ', 'Scroll here, or use your own camera') })
