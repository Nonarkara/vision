// The map. No tiles, no basemap, no third party: every camera is one small
// square placed by its latitude and longitude, and Thailand's outline appears
// because that is where the cameras are. Dense where the roads are dense.
//
// Projection: equirectangular, with longitude shrunk by cos(mid-latitude) so
// a degree east is drawn about as long as it is on the ground. Good enough
// for a country this size; wrong enough that nobody should measure on it.
//
// Colour: bright Naples squares are cameras a machine here can read; gray
// ones it cannot. Peach Red is kept for the one camera you picked.

import { fitCanvas } from '../cv/draw.js'

const PAD = 16            // CSS px around the country
const PICK_RADIUS = 22    // CSS px — a fingertip, not a mouse pointer
const MAX_ZOOM = 64
const DRAG_SLOP = 5       // CSS px of movement before a tap becomes a drag

// Draw order: what the machine cannot read first, so readable cameras sit on top.
const LAYERS = [
  { k: 'off', size: 2, color: 'gray', alpha: 0.4, hollow: false },
  { k: 'view', size: 3.5, color: 'gray', alpha: 0.9, hollow: true },
  { k: 'still', size: 3, color: 'naples', alpha: 0.85, hollow: false },
  { k: 'video', size: 5.5, color: 'naples', alpha: 1, hollow: false },
]

function tokens() {
  const css = getComputedStyle(document.documentElement)
  const v = (name, fallback) => css.getPropertyValue(name).trim() || fallback
  return { ground: v('--black', '#101010'), faint: v('--black-3', '#303030'), naples: v('--naples', '#fbe6a0'), gray: v('--gray', '#b6bfc1'), signal: v('--signal', '#f15a30') }
}

function boundsOf(cams) {
  let latMin = 90, latMax = -90, lngMin = 180, lngMax = -180
  for (const c of cams) {
    if (c.lat < latMin) latMin = c.lat
    if (c.lat > latMax) latMax = c.lat
    if (c.lng < lngMin) lngMin = c.lng
    if (c.lng > lngMax) lngMax = c.lng
  }
  return { latMin, latMax, lngMin, lngMax, k: Math.cos(((latMin + latMax) / 2) * Math.PI / 180) }
}

