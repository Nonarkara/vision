// Drive: six cars on a test track, each telling you what it sees and why it
// does what it does. The simulation is in /js/drive; this file only wires it
// to the canvas, the buttons and the car cards.

import '../core/site.js'
import { lang, onLang } from '../core/i18n.js'
import { createWorld, step, DT } from '../drive/sim.js?v=1.9.1'
import { palette, fit, drawTrack, drawWorld } from '../drive/draw.js'
import { sayDecision, saySeen, speedKmh, STYLE_NAME } from '../drive/say.js'

const root = document.querySelector('[data-drive]')
const canvas = root.querySelector('[data-track]')
const ctx = canvas.getContext('2d')
const cardsEl = root.querySelector('[data-cards]')
const totalsEl = root.querySelector('[data-totals]')
const focusEl = root.querySelector('[data-focus]')
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches

const settings = { weather: 'day', people: 'few', dogs: 'few', speed: 1, layout: 'two', traffic: 6 }
let world = createWorld({ seed: Date.now() % 100000, ...settings })
let selected = 1
let showAll = false
let playing = !reduced
let bg = null      // the static track, drawn once per size
let colours = palette()
let k = 1

// ── Buttons ───────────────────────────────────────────────────────────

function press(group, value) {
  for (const b of root.querySelectorAll(`[data-set="${group}"]`)) b.setAttribute('aria-pressed', String(b.dataset.value === String(value)))
}

root.addEventListener('click', (e) => {
  const b = e.target.closest('button')
  if (!b) return
  if (b.dataset.set) {
    const { set, value } = b.dataset
    settings[set] = ['speed', 'traffic'].includes(set) ? Number(value) : value
    if (set === 'layout' || set === 'traffic') {
      if (set === 'layout' && value === 'city') { settings.traffic = 24; settings.people = 'many'; settings.dogs = 'many'; press('traffic', 24); press('people', 'many'); press('dogs', 'many') }
      resetWorld()
    } else if (set !== 'speed') world[set] = value
    press(set, value)
  } else if (b.hasAttribute('data-play')) {
    playing = !playing
    syncPlay()
  } else if (b.hasAttribute('data-reset')) {
    resetWorld()
  } else if (b.hasAttribute('data-all')) {
    showAll = !showAll
    b.setAttribute('aria-pressed', String(showAll))
  } else if (b.hasAttribute('data-blind')) {
    const car = world.cars[selected - 1]
    car.blind = !car.blind
    car.tracks.clear()
    syncFocus()
  } else if (b.dataset.car) {
    selected = Number(b.dataset.car)
    syncFocus()
  }
})

canvas.addEventListener('click', (e) => {
  const r = canvas.getBoundingClientRect()
  const scale = canvas.width / r.width
  const x = ((e.clientX - r.left) * scale) / k, y = ((e.clientY - r.top) * scale) / k
  const near = world.cars.reduce((best, c) => (Math.hypot(c.x - x, c.y - y) < Math.hypot(best.x - x, best.y - y) ? c : best))
  if (Math.hypot(near.x - x, near.y - y) < 8) { selected = near.id; syncFocus() }
})

function syncPlay() {
  const b = root.querySelector('[data-play]')
  b.setAttribute('aria-pressed', String(playing))
  b.querySelector('[data-play-label]').innerHTML = playing
    ? '<span class="th" lang="th">❚❚ หยุดชั่วคราว</span><span class="en" lang="en">❚❚ Pause</span>'
    : '<span class="th" lang="th">▶ เริ่ม</span><span class="en" lang="en">▶ Play</span>'
}

function resetWorld() {
  world = createWorld({ seed: Date.now() % 100000, ...settings })
  selected = Math.min(selected, world.cars.length); bg = null; acc = 0
  root.querySelectorAll('[data-set="people"]').forEach((b) => { b.disabled = !world.zebras.length })
  buildCards(); syncCards(); syncFocus(); render()
}

// ── Cards: one per car, the text twin of the picture ─────────────────

function buildCards() {
  cardsEl.innerHTML = world.cars.map((c) => `
    <button class="car-card" type="button" data-car="${c.id}" data-style="${c.styleName}">
      <span class="car-id num">${c.id}</span>
      <span class="car-name"><span class="th" lang="th">${STYLE_NAME[c.styleName][0]} · วง ${c.route.id}</span><span class="en" lang="en">${STYLE_NAME[c.styleName][1]} · loop ${c.route.id}</span></span>
      <span class="car-score num" data-score></span>
      <span class="car-say" data-say></span>
    </button>`).join('')
}

