// The blink drill. The drill makes a promise on the page — "the machine gets
// this right every time" — and these tests are what keep that promise from
// quietly becoming false as the ladder is retuned.
//
//   node --test tests/blink.test.js

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { diffMask } from '../public/js/cv/ops.js'
import {
  changedShare, shade, patchRect, scoreDrill, recordTrial,
  TRIALS, SCREENS, MACHINE_THRESHOLD, PATCH,
} from '../public/js/story/blink.js'

const grey = (w, h, fill = 100) => {
  const out = new Float32Array(w * h)
  out.fill(fill)
  return out
}

test('changedShare counts exactly what diffMask marks', () => {
  const a = Float32Array.from([0, 10, 20, 30, 40, 50, 60, 70])
  const b = Float32Array.from([0, 15, 20, 21, 45, 50, 60, 71])
  for (const threshold of [1, 5, 6, 10, 20]) {
    const mask = diffMask(a, b, threshold)
    const ones = mask.reduce((s, v) => s + v, 0)
    assert.equal(changedShare(a, b, threshold), ones / a.length, `threshold ${threshold}`)
  }
})

test('changedShare is zero on an unchanged frame, and on nothing at all', () => {
  const a = grey(8, 8, 77)
  assert.equal(changedShare(a, a, MACHINE_THRESHOLD), 0)
  assert.equal(changedShare(new Float32Array(0), a, MACHINE_THRESHOLD), 0)
})

test('shade moves the rectangle and nothing outside it', () => {
  const w = 20, h = 20
  const base = grey(w, h, 100)
  const rect = { x: 5, y: 6, w: 4, h: 3 }
  const out = shade(base, w, h, rect, 20)

  assert.notEqual(out, base, 'the original frame must be left alone')
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const inside = x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h
    assert.equal(out[y * w + x], inside ? 120 : 100, `pixel ${x},${y}`)
  }
})

test('shade clamps at white and at black instead of wrapping', () => {
  const out = shade(grey(4, 4, 250), 4, 4, { x: 0, y: 0, w: 4, h: 4 }, 20)
  assert.equal(out[0], 255, 'a bright patch must not wrap to black')

  const down = shade(grey(4, 4, 4), 4, 4, { x: 0, y: 0, w: 4, h: 4 }, -20)
  assert.equal(down[0], 0, 'a dark patch must not wrap to white')
})

test('shade clips a patch that hangs off the edge instead of throwing', () => {
  const out = shade(grey(8, 8, 100), 8, 8, { x: 6, y: 6, w: 10, h: 10 }, 20)
  assert.equal(out[7 * 8 + 7], 120)
  assert.equal(out[0], 100, 'the far corner is outside the patch')
})

test('patchRect stays inside the frame and follows the given rand', () => {
  for (const [w, h] of [[192, 144], [64, 64], [16, 9]]) {
    for (const r of [0, 0.5, 0.999999]) {
      const rect = patchRect(w, h, () => r)
      assert.ok(rect.x >= 0 && rect.x + rect.w <= w, `x out of frame at ${r} (${w}x${h})`)
      assert.ok(rect.y >= 0 && rect.y + rect.h <= h, `y out of frame at ${r} (${w}x${h})`)
      assert.ok(rect.w > 0 && rect.h > 0)
    }
  }
  const a = patchRect(100, 100, () => 0.25)
  const b = patchRect(100, 100, () => 0.25)
  assert.deepEqual(a, b, 'the same rand must give the same place')
})

test('the patch covers the share of the screen the page promises', () => {
  const w = 200, h = 100
  const rect = patchRect(w, h, () => 0.5)
  const side = Math.round(Math.min(w, h) * PATCH)
  assert.equal(rect.w, side)
  assert.equal(rect.h, side)
})

test('the machine cannot miss a trial: every delta clears its own threshold', () => {
  for (const trial of TRIALS) {
    assert.ok(trial.delta >= MACHINE_THRESHOLD,
      `trial Δ${trial.delta} is below the machine's threshold ${MACHINE_THRESHOLD} — the page's claim would be false`)
  }
})

test('the machine cannot be outvoted: the flashed screen is always the loudest', () => {
  const w = 64, h = 48
  for (const trial of TRIALS) {
    for (const truth of [...Array(SCREENS).keys()]) {
      const shares = Array.from({ length: SCREENS }, (_, i) => {
        const base = grey(w, h, 100)
        if (i !== truth) return changedShare(base, base, MACHINE_THRESHOLD)
        const flashed = shade(base, w, h, patchRect(w, h, () => 0.5), trial.delta)
        return changedShare(base, flashed, MACHINE_THRESHOLD)
      })
      const best = shares.indexOf(Math.max(...shares))
      assert.equal(best, truth, `Δ${trial.delta} on screen ${truth + 1} should be the loudest`)
      assert.ok(shares[truth] > 0, 'the flashed screen must register at all')
    }
  }
})

