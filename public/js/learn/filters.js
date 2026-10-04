// Chapters 4–6: a small window sliding over the picture, the edges that
// window can find, and what changes between one moment and the next. Still
// no learning anywhere — every number here was chosen by a person.

import { t, pct } from '../core/i18n.js'
import * as ops from '../cv/ops.js'
import { edges as edgesLens, motion as motionLens, createLensState } from '../cv/lenses.js'
import { clear, containRect } from '../cv/draw.js'
import { runBench, blit, slider, choice, parts, writer, pointIn } from './bench.js'

const WORK_WIDTH = 320

// How to turn a sum into something you can look at. Edge kernels give negative
// sums (bright-to-dark); we show their size. Emboss sits around middle gray.
const SHOW = { identity: 'clamp', blur: 'clamp', sharpen: 'clamp', edges: 'abs', vertical: 'abs', horizontal: 'abs', emboss: 'mid' }
const clamp255 = (v) => (v < 0 ? 0 : v > 255 ? 255 : v)
const shown = (v, mode) => (mode === 'abs' ? clamp255(Math.abs(v)) : mode === 'mid' ? clamp255(v + 128) : clamp255(v))
const kernelText = (v) => (Math.abs(v - 1 / 9) < 1e-9 ? '1/9' : String(v))

function cells(grid) {
  if (!grid.children.length) for (let i = 0; i < 9; i++) grid.append(document.createElement('span'))
  return [...grid.children]
}

/** 04 — Sliding a small window. Pick a kernel, tap the picture, see the nine multiplications. */
export function convolutionChapter(chapter, getSource) {
  const { canvas, readout } = parts(chapter)
  const write = writer(readout)
  const patchCells = cells(chapter.querySelector('[data-patch]'))
  const kernelCells = cells(chapter.querySelector('[data-kernel-grid]'))
  const resultEl = chapter.querySelector('[data-kresult]')
  let probe = { x: 0.5, y: 0.5 }
  let last = null // { rect, w, h } of the last paint, for mapping taps

  const showKernel = (name) => ops.KERNELS[name].forEach((v, i) => { kernelCells[i].textContent = kernelText(v) })
  const kernel = choice(chapter, 'kernel', (name) => { showKernel(name); bench.invalidate() })
  showKernel(kernel.value)

  canvas.addEventListener('click', (e) => {
    const p = pointIn(e, canvas, last?.rect)
    if (p) { probe = p; bench.invalidate() }
  })

  const bench = runBench(canvas, getSource, (ctx, src) => {
    const img = src.grab(WORK_WIDTH)
    if (!img) return
    const { width: w, height: h } = img
    const k = ops.KERNELS[kernel.value]
    const mode = SHOW[kernel.value]
    const gray = ops.toGray(img)
    const conv = ops.convolve3(gray, w, h, k)
    const display = new Float32Array(conv.length)
    for (let i = 0; i < conv.length; i++) display[i] = shown(conv[i], mode)
    const rect = containRect(w, h, canvas.width, canvas.height)
    clear(ctx)
    blit(ctx, ops.grayToRgba(display, w, h), rect, true)
    last = { rect, w, h }

    const px = Math.min(w - 2, Math.max(1, Math.round(probe.x * (w - 1))))
    const py = Math.min(h - 2, Math.max(1, Math.round(probe.y * (h - 1))))
    drawWindow(ctx, rect, w, h, px, py)
    const patch = []
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) patch.push(Math.round(gray[(py + dy) * w + px + dx]))
    patch.forEach((v, i) => { patchCells[i].textContent = String(v) })
    const sum = conv[py * w + px]
    resultEl.textContent = String(Math.round(shown(sum, mode)))
    const note = mode === 'abs'
      ? t('ผลรวมติดลบได้ (สว่างไปมืด) ภาพจึงแสดงแค่ขนาดของมัน', 'A sum can be negative (bright to dark), so the picture shows only its size')
      : mode === 'mid' ? t('บวก 128 เพื่อให้ศูนย์เป็นสีเทากลาง', 'Plus 128, so zero shows as middle gray')
        : t('ค่าที่เกิน 0–255 ถูกตัดให้อยู่ในช่วง', 'Anything outside 0–255 is clipped')
    write(`${t('ผลรวมของเก้าผลคูณ', 'Sum of the nine products')} = ${sum.toFixed(1)}\n${note}`, !src.moving)
  })
  return bench
}

/** The 3×3 window, outlined in white with a black keyline so it shows on any picture. */
function drawWindow(ctx, rect, w, h, px, py) {
  const sx = rect.w / w, sy = rect.h / h
  const x = rect.x + (px - 1) * sx, y = rect.y + (py - 1) * sy
  const dpr = ctx.canvas.width / Math.max(1, ctx.canvas.clientWidth)
  const pad = 4 * dpr
  ctx.lineWidth = 3 * dpr
  ctx.strokeStyle = '#101010'
  ctx.strokeRect(x - pad, y - pad, 3 * sx + pad * 2, 3 * sy + pad * 2)
  ctx.lineWidth = 1.5 * dpr
  ctx.strokeStyle = '#f7f5ef'
  ctx.strokeRect(x - pad, y - pad, 3 * sx + pad * 2, 3 * sy + pad * 2)
}

/** 05 — Edges. The Sobel lens with a gain slider. */
export function edgesChapter(chapter, getSource) {
  const { canvas } = parts(chapter)
  const gain = slider(chapter, 'gain', (v) => `×${v.toFixed(2)}`, () => bench.invalidate())
  const bench = runBench(canvas, getSource, (ctx, src) => {
    edgesLens(ctx, src, null, { width: WORK_WIDTH, gain: gain.value })
  })
  return bench
}

/** 06 — What moved. Frame differencing with an adjustable "how much counts as change". */
export function motionChapter(chapter, getSource) {
  const { canvas, readout } = parts(chapter)
  const write = writer(readout)
  const state = createLensState()
  const delta = slider(chapter, 'delta', (v) => `${v}`, () => bench.invalidate())
  let lastSrc = null

  const bench = runBench(canvas, getSource, (ctx, src) => {
    motionLens(ctx, src, state, { width: 192, delta: delta.value })
    lastSrc = src
    write(describeMotion(state, src), !src.moving)
  })

  // A still camera's countdown needs a clock, not new frames.
  setInterval(() => { if (lastSrc?.kind === 'still') bench.invalidate() }, 1000)

  return {
    invalidate: bench.invalidate,
    reset() { state.prevGray = null; state.prevAt = 0; state.motion = null; state.frameAt = 0 },
  }
}

const STILL_EVERY_S = 20 // matches the specimen's refresh of still cameras

function describeMotion(state, src) {
  const m = state.motion
  const found = m
    ? `${pct(m.changed, 1)} ${t('ของพิกเซลเปลี่ยน', 'of pixels changed')} · ${m.found.length} ${t('กลุ่มที่ขยับ', 'moving regions')}`
    : t('ยังไม่มีภาพก่อนหน้าให้เทียบ', 'No earlier picture to compare with yet')
  if (src.moving) return found
  if (src.kind === 'photo') return t('รูปถ่ายไม่เปลี่ยน จึงไม่มีอะไรขยับ ลองกล้องของคุณแล้วโบกมือ', 'A photo never changes, so nothing moves. Try your own camera and wave.')
  const wait = Math.max(0, STILL_EVERY_S - Math.round((Date.now() - src.frameAt) / 1000))
  return `${found}\n${t(`กล้องนี้ส่งภาพนิ่ง ภาพถัดไปในอีกราว ${wait} วินาที`, `This camera sends stills; the next arrives in about ${wait} s`)}`
}
