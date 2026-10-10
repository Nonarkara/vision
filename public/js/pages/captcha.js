// Drawing the CAPTCHA tiles, and running the gate.
//
// The tiles are not photographs and do not pretend to be. They are drawn by the
// same kind of flat, measured geometry as the room above them — which is the
// joke working in your favour: the challenge is made of the simulator, so
// passing it teaches the simulator's own vocabulary.

import { makeChallenge, check, score, GRID, TILES } from '../drive/captcha.js?v=1.11.2'
import { rng } from '../drive/rand.js?v=1.11.2'

/** One tile: a slice of street seen from a camera. Deliberately simple. */
function drawTile(g, tile, x, y, w, h, target) {
  const r = rng(tile.slot * 977 + 31)
  // Every tile must read as its own photograph. If the nine share a horizon and
  // a sky, they look like one wide picture of a single street and the question
  // becomes a trick about where the grid lines fall rather than a question
  // about what is in the picture.
  const SKIES = ['#8fa7b4', '#b0a894', '#7c8e9c', '#9fa9a4', '#a2aeb6', '#8d9aa0']
  g.fillStyle = SKIES[tile.slot % SKIES.length]
  g.fillRect(x, y, w, h)
  const horizon = y + h * (0.36 + r() * 0.14)

  // Skyline
  g.fillStyle = ['#6f7b81', '#77736a', '#68727a', '#7a8078'][tile.slot % 4]
  for (let i = 0; i < 7; i++) {
    const bw = w / 7
    const bh = h * (0.08 + r() * 0.2)
    g.fillRect(x + i * bw, horizon - bh, bw + 1, bh)
  }
  // Road
  g.fillStyle = '#4d5459'
  g.fillRect(x, horizon, w, y + h - horizon)
  // Kerb and footway, at this tile's own height
  const kerb = y + h * (0.72 + r() * 0.1)
  g.fillStyle = '#8b8f92'
  g.fillRect(x, kerb, w, y + h - kerb)
  g.fillStyle = '#a8a496'
  g.fillRect(x, kerb - h * 0.028, w, h * 0.028)
  // Lane dashes
  g.fillStyle = '#d8d6c4'
  for (let i = 0; i < 4; i++) {
    g.fillRect(x + (i * w) / 4 + w * 0.03 + r() * w * 0.05, horizon + h * 0.16, w * 0.1, h * 0.02)
  }

  const show = (k) => (tile.has && target.key === k) || tile.also.some((t) => t.key === k)

  if (show('person')) {
    const px = x + w * (0.12 + r() * 0.3), py = kerb + h * 0.02
    g.fillStyle = '#e8e3d4'
    g.fillRect(px, py - h * 0.2, w * 0.03, h * 0.2)
    g.beginPath(); g.arc(px + w * 0.015, py - h * 0.22, w * 0.022, 0, 6.3); g.fill()
  }
  if (show('bicycle')) {
    const bx = x + w * (0.3 + r() * 0.3), by = kerb
    const rr = w * 0.045
    g.strokeStyle = '#1c2226'; g.lineWidth = Math.max(2, w * 0.016)
    g.beginPath(); g.arc(bx, by - rr, rr, 0, 6.3); g.stroke()
    g.beginPath(); g.arc(bx + rr * 2.4, by - rr, rr, 0, 6.3); g.stroke()
    g.beginPath(); g.moveTo(bx, by - rr); g.lineTo(bx + rr * 1.2, by - rr * 2); g.lineTo(bx + rr * 2.4, by - rr); g.stroke()
  }
  if (show('motorcycle')) {
    const mx = x + w * (0.55 + r() * 0.25), my = kerb
    const rr = w * 0.038
    g.strokeStyle = '#1c2226'; g.lineWidth = Math.max(2, w * 0.018)
    g.beginPath(); g.arc(mx, my - rr, rr, 0, 6.3); g.stroke()
    g.beginPath(); g.arc(mx + rr * 2.6, my - rr, rr, 0, 6.3); g.stroke()
    g.fillStyle = '#39403f'
    g.fillRect(mx + rr * 0.2, my - rr * 2.9, rr * 2.2, rr * 1.1)
  }
  if (show('light')) {
    // The head is the thing being asked for, so it is the biggest thing here.
    const lx = x + w * (0.62 + r() * 0.26)
    const headY = horizon - h * 0.02
    g.fillStyle = '#22282c'
    g.fillRect(lx, headY, w * 0.022, kerb - headY)
    g.fillRect(lx - w * 0.075, headY, w * 0.097, h * 0.2)
    const lamp = ['#e8412b', '#f4c430', '#5fc46b'][(tile.slot + 1) % 3]
    for (const [i, c] of ['#e8412b', '#f4c430', '#5fc46b'].entries()) {
      g.fillStyle = c === lamp ? lamp : '#2b3135'
      g.beginPath()
      g.arc(lx + w * 0.011, headY + h * 0.035 + i * h * 0.062, w * 0.023, 0, 6.3)
      g.fill()
    }
  }
  // A frame inside each tile, so nine photographs never read as one picture.
  g.strokeStyle = 'rgba(16,16,16,.55)'
  g.lineWidth = 3
  g.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3)
}