test('the ladder gets harder, and never easier by accident', () => {
  assert.ok(TRIALS[0].practice, 'the first trial is practice and is labelled as such')
  const scored = TRIALS.slice(1)
  for (let i = 1; i < TRIALS.length; i++) {
    assert.ok(TRIALS[i].ms < TRIALS[i - 1].ms, `trial ${i} must be shorter than ${i - 1}`)
    assert.ok(TRIALS[i].delta <= TRIALS[i - 1].delta, `trial ${i} must not be louder than ${i - 1}`)
  }
  assert.ok(scored.length >= 3, 'a drill of two rounds proves nothing')
})

test('scoreDrill keeps practice out of the tally', () => {
  const rows = [
    { truth: 0, yours: 0, machine: 0, practice: true },
    { truth: 1, yours: 1, machine: 1, practice: false },
    { truth: 2, yours: 0, machine: 2, practice: false },
    { truth: 3, yours: null, machine: 3, practice: false },
  ]
  assert.deepEqual(scoreDrill(rows), { you: 1, machine: 3, rounds: 3, missed: 2 })
})

test('scoreDrill on an empty drill is zero, not NaN', () => {
  assert.deepEqual(scoreDrill([]), { you: 0, machine: 0, rounds: 0, missed: 0 })
})
// The honesty of the log depends on these, so they are pinned rather than trusted.
test('a trial records what the machine actually caught, not the right answer', () => {
  const row = recordTrial({ truth: 3, yours: 1, caught: { screen: 3, share: 0.0274 }, delta: 20, ms: 70 })
  assert.equal(row.machine, 3)
  assert.equal(row.share, 0.0274)
})

test('a trial the machine missed stays a miss — it is never backfilled with truth', () => {
  const row = recordTrial({ truth: 3, yours: 3, caught: null, delta: 20, ms: 70 })
  assert.equal(row.machine, -1, 'no catch must not become the correct screen')
  assert.equal(row.share, 0)
  assert.equal(scoreDrill([row]).machine, 0, 'and it must not score as a machine hit')
})

test('a machine catch that disagrees with the truth scores as a miss', () => {
  // The drill only ever flashes one screen, so this cannot arise from a healthy
  // run — which is exactly why it should be visible in a test.
  const row = recordTrial({ truth: 0, yours: 0, caught: { screen: 2, share: 0.01 }, delta: 18, ms: 45 })
  assert.equal(scoreDrill([row]).machine, 0)
  assert.equal(scoreDrill([row]).you, 1)
})

test('the recorded share is the one the machine measured, to full precision', () => {
  for (const share of [0.0001, 0.01234, 0.5]) {
    const row = recordTrial({ truth: 0, yours: null, caught: { screen: 0, share }, delta: 44, ms: 500 })
    assert.equal(row.share, share)
  }
})

// ── the drill as a page actually runs it ──────────────────────────────────────
//
// Everything above tests the arithmetic. These run the thing itself, because a
// drill whose six photographs are looked for inside the wrong section, whose
// frames are painted through the wrong argument, and whose last trial is never
// answered still passes every one of those tests: it simply never plays.

function el(tag = 'div', attrs = {}) {
  const node = {
    tagName: tag.toUpperCase(),
    dataset: {},
    attrs: {},
    style: {},
    children: [],
    listeners: {},
    classes: new Set(),
    textContent: '',
    hidden: false,
    disabled: false,
    classList: {
      add: (c) => node.classes.add(c),
      remove: (c) => node.classes.delete(c),
      toggle: (c, on) => (on ? node.classes.add(c) : node.classes.delete(c)),
      contains: (c) => node.classes.has(c),
    },
    setAttribute(k, v) { node.attrs[k] = v; if (k.startsWith('data-')) node.dataset[k.slice(5)] = v },
    getAttribute(k) { return node.attrs[k] },
    append(...kids) { for (const k of kids) { k.parent = node; node.children.push(k) } },
    replaceChildren(...kids) { node.children = kids; for (const k of kids) k.parent = node },
    addEventListener(type, fn) { (node.listeners[type] ??= []).push(fn) },
    removeEventListener(type, fn) { node.listeners[type] = (node.listeners[type] ?? []).filter((f) => f !== fn) },
    closest() { return null },
    querySelector(sel) { return find(node, sel) },
    querySelectorAll(sel) { return all(node, sel) },
    async fire(type, ev = {}) { for (const fn of (node.listeners[type] ?? []).slice()) await fn({ type, target: node, preventDefault() {}, ...ev }) },
  }
  return Object.assign(node, attrs)
}

