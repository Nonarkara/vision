// /gesture: teach your camera a few gestures, then let each one run a small
// action in this browser. The judgement is k-NN over the same frozen
// MobileNet fingerprints /train uses; the actions are the handful of things
// a page is actually allowed to do — and every refusal is reported as
// honestly as every success.
//
// Everything — examples, bindings, the log — lives in this tab's memory.

import '../core/site.js?v=1.10.1'
import { t, n, pct, lang, onLang, esc } from '../core/i18n.js'
import { toast, confirmBox } from '../core/site.js?v=1.10.1'
import { createSpecimen, startSpecimen, specimenBarHtml } from '../core/specimen.js?v=1.10.1'
import { canUseWebcam } from '../core/source.js?v=1.10.1'
import { runLens, createLensState } from '../cv/lenses.js'
import { knnPredict } from '../ml/learner.js'
import * as store from '../train/store.js?v=1.10.1'
import { snapshot, shrink, embed, isBusy, isLoaded } from '../train/eye.js'
import { createClassList } from '../train/classes-ui.js?v=1.10.1'
import { createBars } from '../train/bars.js'
import { createTrigger } from '../gesture/fire.js'
import { ACTIONS, DEFAULT_ACTIONS, PRESET_ACTIONS, createActions } from '../gesture/actions.js?v=1.10.1'

const K = 5
const LIVE_MS = 250
const MIN_EXAMPLES = 3
const DEMO_MB = '14 MB'

const $ = (sel) => document.querySelector(sel)

let lastLive = null      // { list, probs } — kept so a language switch can repaint
let lastLiveKey = ''     // what the live loop last looked at, so a still is not re-read for nothing

// ── The source: your camera, a public camera, or a photo ────────────────

$('[data-specimen-slot]').outerHTML = specimenBarHtml()
const specimen = createSpecimen({ bar: $('[data-specimen]'), prefer: 'video' })
const viewState = $('[data-view-state]')
const statusEl = $('[data-status]')

runLens($('[data-view]'), () => specimen.source, () => ({ name: 'picture' }), { fps: 15, state: createLensState(), onFrame: () => { viewState.hidden = true } })
specimen.on((src) => { viewState.hidden = !!src; lastLiveKey = '' })
specimen.onError((text, kept) => { if (!kept) { viewState.hidden = false; viewState.textContent = text } })
// Gestures are made by you, so your camera comes first. A road camera loads
// only on a device that has no camera to offer.
if (canUseWebcam()) {
  viewState.textContent = t('กด “ใช้กล้องของฉัน” เพื่อเริ่ม — ภาพไม่ออกจากเครื่องนี้', 'Press “Use my camera” to begin — the picture never leaves this device')
} else {
  viewState.textContent = t('กำลังหากล้องที่ตอบ…', 'Finding a camera that answers…')
  startSpecimen(specimen).then((src) => {
    if (!src) viewState.textContent = t('ยังไม่มีกล้องตอบ ลองกด ↻ หรือเปิดรูปของคุณเอง', 'No camera answered — press ↻ or open one of your photos')
  })
}

const mineBtn = $('[data-mine]')
if (!canUseWebcam()) mineBtn.hidden = true
mineBtn.addEventListener('click', () => specimen.useWebcam())

// ── The network: loads on the first example, says how far along it is ───

const modelState = $('[data-model-state]')
let modelP = -1
let statusFn = () => ''
function say(fn) { statusFn = fn; statusEl.textContent = fn() }
function paintModel() {
  modelState.textContent = isLoaded() || modelP >= 1 ? `MobileNetV2 · ${t('พร้อม', 'ready')}`
    : modelP < 0 ? `MobileNetV2 · ${t('ยังไม่โหลด', 'not loaded')}`
      : `MobileNetV2 · ${Math.round(modelP * 100)}%`
}
document.addEventListener('modelprogress', (e) => {
  if (e.detail.name !== 'mobilenet') return
  modelP = e.detail.p
  paintModel()
  if (e.detail.done) say(() => t('โครงข่ายพร้อมแล้ว ครั้งแรกอาจช้าสักครู่ระหว่างที่การ์ดจอเตรียมตัว', 'The network is ready. The very first look can take a moment while the graphics card warms up.'))
  else say(() => `${t(`กำลังโหลดโครงข่าย (${DEMO_MB} ครั้งแรกเท่านั้น)`, `Loading the network (${DEMO_MB}, first time only)`)} ${Math.round(modelP * 100)}%`)
})
say(() => t(`กด “เพิ่มตัวอย่าง” ครั้งแรก แล้วโครงข่ายจะโหลด (${DEMO_MB} ครั้งเดียว)`, `The network loads (${DEMO_MB}, once) when you add your first example.`))

