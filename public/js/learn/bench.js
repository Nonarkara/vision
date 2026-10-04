// The /learn benches share one loop. It is runLens's idea (paint only while
// the canvas is on screen and the tab is visible) opened up to any paint
// function, plus one economy: a still picture that has not changed, under
// settings that have not changed, is not painted again. Eight benches on one
// page then cost roughly what the one you are looking at costs.

import { fitCanvas } from '../cv/draw.js'

/**
 * Drive `paint(ctx, src)` on `canvas`. Returns { invalidate } — call it when a
 * slider or button changes what the picture should look like.
 */
export function runBench(canvas, getSource, paint, { fps = 12, onError = null } = {}) {
  let visible = !('IntersectionObserver' in window)
  let last = 0, painted = '', version = 0, failed = false
  if (!visible) {
    new IntersectionObserver((es) => { visible = es.some((e) => e.isIntersecting) }).observe(canvas)
  }
  const tick = (now) => {
    requestAnimationFrame(tick)
    if (!visible || document.hidden || now - last < 1000 / fps) return
    const src = getSource()
    if (!src?.ready) return
    const ctx = fitCanvas(canvas)
    const key = `${src.frameAt}|${canvas.width}|${canvas.height}|${version}`
    if (!src.moving && key === painted) return
    painted = key
    last = now
    try {
      paint(ctx, src)
    } catch (err) {
      // Say it once, not twelve times a second.
      if (!failed) (onError ?? console.error)(err)
      failed = true
    }
  }
  requestAnimationFrame(tick)
  return { invalidate() { version++ } }
}

/** Put pixels into a rectangle of a canvas, blocky unless `smooth`. */
const scratch = document.createElement('canvas')
export function blit(ctx, img, rect, smooth = false) {
  scratch.width = img.width
  scratch.height = img.height
  const data = img instanceof ImageData ? img : new ImageData(img.data, img.width, img.height)
  scratch.getContext('2d').putImageData(data, 0, 0)
  ctx.imageSmoothingEnabled = smooth
  ctx.drawImage(scratch, rect.x, rect.y, rect.w, rect.h)
  ctx.imageSmoothingEnabled = true
}

/** A slider and its <output>. `format(value)` writes the output; `onInput(value)` reacts. */
export function slider(root, name, format, onInput) {
  const input = root.querySelector(`[data-${name}]`)
  const output = root.querySelector(`[data-${name}-out]`)
  const read = () => Number(input.value)
  const show = () => { if (output) output.textContent = format(read()) }
  input.addEventListener('input', () => { show(); onInput(read()) })
  show()
  return {
    get value() { return read() },
    set(v) { input.value = String(v); show() },
    refresh: show,
  }
}

/** A row of buttons where exactly one is pressed. Returns a getter for the chosen value. */
export function choice(root, attr, onPick) {
  const buttons = [...root.querySelectorAll(`[data-${attr}]`)]
  let value = buttons.find((b) => b.getAttribute('aria-pressed') === 'true')?.dataset[attr] ?? buttons[0]?.dataset[attr]
  for (const b of buttons) {
    b.addEventListener('click', () => {
      value = b.dataset[attr]
      for (const x of buttons) x.setAttribute('aria-pressed', String(x === b))
      onPick(value)
    })
  }
  return { get value() { return value } }
}

/** Find the pieces of one chapter's bench by data attribute. */
export function parts(chapter) {
  return {
    canvas: chapter.querySelector('canvas[data-view]'),
    state: chapter.querySelector('[data-state]'),
    readout: chapter.querySelector('[data-readout]'),
  }
}

/** Where a pointer event lands, as 0–1 coordinates inside `rect` (canvas pixels), or null if outside. */
export function pointIn(event, canvas, rect) {
  if (!rect) return null
  const box = canvas.getBoundingClientRect()
  const sx = canvas.width / box.width, sy = canvas.height / box.height
  const x = ((event.clientX - box.left) * sx - rect.x) / rect.w
  const y = ((event.clientY - box.top) * sy - rect.y) / rect.h
  return x >= 0 && x <= 1 && y >= 0 && y <= 1 ? { x, y } : null
}

/**
 * A readout that does not flicker: moving pictures rewrite it at most four
 * times a second; `force` (a still picture, a changed setting) writes at once.
 */
export function writer(el) {
  let at = 0
  return (text, force = false) => {
    const now = performance.now()
    if (!el || (!force && now - at < 250) || el.textContent === text) return
    at = now
    el.textContent = text
  }
}

/** A small caption on a canvas: white on black, never Peach Red — it names a view, not a finding. */
export function tag(ctx, text, x, y) {
  const dpr = ctx.canvas.width / Math.max(1, ctx.canvas.clientWidth)
  const size = Math.round(12 * dpr), pad = Math.round(4 * dpr)
  ctx.font = `600 ${size}px "JetBrains Mono", "IBM Plex Sans Thai", monospace`
  ctx.textBaseline = 'top'
  const w = ctx.measureText(text).width + pad * 2
  ctx.fillStyle = '#101010'
  ctx.fillRect(x, y, w, size + pad * 2)
  ctx.fillStyle = '#f7f5ef'
  ctx.fillText(text, x + pad, y + pad)
}
