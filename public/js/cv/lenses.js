// Lenses: five ways of showing one frame, from what a person sees to what a
// trained network reports. Each lens is a function (ctx, source, state) that
// paints one view. State persists between calls (previous frame, last
// detections) so a lens can be driven by any loop.

import * as ops from './ops.js'
import { paintImageData, drawDetections, drawBlobs, drawMask, clear, NAPLES } from './draw.js'
import { detect, DETECTOR_INPUT_WIDTH } from '../ml/detector.js'

export const LENS_ORDER = ['picture', 'numbers', 'edges', 'motion', 'objects']

export const LENS_TEXT = {
  picture: {
    th: ['ภาพ', 'นี่คือสิ่งที่กล้องส่งมา สำหรับเรา มันคือถนน สำหรับคอมพิวเตอร์ ยังไม่มีความหมายอะไรเลย'],
    en: ['Picture', 'This is what the camera sends. To you it is a road. To the computer it does not mean anything yet.'],
  },
  numbers: {
    th: ['ตัวเลข', 'ภาพคือตารางช่องสี่เหลี่ยมเล็ก ๆ แต่ละช่องคือตัวเลขความสว่าง 0 (ดำ) ถึง 255 (ขาว) คอมพิวเตอร์เห็นแค่นี้'],
    en: ['Numbers', 'A picture is a grid of tiny squares. Each holds a brightness number from 0 (black) to 255 (white). This is all the computer gets.'],
  },
  edges: {
    th: ['ขอบ', 'ตรงไหนที่ตัวเลขข้างกันต่างกันมาก ตรงนั้นคือขอบ ขอบคือร่องรอยแรกของรูปร่าง'],
    en: ['Edges', 'Where neighbouring numbers differ a lot, there is an edge. Edges are the first trace of shape.'],
  },
  motion: {
    th: ['การเคลื่อนไหว', 'เอาภาพนี้ลบกับภาพก่อนหน้า ช่องที่ตัวเลขเปลี่ยนคือสิ่งที่ขยับ สีส้มคือสิ่งที่เครื่องสังเกตเห็น'],
    en: ['Motion', 'Subtract the previous frame from this one. Squares whose numbers changed are things that moved. Orange marks what the machine noticed.'],
  },
  objects: {
    th: ['สิ่งของ', 'โครงข่ายประสาทเทียมที่ฝึกจากภาพนับแสนภาพ เดาว่ามีอะไรอยู่ตรงไหน พร้อมบอกว่ามั่นใจกี่เปอร์เซ็นต์'],
    en: ['Objects', 'A neural network trained on hundreds of thousands of photos guesses what is where — and says how sure it is.'],
  },
}

export function createLensState() {
  return { prevGray: null, prevAt: 0, frameAt: 0, motion: null, detections: [], detecting: false, detectedAt: 0, detectMs: 0, error: null, minScore: 0.3 }
}

export function picture(ctx, src) {
  clear(ctx)
  return src.drawTo(ctx, ctx.canvas.width, ctx.canvas.height)
}

/** The grid of numbers. Cells get their digits once they are big enough to read. */
export function numbers(ctx, src, state, { cols = 40, values = 'luma' } = {}) {
  const img = src.grab(cols)
  if (!img) return null
  clear(ctx)
  const W = ctx.canvas.width, H = ctx.canvas.height
  const cell = Math.min(W / img.width, H / img.height)
  const ox = (W - cell * img.width) / 2, oy = (H - cell * img.height) / 2
  const dpr = W / Math.max(1, ctx.canvas.clientWidth)
  const showDigits = cell >= 20 * dpr
  const fontPx = Math.max(8, Math.floor(cell * 0.34))
  ctx.font = `${fontPx}px "JetBrains Mono", monospace`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const p = (y * img.width + x) * 4
      const r = img.data[p], g = img.data[p + 1], b = img.data[p + 2]
      const yv = Math.round(ops.luma(r, g, b))
      ctx.fillStyle = values === 'luma' ? `rgb(${yv},${yv},${yv})` : `rgb(${r},${g},${b})`
      ctx.fillRect(ox + x * cell, oy + y * cell, Math.ceil(cell), Math.ceil(cell))
      if (showDigits) {
        ctx.fillStyle = yv > 128 ? '#101010' : '#f7f5ef'
        ctx.fillText(String(yv), ox + (x + 0.5) * cell, oy + (y + 0.5) * cell)
      }
    }
  }
  ctx.textAlign = 'start'
  return { x: ox, y: oy, w: cell * img.width, h: cell * img.height, cols: img.width, rows: img.height, cell }
}

/** Edge strength as Naples-yellow light on black. */
export function edges(ctx, src, state, { width = 360, gain = 1 } = {}) {
  const img = src.grab(width)
  if (!img) return null
  const gray = ops.toGray(img)
  const { mag } = ops.sobel(gray, img.width, img.height)
  const out = new ImageData(img.width, img.height)
  const [nr, ng, nb] = [251, 230, 160]
  for (let i = 0, p = 0; i < mag.length; i++, p += 4) {
    const v = Math.min(1, (mag[i] * gain) / 255)
    out.data[p] = nr * v; out.data[p + 1] = ng * v; out.data[p + 2] = nb * v; out.data[p + 3] = 255
  }
  return paintImageData(ctx, out, { smooth: true })
}

