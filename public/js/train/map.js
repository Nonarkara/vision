// The map: 1,280 numbers per example squeezed to 2 (principal component
// analysis), so a person can see whether the classes form separate clouds.
// The live frame is the signal-coloured ring; thin lines run to the examples
// the nearest-neighbour learner is listening to right now.
//
// It is a shadow of the real thing. Two points close in 1,280 dimensions can
// land apart here, and the page says so under the picture.

import { pca2 } from '../ml/learner.js'
import { fitCanvas, clear, SIGNAL, NAPLES, GRAY, BLACK } from '../cv/draw.js'
import { t } from '../core/i18n.js'

const WHITE = '#f7f5ef'
const CLASS_INK = [NAPLES, GRAY, WHITE, NAPLES]

export function createMap(canvas) {
  let set = []
  let proj = null
  let bounds = null
  let live = null

  /** set: [{x, y}] — the same array (same order) the kNN learner sees. */
  function rebuild(nextSet) {
    set = nextSet
    proj = set.length >= 3 ? pca2(set.map((s) => s.x)) : null
    bounds = proj ? boxOf(proj.points) : null
    draw()
  }

  function setLive(x, neighbours = []) {
    live = x && proj ? { p: proj.project(x), neighbours } : null
    draw()
  }

  function boxOf(points) {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity
    for (const [x, y] of points) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y) }
    const mx = (x1 - x0) * 0.15 || 0.1, my = (y1 - y0) * 0.15 || 0.1
    return { x0: x0 - mx, x1: x1 + mx, y0: y0 - my, y1: y1 + my }
  }

  function draw() {
    const ctx = fitCanvas(canvas)
    clear(ctx)
    const W = canvas.width, H = canvas.height
    const dpr = W / Math.max(1, canvas.clientWidth)
    ctx.font = `${Math.round(11 * dpr)}px "JetBrains Mono", "IBM Plex Sans Thai", monospace`
    ctx.textBaseline = 'top'
    if (!proj) {
      ctx.fillStyle = GRAY
      ctx.textAlign = 'center'
      ctx.fillText(t('ต้องมีตัวอย่างอย่างน้อย 3 ภาพจึงจะวาดแผนที่ได้', 'The map needs at least 3 examples'), W / 2, H / 2)
      ctx.textAlign = 'left'
      return
    }
    const pad = 24 * dpr
    const sx = (v) => pad + ((v - bounds.x0) / (bounds.x1 - bounds.x0)) * (W - pad * 2)
    const sy = (v) => H - pad - ((v - bounds.y0) / (bounds.y1 - bounds.y0)) * (H - pad * 2)
    const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

    ctx.fillStyle = GRAY
    ctx.fillText(t('ทิศที่ 1 → (ตัวอย่างต่างกันมากที่สุด)', 'direction 1 → (where examples differ most)'), pad, H - pad + 6 * dpr)

    const lx = live ? clamp(sx(live.p[0]), pad, W - pad) : 0
    const ly = live ? clamp(sy(live.p[1]), pad, H - pad) : 0
    if (live) {
      ctx.strokeStyle = GRAY
      ctx.lineWidth = dpr
      for (const nb of live.neighbours) {
        const pt = proj.points[nb.i]
        if (!pt) continue
        ctx.beginPath()
        ctx.moveTo(lx, ly)
        ctx.lineTo(sx(pt[0]), sy(pt[1]))
        ctx.stroke()
      }
    }

    const r = 5 * dpr
    proj.points.forEach(([px, py], i) => glyph(ctx, set[i].y, sx(px), sy(py), r))

    if (live) {
      ctx.strokeStyle = SIGNAL
      ctx.lineWidth = 3 * dpr
      ctx.beginPath()
      ctx.arc(lx, ly, r * 2.2, 0, Math.PI * 2)
      ctx.stroke()
      const text = t('ตอนนี้', 'now')
      const tw = ctx.measureText(text).width + 8 * dpr
      ctx.fillStyle = SIGNAL
      ctx.fillRect(lx + r * 2.6, ly - 9 * dpr, tw, 18 * dpr)
      ctx.fillStyle = BLACK
      ctx.textBaseline = 'middle'
      ctx.fillText(text, lx + r * 2.6 + 4 * dpr, ly)
    }
  }

  return { rebuild, setLive, draw }
}

/** One example, drawn as its class's shape (● ■ ▲ ✕). */
function glyph(ctx, y, x, cy, r) {
  ctx.fillStyle = CLASS_INK[y]
  ctx.strokeStyle = CLASS_INK[y]
  ctx.lineWidth = r * 0.6
  ctx.beginPath()
  if (y === 0) { ctx.arc(x, cy, r, 0, Math.PI * 2); ctx.fill() }
  else if (y === 1) ctx.fillRect(x - r, cy - r, r * 2, r * 2)
  else if (y === 2) { ctx.moveTo(x, cy - r * 1.2); ctx.lineTo(x + r * 1.1, cy + r * 0.9); ctx.lineTo(x - r * 1.1, cy + r * 0.9); ctx.closePath(); ctx.fill() }
  else { ctx.moveTo(x - r, cy - r); ctx.lineTo(x + r, cy + r); ctx.moveTo(x + r, cy - r); ctx.lineTo(x - r, cy + r); ctx.stroke() }
}
