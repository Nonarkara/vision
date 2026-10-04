// Drawing what the machine sees. One rule: Peach Red marks a machine
// finding, and every finding carries its words and its number — colour is
// never the only carrier.

import { cocoName } from '../ml/labels.js'
import { lang } from '../core/i18n.js'

export const SIGNAL = '#f15a30'
export const GRAY = '#b6bfc1'
export const NAPLES = '#fbe6a0'
export const BLACK = '#101010'

/** Size a canvas to its CSS box × device pixel ratio; returns the context. */
export function fitCanvas(canvas) {
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  const w = Math.max(1, Math.round(canvas.clientWidth * dpr))
  const h = Math.max(1, Math.round(canvas.clientHeight * dpr))
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h }
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingEnabled = true
  return ctx
}

/** Where an ImageData of size (iw, ih) lands when fitted into (w, h). */
export function containRect(iw, ih, w, h) {
  const s = Math.min(w / iw, h / ih)
  return { x: (w - iw * s) / 2, y: (h - ih * s) / 2, w: iw * s, h: ih * s }
}

/** Paint an ImageData scaled into a canvas, letterboxed, crisp when enlarged. */
const scratch = typeof document !== 'undefined' ? document.createElement('canvas') : null
export function paintImageData(ctx, img, { smooth = false } = {}) {
  scratch.width = img.width
  scratch.height = img.height
  scratch.getContext('2d').putImageData(img instanceof ImageData ? img : new ImageData(img.data, img.width, img.height), 0, 0)
  const r = containRect(img.width, img.height, ctx.canvas.width, ctx.canvas.height)
  ctx.fillStyle = BLACK
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  ctx.imageSmoothingEnabled = smooth
  ctx.drawImage(scratch, r.x, r.y, r.w, r.h)
  ctx.imageSmoothingEnabled = true
  return r
}

function label(ctx, text, x, y, { fill = SIGNAL, ink = BLACK } = {}) {
  const dpr = ctx.canvas.width / Math.max(1, ctx.canvas.clientWidth)
  const size = Math.round(12 * dpr)
  ctx.font = `600 ${size}px "JetBrains Mono", "IBM Plex Sans Thai", monospace`
  const pad = Math.round(4 * dpr)
  const w = ctx.measureText(text).width + pad * 2
  const h = size + pad * 2
  const ty = y - h < 0 ? y : y - h
  ctx.fillStyle = fill
  ctx.fillRect(x, ty, w, h)
  ctx.fillStyle = ink
  ctx.textBaseline = 'top'
  ctx.fillText(text, x + pad, ty + pad)
}

/** Detector boxes (0–1 coords) over a frame drawn at `rect`. */
export function drawDetections(ctx, detections, rect, { showScore = true } = {}) {
  const dpr = ctx.canvas.width / Math.max(1, ctx.canvas.clientWidth)
  ctx.lineWidth = Math.max(2, 2 * dpr)
  ctx.strokeStyle = SIGNAL
  const l = lang()
  for (const d of detections) {
    const x = rect.x + d.x * rect.w, y = rect.y + d.y * rect.h
    const w = d.w * rect.w, h = d.h * rect.h
    ctx.strokeRect(x, y, w, h)
    const text = showScore ? `${cocoName(d.cls, l)} ${Math.round(d.score * 100)}%` : cocoName(d.cls, l)
    label(ctx, text, x, y)
  }
}

/** Motion or classical blobs, in analysis-pixel coords scaled by `sx, sy`. */
export function drawBlobs(ctx, list, rect, aw, ah, text = null) {
  const dpr = ctx.canvas.width / Math.max(1, ctx.canvas.clientWidth)
  ctx.lineWidth = Math.max(2, 2 * dpr)
  ctx.strokeStyle = SIGNAL
  for (const b of list) {
    const x = rect.x + (b.x / aw) * rect.w, y = rect.y + (b.y / ah) * rect.h
    const w = (b.w / aw) * rect.w, h = (b.h / ah) * rect.h
    ctx.strokeRect(x, y, w, h)
    if (text) label(ctx, text, x, y)
  }
}

/** Tint the pixels of a 0/1 mask in signal colour over the frame. */
export function drawMask(ctx, mask, aw, ah, rect, alpha = 0.75) {
  const img = new ImageData(aw, ah)
  for (let i = 0, p = 0; i < mask.length; i++, p += 4) {
    if (!mask[i]) continue
    img.data[p] = 241; img.data[p + 1] = 90; img.data[p + 2] = 48; img.data[p + 3] = Math.round(alpha * 255)
  }
  scratch.width = aw
  scratch.height = ah
  scratch.getContext('2d').putImageData(img, 0, 0)
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(scratch, rect.x, rect.y, rect.w, rect.h)
  ctx.imageSmoothingEnabled = true
}

export function clear(ctx) {
  ctx.fillStyle = BLACK
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
}

export { label as drawLabel }
