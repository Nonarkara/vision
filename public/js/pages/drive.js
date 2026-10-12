// Drive: six cars on a test track, each telling you what it sees and why it
// does what it does. The simulation is in /js/drive; this file only wires it
// to the canvas, the buttons and the car cards.

import '../core/site.js?v=1.16.0'
import { lang, onLang } from '../core/i18n.js'
import { mountGate } from './captcha.js?v=1.16.0'
import { createWorld, step, DT } from '../drive/sim.js?v=1.16.0'
import { drawWindshield } from '../drive/perspective.js?v=1.16.0'
import { sightRange } from '../drive/perceive.js?v=1.16.0'
import { palette, fit, drawTrack, drawWorld } from '../drive/draw.js?v=1.16.0'
import { sayDecision, saySeen, sayUnnamed, speedKmh, STYLE_NAME } from '../drive/say.js?v=1.16.0'

const root = document.querySelector('[data-drive]')
const canvas = root.querySelector('[data-track]')
const ctx = canvas.getContext('2d')

// ── The labelling card ────────────────────────────────────────────────
// The road is already open. The nine-square challenge is an optional lesson
// in the drawer below the track. Passing it collapses the card to a receipt.
const gateEl = document.querySelector('[data-gate]')
const replay = gateEl?.querySelector('[data-gate-replay]')
let through = true
root.hidden = false
root.removeAttribute('aria-hidden')
function openRoom() {
  through = true
  root.hidden = false
  root.removeAttribute('aria-hidden')
  gateEl?.setAttribute('data-open', 'true')
  replay?.setAttribute('aria-expanded', 'false')
}
// The gate is a lesson, never a lock: if it fails to draw, the room opens.
let gate = null
try {
  gate = mountGate(gateEl, { onPass: openRoom, lang, onLang })
} catch {
  openRoom()
}
gateEl?.querySelector('[data-gate-skip]')?.addEventListener('click', openRoom)
// The gate collapses to a receipt once you are through. Reopening it does NOT
// re-lock the room — the lesson has already been had, and taking the road away
// again would be a punishment for looking back.
replay?.addEventListener('click', () => {
  gateEl.removeAttribute('data-open')
  replay.setAttribute('aria-expanded', 'true')
  gate?.replay()
})
// Someone who arrived with the room already open (a deep link from a "try this"
// experiment) should not meet a wall they did not ask for.
if (new URLSearchParams(location.search).has('go')) openRoom()
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
    syncFocus(); openDriver()
  }
})

// "Try this": each experiment sets its own track, sky and car, then scrolls up to watch.
const TRIES = {
  night: { set: { weather: 'night' }, car: 3 },
  blind: { set: { weather: 'day' }, car: 1, blind: true },
  dogs: { set: { weather: 'day', dogs: 'many' }, car: 1 },
  laps: { set: { weather: 'day', people: 'many', speed: 3 }, car: 3 },
}

document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-try]')
  const plan = b && TRIES[b.dataset.try]
  if (!plan) return
  Object.assign(settings, { layout: 'practice', traffic: 6, people: 'few', dogs: 'few', speed: 1 }, plan.set)
  for (const key of ['layout', 'traffic', 'people', 'dogs', 'speed', 'weather']) press(key, settings[key])
  resetWorld()
  selected = plan.car
  if (plan.blind) world.cars[selected - 1].blind = true
  playing = true
  syncPlay(); syncFocus()
  root.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
})

