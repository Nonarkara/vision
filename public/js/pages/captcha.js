// Drawing the CAPTCHA tiles, and running the gate.
//
// The tiles are not photographs and do not pretend to be. They are drawn by the
// same kind of flat, measured geometry as the room above them — which is the
// joke working in your favour: the challenge is made of the simulator, so
// passing it teaches the simulator's own vocabulary.
//
// Three things this file is responsible for, all in service of that joke:
//   1. every challenge asks for one of the four COCO classes the street
//      actually contains, rotating through them on replay — the gate is not
//      forever "find the traffic light";
//   2. the tile art is seeded by the challenge, so a replay is a new street,
//      not the same nine photographs reshuffled;
//   3. when you pass, your nine labels are kept — and the "teach the machine"
//      button hands them to the tiny learner in drive/teach.js, which then
//      takes a fresh grid it has never seen. That is von Ahn's loop, closed
//      inside the tab: no upload, no dataset, just the honest size of nine
//      labels, measured in front of you.

import { makeChallenge, check, score, TARGETS, GRID, TILES } from '../drive/captcha.js?v=1.12.1'
import { rng } from '../drive/rand.js?v=1.12.1'
import { features, train, pick } from '../drive/teach.js?v=1.12.1'

/** One tile: a slice of street seen from a camera. Deliberately simple.
 *  Seeded by the challenge, so every round draws a different street. */
function drawTile(g, tile, x, y, w, h, target, seed = 1) {
  const r = rng(tile.slot * 977 + seed * 131 + 31)
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

/** The layout both painting and teaching read from — one geometry, two uses. */
function tileRect(i, w, h) {
  const pad = 2
  const cw = (w - pad * (GRID + 1)) / GRID
  const ch = (h - pad * (GRID + 1)) / GRID
  return { x: pad + (i % GRID) * (cw + pad), y: pad + Math.floor(i / GRID) * (ch + pad), cw, ch }
}

/**
 * A challenge's tiles as the learner sees them: clean pixels, no selection
 * ring, drawn offscreen at a fixed size. The same function feeds training
 * (the grid you passed) and the test (a grid you never saw), so the two can
 * never disagree about what a tile looks like.
 */
function gridFeatures(challenge, size = 96) {
  const off = Object.assign(document.createElement('canvas'), { width: size * GRID, height: size * GRID })
  const g = off.getContext('2d', { willReadFrequently: true })
  return challenge.tiles.map((tile, i) => {
    const { x, y, cw, ch } = tileRect(i, size * GRID, size * GRID)
    drawTile(g, tile, x, y, cw, ch, challenge.target, challenge.seed)
    const d = g.getImageData(Math.round(x), Math.round(y), Math.max(1, Math.round(cw)), Math.max(1, Math.round(ch)))
    return features(d.data, d.width, d.height)
  })
}

export function mountGate(root, { onPass, lang = () => 'en', onLang } = {}) {
  const canvas = root.querySelector('[data-captcha-grid]')
  if (!canvas) return null
  const g = canvas.getContext('2d')
  const picked = new Set()

  let targetIdx = 0
  let round = 0
  let challenge = makeChallenge((Date.now() % 100000) | 0, targetIdx)
  let taught = null        // { targetIdx, features, labels } — kept when you pass
  let result = null        // the last machine score, re-rendered on language change
  let teachRound = 0

  const pass = root.querySelector('[data-captcha-pass]')
  const reset = root.querySelector('[data-captcha-reset]')
  const state = root.querySelector('[data-captcha-state]')
  const targetEl = root.querySelector('[data-captcha-target]')
  const teachBtn = root.querySelector('[data-gate-teach]')
  const taughtLine = root.querySelector('[data-gate-taught]')

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
    challenge.tiles.forEach((tile, i) => {
      const { x, y, cw, ch } = tileRect(i, w, h)
      drawTile(g, tile, x, y, cw, ch, challenge.target, challenge.seed)
      if (picked.has(i)) {
        g.strokeStyle = '#f15a30'
        g.lineWidth = 4
        g.strokeRect(x + 2, y + 2, cw - 4, ch - 4)
      }
      g.strokeStyle = '#303030'
      g.lineWidth = 1
      g.strokeRect(x, y, cw, ch)
    })
  }

  function select(i) {
    if (picked.has(i)) picked.delete(i)
    else picked.add(i)
    for (const b of root.querySelectorAll('[data-tile]')) {
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

  /** Fresh street, next class: replaying is a new challenge, not a rerun. */
  function replay() {
    round++
    targetIdx = (targetIdx + 1) % TARGETS.length
    challenge = makeChallenge(((Date.now() % 100000) + round * 7919) | 0, targetIdx)
    picked.clear()
    for (const b of root.querySelectorAll('[data-tile]')) b.setAttribute('aria-pressed', 'false')
    pass.disabled = true
    state.textContent = ''
    result = null
    taughtLine.hidden = true
    teachBtn.hidden = true
    ask()
    paint()
  }

  /** The machine takes the test: train on your labels, predict a fresh grid. */
  function teach() {
    if (!taught) return
    const model = train(taught.features.map((x, i) => ({ x, y: taught.labels.has(i) })))
    const fresh = makeChallenge(((Date.now() % 100000) + 90000 + teachRound++ * 104729) | 0, taught.targetIdx)
    const picks = pick(model, gridFeatures(fresh))
    const s = score(fresh, picks.map((t) => t.i))
    result = { s, picks: picks.length, target: fresh.target, answer: fresh.answer.length }
    renderResult()
  }

  function renderResult() {
    if (!result) return
    const en = l === 'en'
    taughtLine.textContent = en
      ? `Your 9 labels taught it. On a grid it had never seen it picked ${result.picks} squares — ${result.s.right} right · ${result.s.missed} missed · ${result.s.extra} wrong.`
      : `จากฉลาก 9 ช่องของคุณ ในตารางที่มันไม่เคยเห็น มันเลือก ${result.picks} ช่อง — ถูก ${result.s.right} · พลาด ${result.s.missed} · เกิน ${result.s.extra}`
    taughtLine.hidden = false
  }

  root.addEventListener('click', (e) => {
    const tile = e.target.closest('[data-tile]')
    if (tile) { select(Number(tile.dataset.tile)); return }
    if (e.target.closest('[data-gate-teach]')) { teach(); return }
    if (e.target.closest('[data-captcha-pass]')) {
      const ok = check(challenge, [...picked])
      const s = score(challenge, [...picked])
      if (ok) {
        // The labels you just made, kept for the teach button: a passing pick
        // is exactly the ground truth, so your labels and the answer are one.
        taught = { targetIdx, features: gridFeatures(challenge), labels: new Set(picked) }
        result = null
        teachBtn.hidden = false
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
      picked.clear()
      for (const b of root.querySelectorAll('[data-tile]')) b.setAttribute('aria-pressed', 'false')
      pass.disabled = true
      state.textContent = ''
      paint()
    }
  })

  const ro = new ResizeObserver(paint)
  ro.observe(canvas)
  paint()
  pass.disabled = true
  // The question is written in whichever language is showing, like everything else.
  onLang?.(() => { l = lang(); ask(); state.textContent = ''; renderResult(); paint() })
  // replay is handed back so reopening a collapsed gate is a genuinely new
  // challenge — new street, next class — rather than the one you already passed.
  return { get challenge() { return challenge }, paint, replay }
}