// ── Examples ────────────────────────────────────────────────────────────

let capturing = 0

async function capture(key, { quiet }) {
  const src = specimen.source
  if (!src?.ready) { if (!quiet) toast(t('ยังไม่มีภาพ รอกล้องสักครู่', 'No picture yet — wait for the camera')); return }
  if (store.isFull(key)) { if (!quiet) toast(t(`กลุ่มนี้เต็มแล้ว (${store.MAX_PER_CLASS} ภาพ)`, `This class is full (${store.MAX_PER_CLASS} examples)`)); return }
  if (capturing) { if (!quiet) toast(t('กำลังประมวลผลภาพก่อนหน้า รอสักครู่', 'Still working on the last picture — one moment')); return }
  const snap = snapshot(src)
  if (!snap) return
  const thumb = shrink(snap)
  capturing++
  try {
    const x = await embed(snap)
    paintModel()
    if (!store.addSample(key, { x, thumb })) { if (!quiet) toast(t('เพิ่มไม่ได้ กลุ่มนี้เพิ่งถูกล้างหรือเต็ม', 'Could not add it — that class was just cleared or filled')); return }
    const list = store.getClasses()
    const i = list.findIndex((c) => c.key === key)
    if (i >= 0) say(() => `+1 → ${store.GLYPHS[i]} ${store.nameOf(list[i], lang())} (${n(list[i].samples.length)})`)
  } catch (err) {
    say(() => isLoaded()
      ? `${t('เพิ่มตัวอย่างไม่สำเร็จ', 'Could not add that example')}${err?.message ? ` — ${err.message}` : ''}`
      : t('โหลดโครงข่ายไม่สำเร็จ ลองอีกครั้ง', 'The network did not load — try again'))
  } finally {
    capturing--
  }
}

createClassList($('[data-classes]'), { onCapture: capture })
$('[data-add-class]').addEventListener('click', () => store.addClass())

// The starter set follows what you are looking at — hand up/down for your own
// camera, busy/empty for a road camera — until you pick a set yourself.
const presetEl = $('[data-preset]')
let preset = 'fingers'
let presetChosen = false

function setPreset(id) {
  preset = id
  presetEl.value = id
  store.applyPreset(id)
}

function renderPresets() {
  const groups = [['mine', t('กับกล้องของคุณ', 'With your camera')], ['public', t('กับกล้องถนน', 'With road cameras')]]
  presetEl.replaceChildren(...groups.map(([g, text]) => {
    const og = document.createElement('optgroup')
    og.label = text
    og.append(...store.PRESETS.filter((p) => p.group === g).map((p) => new Option(p.names.map(([th, en]) => t(th, en)).join(' / '), p.id)))
    return og
  }))
  presetEl.value = preset
}

specimen.on((src) => {
  if (presetChosen || store.hasSamples() || !src) return
  const want = src.kind === 'webcam' || src.kind === 'photo' ? 'fingers' : 'road'
  if (want !== preset) setPreset(want)
})

presetEl.addEventListener('change', async () => {
  const want = presetEl.value
  if (store.hasSamples() && !(await confirmBox(t('เริ่มใหม่ด้วยชุดนี้? ตัวอย่างทั้งหมดจะหายไป', 'Start again with this set? All your examples will be cleared.'), { ok: t('เริ่มใหม่', 'Start again'), cancel: t('ยกเลิก', 'Cancel') }))) {
    presetEl.value = preset
    return
  }
  presetChosen = true
  setPreset(want)
})

