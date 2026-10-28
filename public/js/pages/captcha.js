// The Drive gate, drawn from real camera crops.
//
// Passing shows the reveal — this click is supervised labelling — and then
// opens the room. A miss keeps the grid and the picks so a person can correct
// them; "Try a new challenge" is what deals another. The nine squares are
// buttons; the canvas only shows the photographs. There is also a way past the
// whole thing, below the grid, for anyone who would rather not answer.

import { makeChallenge, retryChallenge, check, score, TARGETS, GRID, readGate, writeGate, phrase, GATE_TEXT, taughtSentence } from '../drive/captcha.js?v=1.24.1'
import { features, train, pick } from '../drive/teach.js?v=1.24.1'

const images = new Map()
function photo(src) {
  if (typeof Image === 'undefined') return null
  let img = images.get(src)
  if (img) return img
  img = new Image()
  img.decoding = 'async'
  img.src = src
  images.set(src, img)
  return img
}

function tileRect(i, w, h) {
  const pad = 2
  const cw = (w - pad * (GRID + 1)) / GRID
  const ch = (h - pad * (GRID + 1)) / GRID
  return { x: pad + (i % GRID) * (cw + pad), y: pad + Math.floor(i / GRID) * (ch + pad), cw, ch }
}

function drawTile(g, tile, x, y, w, h) {
  g.fillStyle = '#051230'
  g.fillRect(x, y, w, h)
  const img = photo(tile.src)
  if (!img || !img.complete || !img.naturalWidth) return false
  // Contain, not cover: a cover crop cut cars off the edge of wide frames.
  const s = Math.min(w / img.naturalWidth, h / img.naturalHeight)
  const dw = img.naturalWidth * s
  const dh = img.naturalHeight * s
  g.save()
  g.beginPath()
  g.rect(x, y, w, h)
  g.clip()
  g.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
  g.restore()
  return true
}

function gridFeatures(challenge, size = 96) {
  const off = Object.assign(document.createElement('canvas'), { width: size * GRID, height: size * GRID })
  const g = off.getContext('2d', { willReadFrequently: true })
  return challenge.tiles.map((tile, i) => {
    const { x, y, cw, ch } = tileRect(i, size * GRID, size * GRID)
    drawTile(g, tile, x, y, cw, ch)
    const d = g.getImageData(Math.round(x), Math.round(y), Math.max(1, Math.round(cw)), Math.max(1, Math.round(ch)))
    return features(d.data, d.width, d.height)
  })
}

