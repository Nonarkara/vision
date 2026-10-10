// Camera feedback: an edge outline that follows a face or a hand, a meter,
// and one "I saw you" flash. Peach Red only. The picture is never stored.

import { toGray, sobel } from './ops.js'

export const FACE_OVAL = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109]

const SIGNAL = '#f15a30'
const trails = new WeakMap()

export function motionReduced() {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Flash once when a reading rises, then wait until it drops and rises again. */
export function sawLatch(prev, score, now, { on = 0.45, off = 0.28, again = 6000 } = {}) {
  const hot = score >= on
  let { armed, last } = prev
  let flash = false
  if (score < off) armed = true
  if (hot && armed && (last === 0 || now - last >= again)) {
    flash = true
    armed = false
    last = now
  }
  return { state: { armed, last }, flash, show: hot }
}

function scale(ctx) {
  return ctx.canvas.width / Math.max(1, ctx.canvas.clientWidth)
}

/**
 * Peach Red edges inside a normalised box (0–1 of `img`), drawn into `rect`
 * (where that whole frame sits on the canvas). Returns 0–1 outline strength.
 */
export function outlineEdges(ctx, img, box, rect) {
  if (!img || !box || !rect) return 0
  const gray = toGray(img)
  const { mag } = sobel(gray, img.width, img.height)
  const x0 = Math.max(0, Math.floor(box.x * img.width))
  const y0 = Math.max(0, Math.floor(box.y * img.height))
  const x1 = Math.min(img.width, Math.ceil((box.x + box.w) * img.width))
  const y1 = Math.min(img.height, Math.ceil((box.y + box.h) * img.height))
  let max = 1
  for (let y = y0; y < y1; y += 2) {
    for (let x = x0; x < x1; x += 2) {
      const v = mag[y * img.width + x]
      if (v > max) max = v
    }
  }
  const floor = max * 0.42
  const pts = []
  for (let y = y0; y < y1; y += 2) {
    for (let x = x0; x < x1; x += 2) {
      if (mag[y * img.width + x] >= floor) pts.push(x / img.width, y / img.height)
    }
  }
  const dpr = scale(ctx)
  const draw = (points, alpha, blur) => {
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.fillStyle = SIGNAL
    ctx.shadowColor = SIGNAL
    ctx.shadowBlur = blur
    const s = Math.max(1.5, 1.6 * dpr)
    for (let i = 0; i < points.length; i += 2) {
      ctx.fillRect(rect.x + points[i] * rect.w, rect.y + points[i + 1] * rect.h, s, s)
    }
    ctx.restore()
  }
  const prev = trails.get(ctx.canvas)
  if (prev && !motionReduced()) draw(prev, 0.35, 0)
  if (!motionReduced()) trails.set(ctx.canvas, pts)
  draw(pts, 1, motionReduced() ? 0 : 8 * dpr)
  return Math.max(0, Math.min(1, max / 420))
}

/** MediaPipe face oval, in the same space the camera frame was drawn. */
export function drawFaceOval(ctx, landmarks, rect) {
  if (!landmarks || landmarks.length < 468 || !rect) return
  const dpr = scale(ctx)
  ctx.save()
  ctx.beginPath()
  FACE_OVAL.forEach((i, n) => {
    const p = landmarks[i]
    const x = rect.x + p.x * rect.w
    const y = rect.y + p.y * rect.h
    if (n === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  })
  ctx.closePath()
  ctx.strokeStyle = SIGNAL
  ctx.lineWidth = Math.max(2, 2.5 * dpr)
  ctx.lineJoin = 'round'
  ctx.shadowColor = SIGNAL
  ctx.shadowBlur = motionReduced() ? 0 : 14 * dpr
  ctx.stroke()
  ctx.restore()
}

export function faceBox(landmarks) {
  let x0 = 1, y0 = 1, x1 = 0, y1 = 0
  for (const i of FACE_OVAL) {
    const p = landmarks[i]
    if (!p) return null
    x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y)
    x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y)
  }
  const pad = 0.04
  return { x: Math.max(0, x0 - pad), y: Math.max(0, y0 - pad), w: Math.min(1, x1 - x0 + pad * 2), h: Math.min(1, y1 - y0 + pad * 2) }
}

/**
 * The largest moving region that could be a hand. `prev` is the last gray
 * frame; pass it back next time. Returns null when nothing hand-sized moved.
 */
export function handRegion(img, prev, delta = 22) {
  const gray = toGray(img)
  if (!prev || prev.length !== gray.length) return { gray, region: null, score: 0 }
  let minX = img.width, minY = img.height, maxX = 0, maxY = 0, area = 0
  for (let y = 1; y < img.height - 1; y++) {
    for (let x = 1; x < img.width - 1; x++) {
      const i = y * img.width + x
      if (Math.abs(gray[i] - prev[i]) < delta) continue
      area++
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
    }
  }
  const frame = img.width * img.height
  const frac = area / frame
  if (frac < 0.015 || frac > 0.4) return { gray, region: null, score: 0 }
  return {
    gray,
    score: Math.max(0, Math.min(1, frac / 0.12)),
    region: {
      x: minX / img.width,
      y: minY / img.height,
      w: (maxX - minX) / img.width,
      h: (maxY - minY) / img.height,
    },
  }
}

/** Meter and flash, drawn on a surface. `credit` names the model (COCO, MediaPipe). */
export function mountSaw(parent) {
  const box = document.createElement('div')
  box.className = 'saw'
  box.hidden = true
  box.innerHTML = `
    <p class="saw-read">
      <span class="th" lang="th">ความมั่นใจ</span><span class="en" lang="en">Confidence</span>
      <span class="num" data-saw-num>0%</span>
      <span class="micro" data-saw-credit></span>
    </p>
    <div class="saw-meter" aria-hidden="true"><i data-saw-fill></i></div>
    <p class="saw-flash" data-saw-flash hidden role="status">
      <span class="th" lang="th">เห็นคุณแล้ว</span><span class="en" lang="en">I saw you</span>
    </p>`
  parent.append(box)
  const fill = box.querySelector('[data-saw-fill]')
  const num = box.querySelector('[data-saw-num]')
  const credit = box.querySelector('[data-saw-credit]')
  const flash = box.querySelector('[data-saw-flash]')
  let latch = { armed: true, last: 0 }
  let hideTimer = 0
  let showing = false
  return {
    update(score, source, now = performance.now()) {
      const step = sawLatch(latch, score, now)
      latch = step.state
      showing = true
      box.hidden = false
      fill.style.width = `${Math.round(Math.max(0, Math.min(1, score)) * 100)}%`
      num.textContent = `${Math.round(score * 100)}%`
      credit.textContent = source || ''
      if (step.flash) {
        flash.hidden = false
        clearTimeout(hideTimer)
        hideTimer = setTimeout(() => { flash.hidden = true; if (!showing) box.hidden = true }, 1600)
      }
    },
    clear() {
      showing = false
      latch = { armed: true, last: latch.last }
      if (flash.hidden) box.hidden = true
    },
  }
}