export function mountGate(root, { onPass, lang = () => 'en', onLang } = {}) {
  const canvas = root.querySelector('[data-captcha-grid]')
  if (!canvas) return null
  const g = canvas.getContext('2d')
  const picked = new Set()
  const challenge = makeChallenge((Date.now() % 100000) | 0)

  const pass = root.querySelector('[data-captcha-pass]')
  const reset = root.querySelector('[data-captcha-reset]')
  const state = root.querySelector('[data-captcha-state]')
  const targetEl = root.querySelector('[data-captcha-target]')

  let l = lang()
  function ask() {
    l = lang()
    targetEl.innerHTML = l === 'en'
      ? `Select all squares containing <b>${challenge.target.label[1]}</b>`
      : `เลือกช่องที่มี <b>${challenge.target.label[0]}</b> ทุกช่อง`
  }
  ask()

  function paint() {
    const box = canvas.getBoundingClientRect()
    // Not laid out yet (hidden, or measured before layout): tiles would have
    // negative size. The ResizeObserver below paints again once it has a box.
    if (box.width < 40 || box.height < 40) return
    const ratio = Math.min(3, window.devicePixelRatio || 1)
    const w = Math.max(1, box.width), h = Math.max(1, box.height)
    if (canvas.width !== Math.round(w * ratio)) {
      canvas.width = Math.round(w * ratio)
      canvas.height = Math.round(h * ratio)
    }
    g.setTransform(ratio, 0, 0, ratio, 0, 0)
    g.clearRect(0, 0, w, h)
    const pad = 2
    const cw = (w - pad * (GRID + 1)) / GRID
    const ch = (h - pad * (GRID + 1)) / GRID
    challenge.tiles.forEach((tile, i) => {
      const cx = pad + (i % GRID) * (cw + pad)
      const cy = pad + Math.floor(i / GRID) * (ch + pad)
      drawTile(g, tile, cx, cy, cw, ch, challenge.target)
      if (picked.has(i)) {
        g.strokeStyle = '#f15a30'
        g.lineWidth = 4
        g.strokeRect(cx + 2, cy + 2, cw - 4, ch - 4)
      }
      g.strokeStyle = '#303030'
      g.lineWidth = 1
      g.strokeRect(cx, cy, cw, ch)
    })
  }

  function select(i) {
    if (picked.has(i)) picked.delete(i)
    else picked.add(i)
    for (const [n, b] of [...root.querySelectorAll('[data-tile]')].entries()) {
      b.setAttribute('aria-pressed', String(picked.has(Number(b.dataset.tile))))
    }
    paint()
    pass.disabled = picked.size === 0
  }

  function clearSelection() {
    picked.clear()
    for (const b of root.querySelectorAll('[data-tile]')) b.setAttribute('aria-pressed', 'false')
    pass.disabled = true
  }
  function clearPicks() {
    clearSelection()
    state.textContent = ''
    paint()
  }

  root.addEventListener('click', (e) => {
    const tile = e.target.closest('[data-tile]')
    if (tile) { select(Number(tile.dataset.tile)); return }
    if (e.target.closest('[data-captcha-pass]')) {
      const ok = check(challenge, [...picked])
      const s = score(challenge, [...picked])
      if (ok) {
        root.dispatchEvent(new CustomEvent('captcha:pass', { bubbles: true }))
        onPass?.(challenge)
      } else {
        state.textContent = l === 'en'
          ? `${s.right} of ${s.missed + s.right} right${s.extra ? `, and ${s.extra} square${s.extra > 1 ? 's' : ''} with nothing in them` : ''}. Look again.`
          : `ถูก ${s.right} จาก ${s.missed + s.right}${s.extra ? ` และเลือกเกินมา ${s.extra} ช่อง` : ''} ลองอีกครั้ง`
        clearSelection()
        paint()
      }
    } else if (e.target.closest('[data-captcha-reset]')) {
      clearPicks()
    }
  })

  const ro = new ResizeObserver(paint)
  ro.observe(canvas)
  paint()
  pass.disabled = true
  // The question is written in whichever language is showing, like everything else.
  onLang?.(() => { ask(); state.textContent = ''; paint() })
  // clearPicks is handed back so reopening a collapsed gate starts a fresh
  // challenge rather than one still wearing the squares you passed with.
  return { challenge, paint, clearPicks }
}