function matches(node, s) {
  if (s.startsWith('.')) return node.classes.has(s.slice(1))
  if (s.startsWith('#')) return node.attrs.id === s.slice(1)
  if (s.startsWith('[')) {
    const key = s.slice(1, -1).replace(/^data-/, '').replace(/-([a-z])/g, (_, c) => c.toUpperCase())
    return node.dataset[key] !== undefined
  }
  return node.tagName === s.toUpperCase()
}
// Descendant selectors, because the drill's own lookup is '.shots [data-shot] img' —
// a rule about where things are on the page, which is precisely what it got wrong.
function matchesChain(node, parts) {
  if (!matches(node, parts[parts.length - 1])) return false
  let i = parts.length - 2
  let up = node.parent
  while (i >= 0) {
    while (up && !matches(up, parts[i])) up = up.parent
    if (!up) return false
    up = up.parent
    i--
  }
  return true
}
function all(root, selector) {
  const parts = selector.trim().split(/\s+/)
  const out = []
  const walk = (node) => {
    for (const child of node.children) {
      if (matchesChain(child, parts)) out.push(child)
      walk(child)
    }
  }
  walk(root)
  return out
}
function find(root, selector) { return all(root, selector)[0] ?? null }

/** A canvas context that records what it was handed, so a bad ImageData shows up. */
function ctxFor() {
  // Sized per request, the way a real 2D context is: the drill reads back whatever
  // rectangle it just drew, so a stub that answered 1×1 would hand the machine a
  // single pixel to stare at and it would correctly report "nothing changed".
  let filled = new Uint8ClampedArray(0)
  return {
    drawImage(img, _x, _y, w, h) { filled = new Uint8ClampedArray(Math.round(w) * Math.round(h) * 4).fill(120) },
    getImageData(_x, _y, w, h) { return { data: Uint8ClampedArray.from(filled.slice(0, w * h * 4)), width: w, height: h } },
    putImageData(img) {
      if (!(img instanceof ImageData)) throw new TypeError('putImageData needs an ImageData')
      if (!(img.data instanceof Uint8ClampedArray) || img.data.length !== img.width * img.height * 4) {
        throw new TypeError('ImageData does not match its own width and height')
      }
    },
  }
}

/** A page shaped like story.html: the photographs live ABOVE the drill, not inside it. */
function storyPage() {
  const exhibits = el('section', { classes: new Set(['exhibits']) })
  const shots = el('div', { classes: new Set(['shots']) })
  exhibits.append(shots)
  const images = []
  for (let i = 0; i < 6; i++) {
    const figure = el('figure', { dataset: { shot: `room-${i}` } })
    const img = el('img', { complete: true, naturalWidth: 320, naturalHeight: 240, decode: async () => {} })
    figure.append(img)
    shots.append(figure)
    images.push(img)
  }

  const drill = el('section', { attrs: { id: 'try' } })
  const wall = el('div', { dataset: { drillWall: '' } })
  const say = el('p', { dataset: { drillSay: '' } })
  const rows = el('tbody', { dataset: { drillRows: '' } })
  const log = el('table', { dataset: { drillLog: '' } })
  log.append(rows)
  const startBtn = el('button', { dataset: { drillStart: '' } })
  // story.html ships these two hidden; the stub has to agree or the test measures
  // a page that never existed.
  const nextBtn = el('button', { dataset: { drillNext: '' }, hidden: true })
  const againBtn = el('button', { dataset: { drillAgain: '' }, hidden: true })
  drill.append(wall, say, log, startBtn, nextBtn, againBtn)

  const body = el('body')
  body.append(exhibits, drill)
  const document = {
    body, documentElement: { dataset: { lang: 'en' } },
    listeners: {},
    createElement: (tag) => {
      const node = el(tag)
      if (tag === 'canvas') {
        node.getContext = () => { node.ctx ??= ctxFor(); return node.ctx }
      }
      return node
    },
    querySelectorAll: (s) => all(body, s),
    querySelector: (s) => find(body, s),
    addEventListener(type, fn) { (document.listeners[type] ??= []).push(fn) },
    dispatch(type, ev = {}) {
      for (const fn of (document.listeners[type] ?? [])) fn({ type, target: document.body, preventDefault() {}, ...ev })
    },
  }
  return { document, drill, wall, say, rows, startBtn, nextBtn, againBtn, images }
}