// ── What each gesture is allowed to do ──────────────────────────────────

const mapEl = $('[data-action-map]')
const actionPick = new Map()   // class key → action id
const actionFor = (c, i) => {
  const starter = PRESET_ACTIONS[preset] ?? DEFAULT_ACTIONS
  return actionPick.get(c.key) ?? starter[i % starter.length]
}

function paintActionMap() {
  const list = store.getClasses()
  mapEl.innerHTML = list.map((c, i) => `
    <div class="action-row" data-key="${c.key}">
      <span class="klass-glyph num" aria-hidden="true">${store.GLYPHS[i]}</span>
      <span class="action-name">${esc(store.nameOf(c, lang()))}</span>
      <select class="field-input action-pick" data-pick="${c.key}" aria-label="${esc(t(`การกระทำของท่า “${store.nameOf(c, lang())}”`, `Action for the gesture “${store.nameOf(c, lang())}”`))}">${ACTIONS.map((a) => `<option value="${a.id}"${a.id === actionFor(c, i) ? ' selected' : ''}>${esc(t(a.th, a.en))}</option>`).join('')}</select>
    </div>`).join('')
  for (const sel of mapEl.querySelectorAll('[data-pick]')) {
    sel.addEventListener('change', () => actionPick.set(Number(sel.dataset.pick), sel.value))
  }
}

const actions = createActions({
  room: $('#gesture-room'),
  flash: $('[data-flash]'),
  lamps: [document.querySelector('[data-lamp="0"]'), document.querySelector('[data-lamp="1"]')],
  spot: $('[data-link-spot]'),
  frame: $('[data-view]'),
})

// ── Arm / rest: the click the browser insists on before anything runs ───

let armed = false
let lastArm = null
const armBtn = $('[data-arm]')
const armSay = $('[data-arm-say]')

armBtn.addEventListener('click', async () => {
  const res = await actions.arm()
  armed = true
  lastArm = res
  armSay.textContent = `${res.ok ? '✓' : '!'} ${t(res.th, res.en)}`
  paintArm()
  paintHowto()
  toast(t('เปิดใช้การกระทำแล้ว — ทำท่าได้เลย', 'Actions armed — make a gesture'))
})

$('[data-disarm]').addEventListener('click', () => {
  armed = false
  actions.disarm()
  armSay.textContent = t('✓ พักการกระทำไว้แล้ว — ท่าของคุณจะไม่ทำอะไรตอนนี้', '✓ Actions are resting — a gesture will do nothing now')
  paintArm()
  paintHowto()
})

function paintArm() {
  armBtn.setAttribute('aria-pressed', String(armed))
}

// ── The log: what actually happened, both languages kept ────────────────

const logEl = $('[data-log]')
const logLines = []

function paintLog() {
  logEl.textContent = logLines.map((l) => `${l.ok ? '✓' : '✗'} ${t(l.th, l.en)}`).join('\n')
}

function pushLog(line) {
  logLines.unshift(line)
  if (logLines.length > 4) logLines.pop()
  paintLog()
}

// ── Judgement: k-NN over the fingerprints, then the trigger ─────────────

const bars = createBars($('[data-bars]'))
const liveSay = $('[data-live-say]')
let trigger = createTrigger()
const firedIdx = new Set()
let fired = 0

const barLabels = () => store.getClasses().map((c, i) => `${store.GLYPHS[i]} ${store.nameOf(c, lang())}`)
const paintLabels = () => bars.setLabels(barLabels())

function canGuess() {
  const list = store.getClasses()
  return list.length >= 2 && list.every((c) => c.samples.length >= MIN_EXAMPLES)
}