export function mountGate(root, { onEnter, lang = () => 'en', onLang, storage } = {}) {
  const canvas = root.querySelector('[data-captcha-grid]')
  if (!canvas) return null
  const g = canvas.getContext('2d')
  const picked = new Set()
  const pass = root.querySelector('[data-captcha-pass]')
  const reset = root.querySelector('[data-captcha-reset]')
  const state = root.querySelector('[data-captcha-state]')
  const targetEl = root.querySelector('[data-captcha-target]')
  const teachBtn = root.querySelector('[data-gate-teach]')
  const taughtLine = root.querySelector('[data-gate-taught]')
  const reveal = root.querySelector('[data-gate-reveal]')
  const captcha = root.querySelector('[data-captcha]')
  // The skip lives OUTSIDE the captcha block on purpose. Everything inside that
  // block is hidden when the reveal opens, so a skip placed there would vanish
  // at exactly the moment someone who has struggled with the grid needs it.
  const skip = root.querySelector('[data-gate-skip]')

  let l = lang()
  let round = 0
  let taught = null
  let result = null
  let teachRound = 0
  let challenge = makeChallenge((Date.now() % 100000) | 0, 0)

  function ask() {
    l = lang()
    if (!targetEl) return
    targetEl.innerHTML = `${phrase(l, GATE_TEXT.ask)}<b>${phrase(l, challenge.target.label)}</b>`
  }

  function showReveal() {
    captcha?.setAttribute('hidden', '')
    reveal?.removeAttribute('hidden')
    root.setAttribute('data-reveal', 'true')
  }

  function showGrid() {
    reveal?.setAttribute('hidden', '')
    captcha?.removeAttribute('hidden')
    root.removeAttribute('data-reveal')
  }

  function paint() {
    const box = canvas.getBoundingClientRect()
    if (box.width < 40 || box.height < 40) return
    const ratio = Math.min(3, window.devicePixelRatio || 1)
    const w = Math.max(1, box.width), h = Math.max(1, box.height)
    if (canvas.width !== Math.round(w * ratio)) {
      canvas.width = Math.round(w * ratio)
      canvas.height = Math.round(h * ratio)
    }
    g.setTransform(ratio, 0, 0, ratio, 0, 0)
    g.clearRect(0, 0, w, h)
    let waiting = false
    challenge.tiles.forEach((tile, i) => {
      const { x, y, cw, ch } = tileRect(i, w, h)
      const ready = drawTile(g, tile, x, y, cw, ch)
      if (!ready) waiting = true
      const button = root.querySelector(`[data-tile="${i}"]`)
      if (button) button.dataset.frame = tile.id
      if (picked.has(i)) {
        g.strokeStyle = '#eb5324'
        g.lineWidth = 4
        g.strokeRect(x + 2, y + 2, cw - 4, ch - 4)
      }
    })
    if (waiting) {
      for (const tile of challenge.tiles) {
        const img = photo(tile.src)
        if (img && !img.complete) img.addEventListener('load', paint, { once: true })
      }
    }
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

  function deal(next, note = '') {
    challenge = next
    clearSelection()
    if (state) state.textContent = note
    ask()
    paint()
  }

  function replay() {
    round++
    const nextIndex = (challenge.targetIndex + 1) % TARGETS.length
    deal(makeChallenge(((Date.now() % 100000) + round * 7919) | 0, nextIndex))
    result = null
    taughtLine.hidden = true
    teachBtn.hidden = true
    showGrid()
  }

  function teach() {
    if (!taught) return
    const model = train(taught.features.map((x, i) => ({ x, y: taught.labels.has(i) })))
    const fresh = makeChallenge(((Date.now() % 100000) + 90000 + teachRound++ * 104729) | 0, taught.targetIndex)
    const picks = pick(model, gridFeatures(fresh))
    const s = score(fresh, picks.map((t) => t.i))
    result = { s, picks: picks.length }
    renderResult()
  }

  function renderResult() {
    if (!result || !taughtLine) return
    taughtLine.textContent = taughtSentence(l, {
      picks: result.picks,
      right: result.s.right,
      missed: result.s.missed,
      extra: result.s.extra,
    })
    taughtLine.hidden = false
  }

  root.addEventListener('click', (e) => {
    const tile = e.target.closest('[data-tile]')
    if (tile && !captcha?.hasAttribute('hidden')) { select(Number(tile.dataset.tile)); return }
    if (e.target.closest('[data-gate-teach]')) { teach(); return }
    if (e.target.closest('[data-gate-enter]')) { onEnter?.(); return }
    // Skip goes straight into the room. It does NOT show the reveal, because the
    // reveal says "what you just did is supervised labelling" — and whoever skips
    // did not do it. Passing through the reveal would put a false note in front of
    // them, which is the one thing this gate must never do.
    //
    // Note on the stored value: this writes 'skipped' and then calls onEnter(),
    // which itself writes 'entered'. 'entered' is what wins, and that is correct
    // — it is the state that reopens the room on reload — but it does mean the
    // tab cannot afterwards distinguish a skip from a pass. That is a limit of
    // this design, not a claim that the gate records which door you used.
    if (e.target.closest('[data-gate-skip]')) {
      writeGate(storage, 'skipped')
      onEnter?.()
      return
    }
    if (e.target.closest('[data-captcha-pass]')) {
      const ok = check(challenge, [...picked])
      if (ok) {
        taught = { targetIndex: challenge.targetIndex, features: gridFeatures(challenge), labels: new Set(picked) }
        result = null
        if (teachBtn) teachBtn.hidden = false
        writeGate(storage, 'passed')
        showReveal()
      } else {
        // Same grid, same picks: let the person correct it rather than start over.
        if (state) state.textContent = phrase(l, GATE_TEXT.miss)
      }
    } else if (e.target.closest('[data-captcha-reset]')) {
      clearSelection()
      state.textContent = ''
      paint()
    }
  })

  const ro = new ResizeObserver(paint)
  ro.observe(canvas)
  ask()
  paint()
  pass.disabled = true
  if (readGate(storage) === 'passed') showReveal()
  onLang?.(() => { l = lang(); ask(); state.textContent = ''; renderResult() })
  return { get challenge() { return challenge }, paint, replay, showGrid }
}