function syncCards() {
  const l = lang()
  for (const c of world.cars) {
    const el = cardsEl.querySelector(`[data-car="${c.id}"]`)
    el.setAttribute('aria-pressed', String(c.id === selected))
    el.classList.toggle('is-crashed', c.frozen > 0)
    el.querySelector('[data-score]').textContent = l === 'en'
      ? `${c.laps} laps · ${c.crashes} crashes caused · ${c.hitPeople} people · ${c.hitDogs} dogs hit${c.wasHit ? ` · hit by others ${c.wasHit}` : ''}`
      : `${c.laps} รอบ · ก่อเหตุชน ${c.crashes} · ชนคน ${c.hitPeople} · ชนสุนัข ${c.hitDogs}${c.wasHit ? ` · ถูกชน ${c.wasHit}` : ''}`
    el.querySelector('[data-say]').textContent = sayDecision(c, world, l)
  }
  const sum = (f) => world.cars.reduce((n, c) => n + f(c), 0)
  const mm = String(Math.floor(world.t / 60)).padStart(2, '0'), ss = String(Math.floor(world.t % 60)).padStart(2, '0')
  totalsEl.textContent = l === 'en'
    ? `${mm}:${ss} · ${sum((c) => c.laps)} laps · ${sum((c) => c.crashes)} crashes · ${sum((c) => c.hitPeople)} people hit · ${sum((c) => c.hitDogs)} dogs hit`
    : `${mm}:${ss} · ${sum((c) => c.laps)} รอบ · ชน ${sum((c) => c.crashes)} · ชนคน ${sum((c) => c.hitPeople)} · ชนสุนัข ${sum((c) => c.hitDogs)}`
}

function syncFocus() {
  const c = world.cars[selected - 1], l = lang()
  focusEl.querySelector('[data-focus-name]').textContent = l === 'en'
    ? `Car ${c.id} · ${STYLE_NAME[c.styleName][1]} · ${speedKmh(c)} km/h`
    : `รถคันที่ ${c.id} · ${STYLE_NAME[c.styleName][0]} · ${speedKmh(c)} กม./ชม.`
  focusEl.querySelector('[data-focus-sees]').textContent = saySeen(c, l)
  focusEl.querySelector('[data-focus-does]').textContent = sayDecision(c, world, l)
  const blind = focusEl.querySelector('[data-blind]')
  blind.setAttribute('aria-pressed', String(c.blind))
  blind.innerHTML = c.blind
    ? '<span class="th" lang="th">เปิดกล้องคืน</span><span class="en" lang="en">Uncover its camera</span>'
    : '<span class="th" lang="th">ปิดกล้องคันนี้</span><span class="en" lang="en">Cover this car’s camera</span>'
  cardsEl.querySelectorAll('[data-car]').forEach((el) => el.setAttribute('aria-pressed', String(Number(el.dataset.car) === selected)))
}

// ── The loop ──────────────────────────────────────────────────────────

function render() {
  k = fit(canvas)
  if (!bg || bg.width !== canvas.width) {
    colours = palette()
    bg = Object.assign(document.createElement('canvas'), { width: canvas.width, height: canvas.height })
    drawTrack(bg.getContext('2d'), k, world.track, colours)
  }
  ctx.drawImage(bg, 0, 0)
  drawWorld(ctx, k, world, colours, { selected, showAll, lang: lang() })
}

let inView = true
new IntersectionObserver(([entry]) => { inView = entry.isIntersecting }).observe(canvas)
let last = performance.now(), acc = 0, textT = 0
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000)
  last = now
  if (playing && !document.hidden && inView) {
    acc += dt * settings.speed
    while (acc >= DT) { step(world); acc -= DT }
  }
  if (!document.hidden && inView) render()
  textT += dt
  if (textT > 0.25 && !document.hidden && inView) { textT = 0; syncCards(); syncFocus() }
  requestAnimationFrame(frame)
}

new ResizeObserver(() => { bg = null }).observe(canvas)
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { bg = null })
onLang(() => { syncCards(); syncFocus() })

buildCards()
root.querySelectorAll('[data-set="people"]').forEach((b) => { b.disabled = !world.zebras.length })
syncPlay()
syncCards()
syncFocus()
requestAnimationFrame(frame)