function paintLiveSay(list, probs) {
  if (!probs) {
    liveSay.textContent = t(`ยังไม่เริ่มเดา — ต้องมีตัวอย่างกลุ่มละ ${MIN_EXAMPLES} ภาพก่อน`, `Not guessing yet — each group needs ${MIN_EXAMPLES} examples first`)
    return
  }
  const top = probs.indexOf(Math.max(...probs))
  liveSay.textContent = t(
    `ดูเหมือน “${store.nameOf(list[top], 'th')}” ${pct(probs[top])} — ${armed ? 'ถ้ามั่นคงอีกสักครู่ จะลงมือทำสิ่งที่ผูกไว้' : 'ยังไม่ได้เปิดใช้การกระทำ'}`,
    `Looks like “${store.nameOf(list[top], 'en')}” ${pct(probs[top])} — ${armed ? 'hold it steady a moment and it runs the bound action' : 'actions are still resting'}`,
  )
}

async function fireGesture({ index }) {
  const list = store.getClasses()
  const c = list[index]
  if (!c) return
  const def = ACTIONS.find((a) => a.id === actionFor(c, index)) ?? ACTIONS[0]
  if (def.id === 'none') return // the resting pose exists so the machine can say "no gesture"
  const res = await actions.fire(def.id)
  const name = store.nameOf(c, lang())
  pushLog({
    ok: res.ok,
    th: `${store.GLYPHS[index]} ${name} → ${def.th} — ${res.th}`,
    en: `${store.GLYPHS[index]} ${name} → ${def.en} — ${res.en}`,
  })
  fired++
  firedIdx.add(index)
  paintHowto()
}

async function liveTick() {
  try {
    const src = specimen.source
    if (isLoaded() && !isBusy() && !document.hidden && src?.ready && canGuess()) {
      // Stills and photos only change now and then: look again only when they, or the examples, do.
      const key = src.moving ? '' : String(src.frameAt)
      if (src.moving || key !== lastLiveKey) {
        lastLiveKey = key
        const x = await embed(snapshot(src))
        const list = store.getClasses()
        const probs = knnPredict(store.trainingSet(), x, list.length, K).probs
        lastLive = { list, probs }
        bars.setProbs(probs)
        paintLiveSay(list, probs)
        const shot = trigger.tick(probs, performance.now(), { enabled: armed && !capturing })
        if (shot) await fireGesture(shot)
        paintHowto()
      }
    } else if (!canGuess() && lastLive) {
      lastLive = null
      bars.setProbs(null)
      paintLiveSay(store.getClasses(), null)
      paintHowto()
    }
  } catch { /* a dropped frame is not worth a message */ }
  setTimeout(liveTick, LIVE_MS)
}

// ── The four-step checklist ─────────────────────────────────────────────

const howtoEl = $('[data-howto]')
const HOWTO = {
  examples: () => canGuess(),
  arm: () => armed,
  fire: () => fired >= 1,
  again: () => firedIdx.size >= 2,
}

function paintHowto() {
  if (!howtoEl) return
  for (const li of howtoEl.querySelectorAll('[data-step]')) {
    if (HOWTO[li.dataset.step]?.()) li.setAttribute('data-done', '')
    else li.removeAttribute('data-done')
  }
}

// ── Repaint on any change of mind or language ───────────────────────────

function repaintAll() {
  paintLabels()
  paintActionMap()
  if (lastLive) paintLiveSay(lastLive.list, lastLive.probs)
  else paintLiveSay(store.getClasses(), null)
}

store.onChange((kind) => {
  lastLiveKey = ''
  if (kind === 'samples') { paintHowto(); return }
  if (kind === 'structure') {
    lastLive = null
    bars.setProbs(null)
    trigger = createTrigger()
  }
  repaintAll()
  paintHowto()
})

onLang(() => {
  repaintAll()
  renderPresets()
  paintModel()
  paintLog()
  statusEl.textContent = statusFn()
  if (lastArm) armSay.textContent = `${lastArm.ok ? '✓' : '!'} ${t(lastArm.th, lastArm.en)}`
})

// ── Start ───────────────────────────────────────────────────────────────

renderPresets()
store.applyPreset(preset)
repaintAll()
paintModel()
paintHowto()
paintLog()
liveTick()
