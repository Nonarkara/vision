import { queues } from '../drive/control.js?v=1.27.0'
// Drive: six cars on a test track, each telling you what it sees and why it
// does what it does. The simulation is in /js/drive; this file only wires it
// to the canvas, the buttons and the car cards.

import '../core/site.js?v=1.27.0'
import { lang, count, onLang } from '../core/i18n.js?v=1.27.0'
import { mountGate } from './captcha.js?v=1.27.0'
import { writeGate } from '../drive/captcha.js?v=1.27.0'
import { createWorld, step, DT } from '../drive/sim.js?v=1.27.0'
import { drawWindshield } from '../drive/perspective.js?v=1.27.0'
import { sightRange } from '../drive/perceive.js?v=1.27.0'
import { palette, fit, drawTrack, drawWorld } from '../drive/draw.js?v=1.27.0'
import { sayDecision, saySeen, sayUnnamed, speedKmh, STYLE_NAME } from '../drive/say.js?v=1.27.0'

const root = document.querySelector('[data-drive]')
const canvas = root.querySelector('[data-track]')
const ctx = canvas.getContext('2d')
const hero = root.querySelector('[data-hero]')
const hg = hero.getContext('2d')
const heroName = root.querySelector('[data-hero-name]')

// ── The gate ──────────────────────────────────────────────────────────
// The road opens immediately. Image labelling remains an optional exercise.
const gateEl = document.querySelector('[data-gate]')
const replay = gateEl?.querySelector('[data-gate-replay]')
let through = false
function openRoom() {
  if (through) return
  through = true
  root.hidden = false
  root.removeAttribute('aria-hidden')
  gateEl?.setAttribute('data-open', 'true')
  // data-through is separate and permanent. data-open only means "the gate is
  // collapsed", and "Try a new challenge" deliberately takes it away again so
  // the grid can come back. If the way out were hung off data-open alone, a
  // visitor who came back for another grid would find the skip button
  // reappeared — pointing at a room that is already open, and doing nothing
  // when pressed, because openRoom() has already run. A control that cannot
  // do anything is worse than no control at all.
  gateEl?.setAttribute('data-through', 'true')
  replay?.setAttribute('aria-expanded', 'false')
}
// The road opens immediately; image labelling remains an optional lesson.
openRoom()
let gate = null
try {
  gate = mountGate(gateEl, {
    onEnter: () => { writeGate(sessionStorage, 'entered'); openRoom(); document.querySelector('[data-label-lesson]').open = false; document.querySelector('[data-label-lesson] summary').focus() },
    lang,
    onLang,
    storage: sessionStorage,
  })
} catch {
  /* The optional exercise can fail without blocking the road. */
}
replay?.addEventListener('click', () => {
  gateEl.removeAttribute('data-open')
  replay.setAttribute('aria-expanded', 'true')
  gate?.replay()
})
document.querySelector('[data-label-lesson]').addEventListener('toggle', e => {
  if (e.target.open) { gateEl.removeAttribute('data-open'); replay.setAttribute('aria-expanded','true'); gate?.replay() }
})
const workspace = root.querySelector('.drive-workspace')
root.querySelectorAll('button[data-mobile-view]').forEach(b=>b.addEventListener('click',()=>{
  workspace.dataset.mobileView=b.dataset.mobileView
  root.querySelectorAll('button[data-mobile-view]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)))
}))
const roadPicker=root.querySelector('[data-road-picker]')
roadPicker.addEventListener('change',()=>root.querySelector(`[data-set="layout"][data-value="${roadPicker.value}"]`).click())
const picker = root.querySelector('[data-car-picker]')
picker.addEventListener('change',()=>{selected=Number(picker.value);syncFocus();syncHeroName()})
root.querySelector('[data-keep-clear]').addEventListener('change',e=>{settings.keepClear=e.target.checked;resetWorld()})
const cardsEl = root.querySelector('[data-cards]')
const totalsEl = root.querySelector('[data-totals]')
const focusEl = root.querySelector('[data-focus]')
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches

const settings = { weather: 'day', people: 'few', dogs: 'few', speed: 1, layout: 'two', traffic: 6, control: 'fixed', keepClear: true }
const scenarioSeed = Date.now() % 100000
let world = createWorld({ seed: scenarioSeed, ...settings })
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
    if (set === 'layout' || set === 'traffic' || set === 'control') {
      if (set === 'layout' && ['city','asok'].includes(value)) { settings.traffic = value === 'asok' ? 32 : 24; settings.people = 'many'; settings.dogs = 'many'; press('traffic', settings.traffic); press('people', 'many'); press('dogs', 'many') }
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
  } else if (b.dataset.car) {
    selected = Number(b.dataset.car)
    syncFocus(); syncHeroName()
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
  if (Math.hypot(near.x - x, near.y - y) < 8) { selected = near.id; syncFocus(); syncHeroName() }
})