/**
 * Frame differencing. For a still camera the "previous frame" is the last
 * relayed picture, seconds apart — so this lens says when it is waiting.
 */
export function motion(ctx, src, state, { width = 192, delta = 22, minArea = 10 } = {}) {
  const img = src.grab(width)
  if (!img) return null
  const gray = ops.toGray(img)
  const fresh = src.frameAt !== state.frameAt || src.moving
  clear(ctx)
  const rect = src.drawTo(ctx, ctx.canvas.width, ctx.canvas.height)
  ctx.fillStyle = 'rgba(16,16,16,0.55)'
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h)
  if (state.prevGray && state.prevGray.length === gray.length && fresh) {
    const mask = ops.dilate(ops.diffMask(state.prevGray, gray, delta), img.width, img.height)
    const found = ops.blobs(mask, img.width, img.height, minArea).slice(0, 24)
    let changed = 0
    for (const m of mask) changed += m
    state.motion = { mask, found, w: img.width, h: img.height, changed: changed / mask.length }
  }
  if (fresh) {
    if (src.moving) {
      // Compare with a frame ~250 ms ago, not the previous paint: at 60 fps a
      // car moves less than a pixel between paints and nothing would show.
      if (!state.prevAt || performance.now() - state.prevAt > 250) { state.prevGray = gray; state.prevAt = performance.now() }
    } else {
      state.prevGray = gray
    }
    state.frameAt = src.frameAt
  }
  if (state.motion) {
    drawMask(ctx, state.motion.mask, state.motion.w, state.motion.h, rect, 0.7)
    drawBlobs(ctx, state.motion.found, rect, state.motion.w, state.motion.h)
  }
  return rect
}

/**
 * Detector overlay. Detection runs asynchronously; the lens always paints
 * the current frame with the most recent boxes, and starts a new detection
 * when the last one has finished and the frame is new enough.
 */
export function objects(ctx, src, state, { every = 700, onResult = null } = {}) {
  clear(ctx)
  const rect = src.drawTo(ctx, ctx.canvas.width, ctx.canvas.height)
  if (!rect) return null
  const due = src.moving ? performance.now() - state.detectedAt > every : state.detectedFrame !== src.frameAt
  state.source = src
  if (!state.detecting && due) {
    state.detecting = true
    const frameAt = src.frameAt
    const from = src.canvas(DETECTOR_INPUT_WIDTH)
    const frame = document.createElement('canvas')
    frame.width = from.width
    frame.height = from.height
    frame.getContext('2d').drawImage(from, 0, 0)
    detect(frame, { minScore: state.minScore })
      .then(({ detections, ms }) => {
        if (src.closed || state.source !== src) return
        state.detections = detections
        state.detectMs = ms
        state.detectedAt = performance.now()
        state.detectedFrame = frameAt
        state.error = null
        onResult?.(detections, ms)
      })
      .catch((err) => { if (!src.closed && state.source === src) { state.error = err; state.detectedAt = performance.now() + 5000; state.detectedFrame = frameAt } })
      .finally(() => { state.detecting = false })
  }
  drawDetections(ctx, state.detections.filter((d) => d.score >= state.minScore), rect)
  return rect
}

export const LENSES = { picture, numbers, edges, motion, objects }

/**
 * Drive a lens on a canvas while it is on screen and the tab is visible.
 * Returns stop(). `fps` caps the work; stills repaint only when they change.
 */
export function runLens(canvas, getSource, getLens, { fps = 15, state = createLensState(), onFrame = null } = {}) {
  let raf = 0, last = 0, visible = true, stopped = false
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((es) => { visible = es.some((e) => e.isIntersecting) }) : null
  io?.observe(canvas)
  const tick = (now) => {
    if (stopped) return
    raf = requestAnimationFrame(tick)
    if (!visible || document.hidden || now - last < 1000 / fps) return
    last = now
    const src = getSource()
    const ctx = canvas.getContext('2d')
    if (!src?.ready) return
    try {
      fitCanvasIfNeeded(canvas)
      const lens = getLens()
      const rect = LENSES[lens.name](ctx, src, state, lens.opts ?? {})
      onFrame?.(rect, state, src)
    } catch (err) {
      state.error = err
    }
  }
  raf = requestAnimationFrame(tick)
  return { state, stop() { stopped = true; cancelAnimationFrame(raf); io?.disconnect() } }
}

function fitCanvasIfNeeded(canvas) {
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  const w = Math.max(1, Math.round(canvas.clientWidth * dpr))
  const h = Math.max(1, Math.round(canvas.clientHeight * dpr))
  const fit = canvas.width !== w || canvas.height !== h
  if (fit) { canvas.width = w; canvas.height = h }
  return { fit }
}

export { NAPLES }