function installGlobals(doc) {
  globalThis.document = doc
  globalThis.window = { matchMedia: () => ({ matches: false }) }
  // Strict on purpose, exactly like the browser: the three-argument form takes a
  // pixel ARRAY, not the { data, width, height } wrapper grayToRgba returns. A
  // lenient stub here hides the one mistake that stops the drill painting at all.
  globalThis.ImageData ??= class ImageData {
    constructor(a, b, c) {
      if (ArrayBuffer.isView(a)) {
        if (a.length !== b * c * 4) throw new TypeError('ImageData length does not match width × height')
        this.data = a; this.width = b; this.height = c
      } else {
        if (!(typeof a === 'number' && typeof b === 'number')) throw new TypeError('ImageData needs a pixel array')
        this.width = a; this.height = b; this.data = new Uint8ClampedArray(a * b * 4)
      }
    }
  }
  const frames = []
  globalThis.requestAnimationFrame = (fn) => { frames.push(fn); return frames.length }
  globalThis.cancelAnimationFrame = () => {}
  // Run queued animation frames synchronously, one layer deep, so the paint loop
  // executes without a real 60 Hz clock.
  globalThis.__pump = (n = 3) => { for (let k = 0; k < n; k++) { const due = frames.splice(0, frames.length); for (const fn of due) fn(performance.now()) } }
  return frames
}

const settle = () => new Promise((r) => setTimeout(r, 12))

test('the drill builds its six screens from photographs that sit outside its own section', async () => {
  const page = storyPage()
  installGlobals(page.document)
  const { createDrill } = await import('../public/js/story/blink.js')
  const drill = createDrill(page.drill, { lead: () => 0, respondMs: 30 })
  assert.equal(page.images.length, 6)
  assert.notEqual(page.drill.contains?.(page.images[0]), true, 'the photographs are not inside #try')

  const running = page.startBtn.fire('click')
  await settle(); globalThis.__pump(); await settle()
  assert.equal(page.wall.children.length, 6, 'six screens must be built from the exhibits')
  for (const tile of page.wall.children) assert.equal(tile.attrs['aria-label'].startsWith('Press if you think screen'), true)
  drill.stop()
  await running.catch(() => {})
})

test('a full drill answers every trial — including the last — and the machine never misses', async () => {
  const page = storyPage()
  installGlobals(page.document)
  const { createDrill, TRIALS } = await import('../public/js/story/blink.js')
  const drill = createDrill(page.drill, { lead: () => 0, respondMs: 20 })

  const running = page.startBtn.fire('click')
  const pause = (ms) => new Promise((r) => setTimeout(r, ms))
  let answered = 0
  for (let step = 0; step < 400 && page.againBtn.hidden; step++) {
    await pause(8)
    globalThis.__pump(2)
    if (process.env.DRILL_DEBUG && (step % 25 === 0 || page.rows.children.length))  console.error(' step', step, JSON.stringify(page.say.textContent.slice(0, 60)), 'tilesOpen', page.wall.children.filter((t) => !t.disabled).length, 'nextHidden', page.nextBtn.hidden, 'rows', page.rows.children.length)
    if (page.wall.children.some((tile) => !tile.disabled)) {
      // answer with the keyboard, the way a visitor who never clicks a tile would
      page.document.dispatch('keydown', { key: String((answered % 6) + 1) })
      answered++
      await pause(8)
    } else if (!page.nextBtn.hidden) {
      await page.nextBtn.fire('click')
      await pause(8)
    }
  }
  await running
  globalThis.__pump(1)

  const written = page.rows.children.map((tr) => tr.children.map((td) => td.textContent))
  assert.equal(answered, TRIALS.length, `every trial must be answerable, answered ${answered}`)
  assert.equal(written.length, TRIALS.length, `every trial must be logged, got ${written.length} rows`)
  assert.equal(written[0][0], 'Practice')
  for (const row of written.slice(1)) assert.match(row[0], /^Trial \d+$/)
  // The machine's column is the honest one: it caught the same screen every time.
  for (const row of written) assert.equal(row[5], row[2], `machine column must name the flashed screen (${row.join(' | ')})`)
  assert.match(page.say.textContent, /You caught \d+\/4 · the machine caught 4\/4/)
  drill.stop()
})