function syncPlay() {
  for (const b of root.querySelectorAll('[data-play]')) {
  b.setAttribute('aria-pressed', String(playing))
  b.querySelector('[data-play-label]').innerHTML = playing
    ? '<span class="th" lang="th">❚❚ หยุดชั่วคราว</span><span class="en" lang="en">❚❚ Pause</span><span class="zh" lang="zh-Hans">❚❚ 暂停</span>'
    : '<span class="th" lang="th">▶ เริ่ม</span><span class="en" lang="en">▶ Play</span><span class="zh" lang="zh-Hans">▶ 播放</span>'
  }
}

function resetWorld() {
  world = createWorld({ seed: scenarioSeed, ...settings })
  selected = Math.min(selected, world.cars.length); bg = null; acc = 0
  root.querySelectorAll('[data-set="people"]').forEach((b) => { b.disabled = !world.zebras.length })
  buildCards(); syncCards(); syncFocus(); syncHeroName(); render()
}

// ── Cards: one per car, the text twin of the picture ─────────────────

function L(th, en, zh) {
  const l = lang()
  return l === 'zh' ? zh : l === 'en' ? en : th
}

function buildCards() {
  roadPicker.innerHTML=Array.from(root.querySelectorAll('[data-set="layout"]')).map(b=>`<option value="${b.dataset.value}">${(b.querySelector('.'+lang())??b.querySelector('.en')).textContent.trim()}</option>`).join('')
  roadPicker.value=settings.layout
  picker.innerHTML = world.cars.map(c=>`<option value="${c.id}">${c.id} · ${STYLE_NAME[c.styleName][lang()==='th'?0:lang()==='zh'?2:1]}</option>`).join('')
  root.querySelector('[data-asok-credit]').hidden = settings.layout !== 'asok'
  root.querySelector('[data-layout-hint]').hidden = settings.layout !== 'asok'
  root.querySelector('[data-layout-hint]').textContent = settings.layout === 'asok'
    ? L('อโศก–สุขุมวิท: แนวถนนจากแผนที่จริง เลน จุดข้าม ทางวนกลับ และไฟเป็นข้อสมมติในการสอน', 'Asok–Sukhumvit: mapped road alignment; lanes, crossings, return loops and signals are teaching assumptions.', '阿索克–素坤逸：道路走向来自地图；车道、过街点、回程环路和信号均为教学假设。')
    : L('เลือกถนน แล้วเลือกรถเพื่อดูว่าเห็นอะไรและทำไมจึงเบรก', 'Choose a road, then a car to see what it sees and why it brakes.', '选择道路及车辆，观察它看见什么、为什么刹车。')
  root.querySelectorAll('[data-set="control"]').forEach(b=>b.disabled=Object.values(world.track).every(r=>r.stopS==null))
  root.querySelector('[data-keep-clear]').disabled=Object.values(world.track).every(r=>r.stopS==null)

  cardsEl.innerHTML = world.cars.map((c) => `
    <button class="car-card" type="button" data-car="${c.id}" data-style="${c.styleName}">
      <span class="car-id num">${c.id}</span>
      <span class="car-name"><span class="th" lang="th">${STYLE_NAME[c.styleName][0]} · วง ${c.route.id}</span><span class="en" lang="en">${STYLE_NAME[c.styleName][1]} · loop ${c.route.id}</span><span class="zh" lang="zh-Hans">${STYLE_NAME[c.styleName][2]} · 环线 ${c.route.id}</span></span>
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
    const hit = c.wasHit ? L(` · ถูกชน ${c.wasHit}`, ` · hit by others ${c.wasHit}`, ` · 被撞 ${c.wasHit}`) : ''
    el.querySelector('[data-score]').textContent = l === 'en'
      ? `${count(c.laps, 'lap')} · ${count(c.crashes, 'crash caused', 'crashes caused')} · ${count(c.hitPeople, 'person', 'people')} · ${count(c.hitDogs, 'dog hit', 'dogs hit')}${hit}`
      : l === 'zh'
        ? `${c.laps} 圈 · 造成碰撞 ${c.crashes} · 撞到人 ${c.hitPeople} · 撞到狗 ${c.hitDogs}${hit}`
        : `${c.laps} รอบ · ก่อเหตุชน ${c.crashes} · ชนคน ${c.hitPeople} · ชนสุนัข ${c.hitDogs}${hit}`
    el.querySelector('[data-say]').textContent = sayDecision(c, world, l)
  }
  const sum = (f) => world.cars.reduce((n, c) => n + f(c), 0)
  const mm = String(Math.floor(world.t / 60)).padStart(2, '0'), ss = String(Math.floor(world.t % 60)).padStart(2, '0')
  const laps = sum((c) => c.laps), crashes = sum((c) => c.crashes), people = sum((c) => c.hitPeople), dogs = sum((c) => c.hitDogs)
  const q=queues(world), passed=world.statistics.passed, stopped=(world.statistics.stoppedSeconds/world.cars.length).toFixed(1)
  const colour={red:L('แดง','red','红'),amber:L('เหลือง','amber','黄'),green:L('เขียว','green','绿')}
  const light={A:colour[world.light.A],B:colour[world.light.B]}
  const line = Object.values(world.track).some(r=>r.stopS!=null)
    ? L(`A ${light.A} · B ${light.B} · รถรอ ${q.A}/${q.B} · ผ่านเส้น ${passed} · หยุด ${stopped} วินาที/คัน`, `A ${light.A} · B ${light.B} · queued ${q.A}/${q.B} · crossings ${passed} · stopped ${stopped} s/car`, `A ${light.A} · B ${light.B} · 排队 ${q.A}/${q.B} · 通过 ${passed} · 停车 ${stopped} 秒/车`)
    : L('ถนนนี้ไม่มีไฟจราจร ลองวงเวียน เมือง หรืออโศกเพื่อทดลองไฟ', 'No signals on this road. Choose Roundabout, City or Asok to experiment with lights.', '这条道路没有信号灯。选择环岛、城市或阿索克来试验信号控制。')
  root.querySelector('[data-traffic-readout]').textContent=line
  totalsEl.textContent = l === 'en'
    ? `${mm}:${ss} · ${count(laps, 'lap')} · ${count(crashes, 'crash')} · ${count(people, 'person hit', 'people hit')} · ${count(dogs, 'dog hit', 'dogs hit')}`
    : l === 'zh'
      ? `${mm}:${ss} · ${laps} 圈 · 碰撞 ${crashes} · 撞到人 ${people} · 撞到狗 ${dogs}`
      : `${mm}:${ss} · ${laps} รอบ · ชน ${crashes} · ชนคน ${people} · ชนสุนัข ${dogs}`
}

function syncFocus() {
  const c = world.cars[selected - 1], l = lang()
  focusEl.querySelector('[data-focus-sees]').textContent = saySeen(c, l)
  const unnamed = sayUnnamed(c, world, l)
  const unnamedRow = focusEl.querySelector('[data-focus-unnamed-row]')
  // Hide the whole row, label and all: a "Cannot name" heading with nothing
  // under it reads as a broken readout, not as "nothing to report right now".
  unnamedRow.querySelector('[data-focus-unnamed]').textContent = unnamed
  unnamedRow.hidden = !unnamed
  focusEl.querySelector('[data-focus-does]').textContent = sayDecision(c, world, l)
  cardsEl.querySelectorAll('[data-car]').forEach((el) => el.setAttribute('aria-pressed', String(Number(el.dataset.car) === selected)))
}

function toggleBlind() {
  const c=world.cars[selected-1];c.blind=!c.blind;c.tracks.clear();syncFocus();syncHeroName()
}
function syncHeroName() {
  const c = world.cars[selected - 1]
  picker.value=String(selected)
  const range = Math.round(sightRange(c, world.weather))
  root.querySelector('[data-hero-blind]').setAttribute('aria-pressed',String(c.blind))
  root.querySelector('[data-hero-blind]').textContent=c.blind
    ? L('เปิดกล้องรถคันนี้','Uncover this camera','揭开这辆车的摄像头')
    : L('ปิดกล้องรถคันนี้','Cover this camera','盖住这辆车的摄像头')
  heroName.textContent = L(
    ` ${speedKmh(c)} กม./ชม. · มองเห็น ${range} ม.`,
    `${speedKmh(c)} km/h · sees ${range} m`,
    `${speedKmh(c)} 公里/小时 · 看见 ${range} 米`,
  )
}

const dialog = document.querySelector('[data-driver-dialog]')
const windshield = dialog.querySelector('[data-windshield]')
const wg = windshield.getContext('2d')
const SKIES = ['day', 'rain', 'night', 'sun']
function cycleCar(delta) { selected = (selected - 1 + delta + world.cars.length) % world.cars.length + 1; syncFocus(); syncHeroName() }
function cycleWeather() { settings.weather = world.weather = SKIES[(SKIES.indexOf(world.weather) + 1) % SKIES.length]; press('weather', world.weather); syncHeroName() }
// One painter for both the hero band and the full-screen dialog: size the
// backing store to the element, then let perspective.js draw the same frame.
function blitView(cv, c2d) {
  if (!cv.clientWidth) return
  const c = world.cars[selected - 1], w = Math.max(1, cv.clientWidth), h = Math.max(1, cv.clientHeight), ratio = Math.min(3, devicePixelRatio || 1)
  if (cv.width !== Math.round(w * ratio) || cv.height !== Math.round(h * ratio)) { cv.width = Math.round(w * ratio); cv.height = Math.round(h * ratio) }
  c2d.setTransform(ratio, 0, 0, ratio, 0, 0)
  drawWindshield(c2d, c, world, w, h, lang())
}
function openDriver() { if (!dialog.open) dialog.showModal(); paintDriver() }
root.querySelector('[data-hero-full]').addEventListener('click', openDriver)
root.querySelector('[data-hero-prev]').addEventListener('click', () => cycleCar(-1))
root.querySelector('[data-hero-next]').addEventListener('click', () => cycleCar(1))
root.querySelector('[data-hero-weather]').addEventListener('click', cycleWeather)
root.querySelector('[data-hero-blind]').addEventListener('click', () => toggleBlind())
dialog.querySelector('[data-driver-close]').addEventListener('click', () => dialog.close())
dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close() })
for (const [sel, delta] of [['prev', -1], ['next', 1]]) dialog.querySelector(`[data-driver-${sel}]`).addEventListener('click', () => { cycleCar(delta); paintDriver() })
dialog.querySelector('[data-driver-pause]').addEventListener('click', () => { playing = !playing; syncPlay(); paintDriver() })
dialog.querySelector('[data-driver-blind]').addEventListener('click', () => toggleBlind())
dialog.querySelector('[data-driver-weather]').addEventListener('click', () => { cycleWeather(); paintDriver() })
let driverFrameAt = 0, heroFrameAt = 0
function paintHero(now) {
  if (now - heroFrameAt < 42) return
  heroFrameAt = now
  blitView(hero, hg)
}
function paintDriver() {
  if (!dialog.open) return
  const now = performance.now()
  if (now - driverFrameAt < 42) return
  driverFrameAt = now
  blitView(windshield, wg)
  const c = world.cars[selected - 1], d = c.decision
  const range = Math.round(sightRange(c, world.weather))
  const sky = { day: ['กลางวัน', 'Day', '白天'], rain: ['ฝน', 'Rain', '雨'], night: ['กลางคืน', 'Night', '夜晚'], sun: ['แดดจ้า', 'Sun glare', '强光'] }[world.weather]
  dialog.querySelector('[data-driver-title]').textContent = L(`รถ ${c.id} · ${STYLE_NAME[c.styleName][0]}`, `Car ${c.id} · ${STYLE_NAME[c.styleName][1]}`, `第 ${c.id} 辆车 · ${STYLE_NAME[c.styleName][2]}`)
  dialog.querySelector('[data-driver-speed]').textContent = `${speedKmh(c)} ${L('กม./ชม.', 'km/h', '公里/小时')} · ${L('มองเห็น', 'view', '视野')} ${range} ${L('ม.', 'm', '米')} · ${L(...sky)} ${playing ? '' : '⏸'}`
  dialog.querySelector('[data-driver-action]').textContent = sayDecision(c, world, lang())
  const gap = d.dist == null
    ? L('ยังไม่มีอุปสรรคที่ต้องหยุด', 'No stopping obstacle selected', '尚未选定需要停下的障碍')
    : `${L('ระยะถึงอุปสรรค', 'Gap to obstacle', '与障碍的距离')} ${d.dist.toFixed(1)} ${L('ม.', 'm', '米')}`
  dialog.querySelector('[data-driver-math]').textContent = `${gap} · ${L('ระยะที่ต้องการ', 'preferred gap', '期望间距')} ${d.desiredGap == null ? '—' : d.desiredGap.toFixed(1)} ${L('ม.', 'm', '米')} · ${L('ปรับความเร็ว', 'speed change', '速度变化')} ${(d.acc * 3.6).toFixed(1)} ${L('กม./ชม. ต่อวินาที', 'km/h each second', '公里/小时每秒')}\n${L('คำนวณจากระยะ ความเร็วที่เข้าใกล้ และระยะปลอดภัย เลือกคำขอเบรกที่ระวังที่สุด', 'Speed comes from distance, closing speed and a safety gap. The strongest braking request wins.', '速度由距离、接近速度和安全间距算出。最谨慎的刹车请求胜出。')}`
}

// ── The loop ──────────────────────────────────────────────────────────

function render() {
  if (!canvas.clientWidth) return
  k = fit(canvas)
  if (!bg || bg.width !== canvas.width) {
    colours = palette()
    bg = Object.assign(document.createElement('canvas'), { width: canvas.width, height: canvas.height })
    drawTrack(bg.getContext('2d'), k, world.track, colours, world.street)
  }
  ctx.drawImage(bg, 0, 0)
  drawWorld(ctx, k, world, colours, { selected, showAll, lang: lang() })
}

let inView = true, heroInView = true
new IntersectionObserver(([entry]) => { inView = entry.isIntersecting }).observe(canvas)
new IntersectionObserver(([entry]) => { heroInView = entry.isIntersecting }).observe(hero)
let last = performance.now(), acc = 0, textT = 0
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000)
  last = now
  if (playing && !document.hidden && (inView || heroInView || dialog.open)) {
    acc += dt * settings.speed
    while (acc >= DT) { step(world); acc -= DT }
  }
  if (!document.hidden && (inView || dialog.open)) {
    // Behind the gate the canvas has no width yet; drawing at scale 0 is wasted
    // work and can leave a zero-sized backing store the first time it appears.
    if (inView && canvas.clientWidth) render()
    paintDriver()
  }
  if (!document.hidden && heroInView && hero.clientWidth) paintHero(now)
  textT += dt
  if (textT > 0.25 && !document.hidden && (inView || heroInView || dialog.open)) { textT = 0; syncCards(); syncFocus(); syncHeroName() }
  requestAnimationFrame(frame)
}

new ResizeObserver(() => { bg = null }).observe(canvas)
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { bg = null })
onLang(() => { buildCards(); syncCards(); syncFocus(); syncHeroName() })

buildCards()
root.querySelectorAll('[data-set="people"]').forEach((b) => { b.disabled = !world.zebras.length })
syncPlay()
syncCards()
syncFocus()
syncHeroName()
requestAnimationFrame(frame)