export function createMap(canvas, { onPick = () => {}, onView = () => {} } = {}) {
  let cams = []
  let visible = new Uint8Array(0)
  let bx = new Float32Array(0), by = new Float32Array(0)
  let bounds = null
  let selected = -1
  let view = { s: 1, tx: 0, ty: 0 }
  let colors = tokens()
  let raf = 0

  /** Base positions at zoom 1, in CSS px. Recomputed only on resize. */
  function project() {
    if (!bounds) return
    const w = canvas.clientWidth, h = canvas.clientHeight
    const gw = (bounds.lngMax - bounds.lngMin) * bounds.k
    const gh = bounds.latMax - bounds.latMin
    const scale = Math.max(0.0001, Math.min((w - 2 * PAD) / gw, (h - 2 * PAD) / gh))
    const ox = (w - gw * scale) / 2, oy = (h - gh * scale) / 2
    for (let i = 0; i < cams.length; i++) {
      bx[i] = ox + (cams[i].lng - bounds.lngMin) * bounds.k * scale
      by[i] = oy + (bounds.latMax - cams[i].lat) * scale
    }
  }

  const sx = (i) => bx[i] * view.s + view.tx
  const sy = (i) => by[i] * view.s + view.ty

  function squares(ctx, test, size, hollow) {
    const half = size / 2
    ctx.beginPath()
    for (let i = 0; i < cams.length; i++) if (test(i)) ctx.rect(sx(i) - half, sy(i) - half, size, size)
    if (hollow) ctx.stroke()
    else ctx.fill()
  }

  function draw() {
    raf = 0
    const ctx = fitCanvas(canvas)
    const dpr = canvas.width / Math.max(1, canvas.clientWidth)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.globalAlpha = 1
    ctx.fillStyle = colors.ground
    ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight)
    const grow = Math.min(2.2, Math.sqrt(view.s))
    // Cameras outside the filter stay as a faint ghost, so the country keeps its shape.
    ctx.fillStyle = colors.faint
    squares(ctx, (i) => !visible[i], 2 * grow, false)
    ctx.lineWidth = 1
    for (const layer of LAYERS) {
      ctx.globalAlpha = layer.alpha
      ctx.fillStyle = ctx.strokeStyle = colors[layer.color]
      squares(ctx, (i) => visible[i] && cams[i].k === layer.k, layer.size * grow, layer.hollow)
    }
    ctx.globalAlpha = 1
    if (selected >= 0) drawSelected(ctx)
  }

  function drawSelected(ctx) {
    const x = sx(selected), y = sy(selected)
    ctx.strokeStyle = ctx.fillStyle = colors.signal
    ctx.lineWidth = 2
    ctx.strokeRect(x - 9, y - 9, 18, 18)
    ctx.fillRect(x - 3, y - 3, 6, 6)
    ctx.beginPath()
    ctx.moveTo(x - 20, y); ctx.lineTo(x - 11, y)
    ctx.moveTo(x + 11, y); ctx.lineTo(x + 20, y)
    ctx.moveTo(x, y - 20); ctx.lineTo(x, y - 11)
    ctx.moveTo(x, y + 11); ctx.lineTo(x, y + 20)
    ctx.stroke()
  }

  const redraw = () => { raf ||= requestAnimationFrame(draw) }

  function nearest(x, y) {
    let best = -1, bestD = PICK_RADIUS * PICK_RADIUS
    for (let i = 0; i < cams.length; i++) {
      if (!visible[i]) continue
      const dx = sx(i) - x, dy = sy(i) - y
      const d = dx * dx + dy * dy
      // Ties go to the camera a machine can read: that is the one worth picking.
      if (d < bestD || (d === bestD && cams[i].k === 'video')) { bestD = d; best = i }
    }
    return best
  }

  function setView(next) {
    const s = Math.min(MAX_ZOOM, Math.max(1, next.s))
    view = s === 1 ? { s: 1, tx: 0, ty: 0 } : { s, tx: next.tx, ty: next.ty }
    // Only claim touch gestures once zoomed in; at full country the page should scroll.
    canvas.style.touchAction = view.s > 1 ? 'none' : 'pan-y'
    onView(view)
    redraw()
  }

  function zoomAt(x, y, factor) {
    const s = Math.min(MAX_ZOOM, Math.max(1, view.s * factor))
    const f = s / view.s
    setView({ s, tx: x - (x - view.tx) * f, ty: y - (y - view.ty) * f })
  }

  const local = (e) => {
    const r = canvas.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  let drag = null
  canvas.addEventListener('pointerdown', (e) => {
    drag = { ...local(e), tx: view.tx, ty: view.ty, moved: false }
    canvas.setPointerCapture?.(e.pointerId)
  })
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return
    const p = local(e)
    const dx = p.x - drag.x, dy = p.y - drag.y
    if (!drag.moved && Math.hypot(dx, dy) > DRAG_SLOP) drag.moved = true
    if (drag.moved && view.s > 1) setView({ s: view.s, tx: drag.tx + dx, ty: drag.ty + dy })
  })
  canvas.addEventListener('pointerup', (e) => {
    if (drag && !drag.moved) {
      const p = local(e)
      const i = nearest(p.x, p.y)
      select(i)
      onPick(i >= 0 ? cams[i] : null)
    }
    drag = null
  })
  canvas.addEventListener('pointercancel', () => { drag = null })
  canvas.addEventListener('dblclick', (e) => { const p = local(e); zoomAt(p.x, p.y, 2) })

  if ('ResizeObserver' in window) new ResizeObserver(() => { project(); redraw() }).observe(canvas)
  else window.addEventListener('resize', () => { project(); redraw() })
  // Dark mode swaps the tokens; the map follows.
  window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', () => { colors = tokens(); redraw() })

  function select(i) {
    selected = i
    redraw()
  }

  return {
    setCameras(list) {
      cams = list
      visible = new Uint8Array(list.length).fill(1)
      bx = new Float32Array(list.length)
      by = new Float32Array(list.length)
      bounds = boundsOf(list)
      project()
      redraw()
    },
    setFilter(test) {
      for (let i = 0; i < cams.length; i++) visible[i] = test(cams[i]) ? 1 : 0
      redraw()
    },
    /** Highlight a camera; when zoomed in, bring it to the middle. */
    show(cam) {
      const i = cam ? cams.indexOf(cam) : -1
      select(i)
      if (i >= 0 && view.s > 1) setView({ s: view.s, tx: canvas.clientWidth / 2 - bx[i] * view.s, ty: canvas.clientHeight / 2 - by[i] * view.s })
    },
    zoom(factor) { zoomAt(canvas.clientWidth / 2, canvas.clientHeight / 2, factor) },
    reset() { setView({ s: 1, tx: 0, ty: 0 }) },
    get zoomLevel() { return view.s },
  }
}