canvas.addEventListener('click', (e) => {
  const r = canvas.getBoundingClientRect()
  const scale = canvas.width / r.width
  const x = ((e.clientX - r.left) * scale) / k, y = ((e.clientY - r.top) * scale) / k
  const near = world.cars.reduce((best, c) => (Math.hypot(c.x - x, c.y - y) < Math.hypot(best.x - x, best.y - y) ? c : best))
  if (Math.hypot(near.x - x, near.y - y) < 8) { selected = near.id; syncFocus(); openDriver() }
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
  const unnamed = sayUnnamed(c, world, l)
  const unnamedRow = focusEl.querySelector('[data-focus-unnamed-row]')
  // Hide the whole row, label and all: a "Cannot name" heading with nothing
  // under it reads as a broken readout, not as "nothing to report right now".
  unnamedRow.querySelector('[data-focus-unnamed]').textContent = unnamed
  unnamedRow.hidden = !unnamed
  focusEl.querySelector('[data-focus-does]').textContent = sayDecision(c, world, l)
  const blind = focusEl.querySelector('[data-blind]')
  blind.setAttribute('aria-pressed', String(c.blind))
  blind.innerHTML = c.blind
    ? '<span class="th" lang="th">เปิดกล้องคืน</span><span class="en" lang="en">Uncover its camera</span>'
    : '<span class="th" lang="th">ปิดกล้องคันนี้</span><span class="en" lang="en">Cover this car’s camera</span>'
  cardsEl.querySelectorAll('[data-car]').forEach((el) => el.setAttribute('aria-pressed', String(Number(el.dataset.car) === selected)))
}

const dialog = document.querySelector('[data-driver-dialog]')
const windshield = dialog.querySelector('[data-windshield]')
const wg = windshield.getContext('2d')
function openDriver() { if (!dialog.open) dialog.showModal(); paintDriver() }
root.querySelector('[data-driver-open]').addEventListener('click', openDriver)
dialog.querySelector('[data-driver-close]').addEventListener('click', () => dialog.close())
dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close() })
for (const [sel, delta] of [['prev', -1], ['next', 1]]) dialog.querySelector(`[data-driver-${sel}]`).addEventListener('click', () => { selected = (selected - 1 + delta + world.cars.length) % world.cars.length + 1; syncFocus(); paintDriver() })
dialog.querySelector('[data-driver-pause]').addEventListener('click', () => { playing = !playing; syncPlay(); paintDriver() })
dialog.querySelector('[data-driver-blind]').addEventListener('click', () => root.querySelector('[data-blind]').click())
dialog.querySelector('[data-driver-weather]').addEventListener('click', () => { const skies = ['day','rain','night','sun']; settings.weather = world.weather = skies[(skies.indexOf(world.weather)+1)%skies.length]; press('weather',world.weather) })
let driverFrameAt = 0, driverTextAt = 0
function paintDriver() {
  if (!dialog.open) return
  const now = performance.now()
  if (now - driverFrameAt < 33) return
  driverFrameAt = now
  const c = world.cars[selected-1], en = lang()==='en', d = c.decision
  const w = Math.max(1, windshield.clientWidth), h = windshield.clientHeight, ratio=Math.min(3,devicePixelRatio||1)
  if(windshield.width!==Math.round(w*ratio)||windshield.height!==Math.round(h*ratio)){windshield.width=Math.round(w*ratio);windshield.height=Math.round(h*ratio)}
  wg.setTransform(ratio,0,0,ratio,0,0); drawWindshield(wg,c,world,w,h,lang())
  if (now - driverTextAt < 250) return
  driverTextAt = now
  dialog.querySelector('[data-driver-title]').textContent = en ? `Car ${c.id} · ${STYLE_NAME[c.styleName][1]}` : `รถ ${c.id} · ${STYLE_NAME[c.styleName][0]}`
  dialog.querySelector('[data-driver-speed]').textContent = `${speedKmh(c)} ${en?'km/h':'กม./ชม.'} · ${en?'view':'มองเห็น'} ${Math.round(sightRange(c,world.weather))} m · ${({day:en?'Day':'กลางวัน',rain:en?'Rain':'ฝน',night:en?'Night':'กลางคืน',sun:en?'Sun glare':'แดดจ้า'})[world.weather]} ${playing?'':'⏸'}`
  dialog.querySelector('[data-driver-action]').textContent=sayDecision(c,world,lang())
  const gap=d.dist==null?(en?'No stopping obstacle selected':'ยังไม่มีอุปสรรคที่ต้องหยุด'):`${en?'Gap to obstacle':'ระยะถึงอุปสรรค'} ${d.dist.toFixed(1)} m`
  dialog.querySelector('[data-driver-math]').textContent=`${gap} · ${en?'preferred gap':'ระยะที่ต้องการ'} ${(d.desiredGap??0).toFixed(1)} m · ${en?'speed change':'ปรับความเร็ว'} ${(d.acc*3.6).toFixed(1)} ${en?'km/h each second':'กม./ชม. ต่อวินาที'}\n${en?'Speed comes from distance, closing speed and a safety gap. The strongest braking request wins.':'คำนวณจากระยะ ความเร็วที่เข้าใกล้ และระยะปลอดภัย เลือกคำขอเบรกที่ระวังที่สุด'}`
}

// ── The loop ──────────────────────────────────────────────────────────

function render(lead) {
  k = fit(canvas)
  if (!bg || bg.width !== canvas.width || bg._weather !== world.weather) {
    colours = palette()
    bg = Object.assign(document.createElement('canvas'), { width: canvas.width, height: canvas.height })
    bg._weather = world.weather
    drawTrack(bg.getContext('2d'), k, world.track, colours, world.street, world.weather)
  }
  ctx.drawImage(bg, 0, 0)
  drawWorld(ctx, k, world, colours, { selected, showAll, lang: lang(), lead: reduced ? 0 : lead, reduced, now: performance.now() })
}

let inView = true
new IntersectionObserver(([entry]) => { inView = entry.isIntersecting }).observe(canvas)
let last = performance.now(), acc = 0, textT = 0
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000)
  last = now
  if (playing && !document.hidden && (inView || dialog.open)) {
    acc += dt * settings.speed
    while (acc >= DT) { step(world); acc -= DT }
  }
  if (!document.hidden && (inView || dialog.open)) {
    // Behind the gate the canvas has no width yet; drawing at scale 0 is wasted
    // work and can leave a zero-sized backing store the first time it appears.
    if (inView && canvas.clientWidth) render(playing ? acc : 0)
    paintDriver()
  }
  textT += dt
  if (textT > 0.25 && !document.hidden && (inView || dialog.open)) { textT = 0; syncCards(); syncFocus() }
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
