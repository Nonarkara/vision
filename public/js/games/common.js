// What the three games share: freezing a moment, painting it, the grey
// "almost saw it" boxes, a polite hunt for a frame with something in it,
// model-loading progress, and a best score that survives a reload when the
// browser allows it (and quietly doesn't when it won't).

import { fitCanvas, containRect, clear, drawLabel, GRAY, BLACK } from '../cv/draw.js'
import { detect, loadDetector, DETECTOR_INPUT_WIDTH } from '../ml/detector.js'
import { cocoName } from '../ml/labels.js'
import { createSpecimen } from '../core/specimen.js?v=1.11.0'
import { t, bi, lang, onLang } from '../core/i18n.js'
import { sleep } from '../core/site.js?v=1.11.0'

// Low enough that "almost" boxes exist to be shown; every game filters upward.
export const FLOOR_SCORE = 0.15
const HUNT_PAUSE_MS = 1500

/** A copy of the source's current frame, `w` wide. The source's own canvas is reused, so copy it. */
export function freeze(src, w = DETECTOR_INPUT_WIDTH) {
  const from = src.canvas(w)
  const out = document.createElement('canvas')
  out.width = from.width
  out.height = from.height
  out.getContext('2d').drawImage(from, 0, 0)
  return out
}

/** Paint an image or canvas into a bench canvas, letterboxed. Returns { ctx, rect }. */
export function paint(canvas, image, { smooth = true } = {}) {
  const ctx = fitCanvas(canvas)
  clear(ctx)
  const rect = containRect(image.width, image.height, canvas.width, canvas.height)
  ctx.imageSmoothingEnabled = smooth
  ctx.drawImage(image, rect.x, rect.y, rect.w, rect.h)
  ctx.imageSmoothingEnabled = true
  return { ctx, rect }
}

/**
 * Boxes the machine scored below the threshold, in grey and dashed: things it
 * half-saw and decided not to report. Grey is the colour of "unsure" here.
 */
export function drawUnsure(ctx, detections, rect) {
  const dpr = ctx.canvas.width / Math.max(1, ctx.canvas.clientWidth)
  ctx.save()
  ctx.lineWidth = Math.max(1, 1.5 * dpr)
  ctx.strokeStyle = GRAY
  ctx.setLineDash([6 * dpr, 4 * dpr])
  for (const d of detections) ctx.strokeRect(rect.x + d.x * rect.w, rect.y + d.y * rect.h, d.w * rect.w, d.h * rect.h)
  ctx.restore()
  for (const d of detections) {
    drawLabel(ctx, `${cocoName(d.cls, lang())} ${Math.round(d.score * 100)}%`, rect.x + d.x * rect.w, rect.y + d.y * rect.h, { fill: GRAY, ink: BLACK })
  }
}

/** "car 81% · person 44%" — every name with its number. */
export function sayDetections(list) {
  return [...list].sort((a, b) => b.score - a.score).map((d) => `${cocoName(d.cls, lang())} ${Math.round(d.score * 100)}%`).join(' · ')
}

/** Both-language class name as markup, for buttons that should survive a language switch. */
export function biClass(cls) {
  return bi(cocoName(cls, 'th'), cocoName(cls, 'en'))
}

/** Load the detector, reporting progress through `say`. Throws with a readable message. */
export async function readyDetector(say) {
  const onProgress = (e) => {
    if (e.detail.name !== 'detector' || e.detail.done) return
    say(`${t('กำลังโหลดโครงข่ายประสาทเทียม (ครั้งแรกประมาณ 18 MB)', 'Loading the neural network (about 18 MB the first time)')} ${Math.round(e.detail.p * 100)}%`)
  }
  document.addEventListener('modelprogress', onProgress)
  say(t('กำลังโหลดโครงข่ายประสาทเทียม…', 'Loading the neural network…'))
  try {
    await loadDetector()
  } catch {
    throw new Error(t('โหลดโครงข่ายประสาทเทียมไม่สำเร็จ ลองโหลดหน้าใหม่', 'The neural network did not load — try reloading the page'))
  } finally {
    document.removeEventListener('modelprogress', onProgress)
  }
}

const isPublic = (src) => src?.kind === 'still' || src?.kind === 'video'

/**
 * Freeze a frame and run the detector on it. On a public camera, if nothing
 * `wanted` scores at least `minScore`, move to another camera — one at a
 * time, with a pause, at most `tries` cameras, because each one belongs to
 * someone. The visitor's own camera or photo is used as it is.
 */
export async function huntFrame(specimen, { wanted = () => true, minScore = 0.4, tries = 4, say = () => {} } = {}) {
  let last = null
  for (let i = 0; i < tries; i++) {
    const src = specimen.source
    if (!src?.ready) break
    const frame = freeze(src)
    const { detections } = await detect(frame, { minScore: FLOOR_SCORE })
    last = { frame, detections, src }
    if (!isPublic(src) || detections.some((d) => wanted(d) && d.score >= minScore)) return last
    if (i === tries - 1) break
    say(t('ภาพนี้เครื่องไม่เห็นอะไร กำลังลองกล้องตัวอื่น…', 'The machine sees nothing here — trying another camera…'))
    await sleep(HUNT_PAUSE_MS)
    if (!(await specimen.next())) break
  }
  return last
}

/** A specimen for one bench. The "no camera yet" line survives a language switch. */
export function benchSpecimen(bar, opts = {}) {
  const specimen = createSpecimen({ bar, refreshStills: false, ...opts })
  const nameEl = bar.querySelector('[data-specimen-name]')
  const idle = nameEl?.innerHTML ?? ''
  onLang(() => { if (!specimen.source && nameEl && !nameEl.textContent.trim()) nameEl.innerHTML = idle })
  return specimen
}

export function readBest(key) {
  try {
    const v = Number(localStorage.getItem(key))
    return Number.isFinite(v) && v > 0 ? v : 0
  } catch { return 0 }
}

export function writeBest(key, value) {
  try { localStorage.setItem(key, String(value)) } catch { /* private mode: the best lasts this visit */ }
}

export { shuffle } from '../core/catalog.js'
