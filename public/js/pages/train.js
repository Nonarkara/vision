// /train: a Teachable-Machine-style room. Your examples go in on the right,
// the frozen network turns each into 1,280 numbers, and two small learners
// decide on top: nearest neighbours (instant) and a trained layer (watch it
// learn). Then the thing you taught goes out to judge the country's cameras.
//
// Everything — examples, weights, predictions — lives in this tab's memory.

import '../core/site.js?v=1.12.0'
import { mountVideoLesson } from '../train/video-lesson.js?v=1.12.0'
import { t, n, pct, lang, onLang } from '../core/i18n.js'
import { toast, confirmBox } from '../core/site.js?v=1.12.0'
import { createSpecimen, specimenBarHtml } from '../core/specimen.js?v=1.12.0'
import { canUseWebcam } from '../core/source.js?v=1.12.0'
import { runLens, createLensState } from '../cv/lenses.js'
import { knnPredict, leaveOneOutAsync } from '../ml/learner.js'
import * as store from '../train/store.js?v=1.12.0'
import { snapshot, shrink, embed, isBusy, isLoaded } from '../train/eye.js'
import { createClassList } from '../train/classes-ui.js?v=1.12.0'
import { createBars } from '../train/bars.js'
import { trainLayer, drawCurve, EPOCHS, layerFile, download, parseLayerFile, fileReason } from '../train/layer.js'
import { createMap } from '../train/map.js'
import { createJudge } from '../train/judge.js'
import { demoFrames, roadScene } from '../train/demo.js'

const K = 5
const LIVE_MS = 250
const STATS_DEBOUNCE_MS = 400
const DEMO_MB = '14 MB'

const $ = (sel) => document.querySelector(sel)

let lastLive = null       // { knn, lay } — the latest scores, kept for a language switch
let lastLiveKey = ''      // what the live loop last looked at, so a still is not re-read for nothing

// ── The source: your camera, a public camera, or a photo ────────────────

$('[data-specimen-slot]').outerHTML = specimenBarHtml()
const specimen = createSpecimen({ bar: $('[data-specimen]'), prefer: 'video' })
const viewState = $('[data-view-state]')
const statusEl = $('[data-status]')

runLens($('[data-view]'), () => specimen.source, () => ({ name: 'picture' }), { fps: 15, state: createLensState(), onFrame: () => { viewState.hidden = true } })
specimen.on((src) => { viewState.hidden = !!src; lastLiveKey = '' })
specimen.onError((text, kept) => { if (!kept) { viewState.hidden = false; viewState.textContent = text } })
viewState.textContent = t('เลือกวิดีโอหรือกล้องในบทเรียนด้านบน', 'Choose a video or camera in the lesson above')

const mineBtn = $('[data-mine]')
if (!canUseWebcam()) mineBtn.hidden = true
mineBtn.addEventListener('click', () => specimen.useWebcam())

// ── The network: loads on the first example, says how far along it is ───

const modelState = $('[data-model-state]')
let modelP = -1
let status = () => ''
function paintModel() {
  modelState.textContent = isLoaded() || modelP >= 1 ? `MobileNetV2 · ${t('พร้อม', 'ready')}`
    : modelP < 0 ? `MobileNetV2 · ${t('ยังไม่โหลด', 'not loaded')}`
      : `MobileNetV2 · ${Math.round(modelP * 100)}%`
}
function say(fn) { status = fn; statusEl.textContent = fn() }
document.addEventListener('modelprogress', (e) => {
  if (e.detail.name !== 'mobilenet') return
  modelP = e.detail.p
  paintModel()
  paintLoadBar()
  if (e.detail.done) say(() => t('โครงข่ายพร้อมแล้ว ครั้งแรกอาจช้าสักครู่ระหว่างที่การ์ดจอเตรียมตัว', 'The network is ready. The very first look can take a moment while the graphics card warms up.'))
  else say(() => `${t(`กำลังโหลดโครงข่าย (${DEMO_MB} ครั้งแรกเท่านั้น)`, `Loading the network (${DEMO_MB}, first time only)`)} ${Math.round(modelP * 100)}%`)
})
say(() => t(`กด “เพิ่มตัวอย่าง” ครั้งแรก แล้วโครงข่ายจะโหลด (${DEMO_MB} ครั้งเดียว)`, `The network loads (${DEMO_MB}, once) when you add your first example.`))

// A bar, not just a percentage: you can see how much of the download is left.
const loadBar = document.createElement('div')
loadBar.className = 'loadbar'
loadBar.setAttribute('role', 'progressbar')
loadBar.setAttribute('aria-valuemin', '0')
loadBar.setAttribute('aria-valuemax', '100')
loadBar.hidden = true
const loadFill = document.createElement('span')
loadFill.className = 'loadbar-fill'
loadBar.append(loadFill)
$('.bench-caption')?.after(loadBar)

function paintLoadBar() {
  const loading = modelP >= 0 && modelP < 1 && !isLoaded()
  loadBar.hidden = !loading
  if (!loading) return
  const v = Math.round(modelP * 100)
  loadFill.style.width = `${v}%`
  loadBar.setAttribute('aria-valuenow', String(v))
  loadBar.setAttribute('aria-label', t(`กำลังโหลดโครงข่าย ${v}%`, `Loading the network ${v}%`))
}

// ── Classes and examples ────────────────────────────────────────────────

const label = (c, i) => `${store.GLYPHS[i]} ${store.nameOf(c, lang())}`

// One capture in flight at a time. Without this, clicking "Add example"
// ten times during the 14 MB download queues ten snapshots that all land
// together the moment the model finishes.
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
    if (i >= 0) say(() => `+1 → ${label(list[i], i)} (${n(store.getClasses()[i]?.samples.length ?? 0)})`)
  } catch (err) {
    say(() => isLoaded()
      ? `${t('เพิ่มตัวอย่างไม่สำเร็จ', 'Could not add that example')}${err?.message ? ` — ${err.message}` : ''}`
      : t('โหลดโครงข่ายไม่สำเร็จ ลองอีกครั้ง', 'The network did not load — try again'))
  } finally {
    capturing--
  }
}

createClassList($('[data-classes]'), { onCapture: capture })
const addClassBtn = $('[data-add-class]')
addClassBtn.addEventListener('click', () => store.addClass())

// The starter set follows what you are looking at — a road camera opens on
// busy/empty, your own camera on hand-up/hand-down — until you pick a set
// yourself. That way the first two clicks already mean something.
const presetEl = $('[data-preset]')
let preset = 'road'
let presetChosen = false
let activity = ''
let testSeed = 90000

async function showTestScene(kind) {
  const canvas = roadScene(kind, ++testSeed)
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (blob) await specimen.usePhoto(new File([blob], 'drawn-road.png', { type: 'image/png' }))
}

function paintActivity() {
  for (const btn of document.querySelectorAll('[data-activity]')) btn.setAttribute('aria-pressed', String(btn.dataset.activity === activity))
  $('[data-demo-test]').hidden = activity !== 'demo'
  $('[data-activity-help]').textContent = activity === 'demo'
    ? t('ภาพวาดเท่านั้น: กดฝึก แล้วลองสลับภาพถนนใต้จอเพื่อดูคำตอบ', 'Drawings only: train it, then switch road pictures below the screen to see its answer.')
    : activity === 'hand' ? t('ยกมือแล้วเก็บภาพกลุ่ม “ยกมือ” จากนั้นลดมือแล้วเก็บอีกกลุ่ม ฝึกแล้วลองขยับมือดู', 'Raise your hand and add Hand up examples. Lower it and add Hand down examples. Train, then move your hand to test it.')
    : activity === 'cup' ? t('วางแก้วแล้วเก็บภาพกลุ่ม “มีแก้ว” เอาแก้วออกแล้วเก็บอีกกลุ่ม ฝึกแล้วลองย้ายแก้วดู', 'Show a cup and add Cup examples. Take it away and add No cup examples. Train, then move the cup to test it.')
    : activity === 'road' ? t('เลือกกล้องถนน เก็บภาพรถแน่นและถนนโล่ง แล้วฝึก ลองเปลี่ยนกล้องเพื่อทดสอบ', 'Choose road cameras. Add busy and empty examples, then train. Switch cameras to test it.')
    : t('เริ่มที่ “ลองเลย” ได้ทันที หรือเลือกกิจกรรมที่ใช้กล้องของคุณ', 'Start with “Try it without a camera”, or choose a camera activity.')
}

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
  const want = src.kind === 'webcam' || src.kind === 'photo' ? 'hand' : 'road'
  if (want !== preset) setPreset(want)
})

presetEl.addEventListener('change', async () => {
  const want = presetEl.value
  if (store.hasSamples() && !(await confirmBox(t('เริ่มใหม่ด้วยชุดนี้? ตัวอย่างทั้งหมดจะหายไป', 'Start again with this set? All your examples will be cleared.'), { ok: t('เริ่มใหม่', 'Start again'), cancel: t('ยกเลิก', 'Cancel') }))) {
    presetEl.value = preset
    return
  }
  presetChosen = true
  activity = want
  paintActivity()
  if (want !== 'cup') challenge = false
  setPreset(want)
  paintChallenge()
})

// ── The demo set: frames this page draws for itself, so the room works with
// no camera, no working public camera and no patience ────────────────────

const demoBtn = $('[data-demo]')
demoBtn.addEventListener('click', async () => {
  if (demoBtn.disabled) return
  if (store.hasSamples() && !(await confirmBox(t('โหลดตัวอย่างที่หน้านี้วาดให้แทน? ตัวอย่างปัจจุบันจะหายไป', 'Load the examples this page draws instead? Your current examples will be cleared.'), { ok: t('โหลดเลย', 'Load them'), cancel: t('ยกเลิก', 'Cancel') }))) return
  demoBtn.disabled = true
  const frames = demoFrames()
  try {
    presetChosen = true
    challenge = false
    activity = 'demo'
    paintActivity()
    setPreset('road')
    await showTestScene('busy')
    if (store.getClasses().length < 2) return          // the set could not be built
    paintChallenge()
    for (let i = 0; i < frames.length; i++) {
      if (preset !== 'road') return                      // the visitor picked another set mid-run
      if (isLoaded()) say(() => t(`กำลังวาดและอ่านตัวอย่าง ${n(i + 1)} / ${n(frames.length)}`, `Drawing and reading example ${i + 1} / ${frames.length}`))
      const { y, canvas } = frames[i]
      const key = store.getClasses()[y]?.key
      const x = await embed(canvas)
      if (!key) break
      if (!store.addSample(key, { x, thumb: shrink(canvas) })) return
      if (i % 4 === 3) await new Promise((r) => requestAnimationFrame(r))
    }
    paintModel()
    say(() => t('ตัวอย่างพร้อมแล้ว กด “ฝึกแล้วลองทาย” แล้วลองสลับภาพถนนใต้จอ', 'Examples ready. Press Train and try it, then switch the road picture below the screen.'))
    toast(t('วาดตัวอย่างให้แล้ว 16 ภาพ — ภาพถนนจำลอง ไม่ใช่ภาพถ่าย', 'Drew 16 examples for you — synthetic road scenes, not photographs'))
    document.querySelector('.room-bench')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  } catch (err) {
    say(() => isLoaded()
      ? `${t('เตรียมตัวอย่างไม่สำเร็จ', 'Could not prepare the examples')}${err?.message ? ` — ${err.message}` : ''}`
      : t('โหลดโครงข่ายไม่สำเร็จ ลองอีกครั้ง', 'The network did not load — try again'))
  } finally {
    demoBtn.disabled = false
  }
})

for (const btn of document.querySelectorAll('[data-activity]')) {
  btn.addEventListener('click', async () => {
    const want = btn.dataset.activity
    if (want === 'demo') { demoBtn.click(); return }
    if (demoBtn.disabled) return
    if (store.hasSamples() && !(await confirmBox(t('เริ่มกิจกรรมใหม่? ตัวอย่างเดิมจะหายไป', 'Start a new activity? Your current examples will be cleared.'), { ok: t('เริ่มใหม่', 'Start again'), cancel: t('ยกเลิก', 'Cancel') }))) return
    activity = want
    presetChosen = true
    challenge = false
    setPreset(want)
    paintActivity()
    paintChallenge()
    $('.room-bench').scrollIntoView({ behavior: 'smooth', block: 'start' })
    if (want !== 'road') await specimen.useWebcam()
    else if (specimen.source?.kind === 'webcam' || specimen.source?.kind === 'photo') await specimen.next()
  })
}
for (const btn of document.querySelectorAll('[data-test-scene]')) {
  btn.addEventListener('click', async () => {
    btn.disabled = true
    try { await showTestScene(btn.dataset.testScene) }
    finally { btn.disabled = false }
  })
}

// ── Two learners ────────────────────────────────────────────────────────

const knnBars = createBars($('[data-bars-knn]'))
const layerBars = createBars($('[data-bars-layer]'))
const layerFlag = $('[data-layer-flag]')
const trainBtn = $('[data-train]')
const trainSay = $('[data-train-say]')
const curve = $('[data-curve]')
const looEl = $('[data-loo]')
const looGradeEl = $('[data-loo-grade]')
const exportBtn = $('[data-export]')
const map = createMap($('[data-map]'))

let set = []              // the training set, same order everywhere (kNN, map)
let samplesStamp = 0      // bumps whenever examples change; a layer remembers the stamp it learned
let trained = null        // { layer, classes, stamp, examples, epochs, imported }
let training = null
let history = []
let judged = false        // has this session judged a full set of cameras?
let trainNote = () => t('เพิ่มตัวอย่างให้ครบทุกกลุ่ม แล้วกด “ฝึก”', 'Give every class an example, then press Train.')
function paintLabels() {
  const labels = store.getClasses().map(label)
  knnBars.setLabels(labels)
  layerBars.setLabels(labels)
  $('[data-legend]').textContent = labels.join('   ')
}

function paintTrainState() {
  const ready = store.allFilled() && set.length >= 2
  trainBtn.disabled = !ready || !!training
  exportBtn.disabled = !trained
  exportBtn.title = trained ? '' : t('ฝึกก่อนจึงจะดาวน์โหลดได้', 'Train first, then you can download')
  const stale = trained && !trained.imported && trained.stamp !== samplesStamp
  layerFlag.textContent = !trained ? `· ${t('ยังไม่ได้ฝึก', 'not trained yet')}`
    : trained.imported ? `· ${t('จากไฟล์', 'from a file')}`
      : stale ? `· ${t('ตัวอย่างเปลี่ยนแล้ว กดฝึกใหม่', 'examples changed — train again')}` : ''
  // While a run is under way the readout belongs to the live pass counter;
  // repainting it here would wipe the one number the visitor is watching.
  if (!training) {
    const missing = store.getClasses().filter(c => !c.samples.length)
    trainSay.textContent = !ready
      ? t(`เพิ่มภาพให้ครบทุกกลุ่ม ยังขาด: ${missing.map(c => store.nameOf(c, lang())).join(' / ')}`, `Add a picture to each group. Still needs pictures: ${missing.map(c => store.nameOf(c, lang())).join(' / ')}`)
      : !trained ? t('ตัวอย่างพร้อมแล้ว กด “ฝึกแล้วลองทาย” จากนั้นลองภาพใหม่', 'Examples ready. Press Train and try it, then show a new picture.')
        : stale ? t('เพิ่มหรือเปลี่ยนตัวอย่างแล้ว กดฝึกอีกครั้งเพื่อให้เครื่องเรียนรู้ภาพใหม่', 'Your examples changed. Train again so it learns from the new pictures.')
          : trainNote()
  }
}

// ── Leave-one-out: graded, and computed in slices so a big set cannot stall ─

const LOO_MIN_PER_CLASS = 5   // k = 5 cannot vote sensibly below this (handbook, ch. 7)

function gradeFor(acc, count, classes) {
  if (acc == null) return null
  if (count / classes < LOO_MIN_PER_CLASS) {
    return { cls: '', first: false, text: t(`ยังน้อยเกินไป — k = 5 ต้องการอย่างน้อย ${LOO_MIN_PER_CLASS} ภาพต่อกลุ่ม`, `Too few yet — k = 5 needs at least ${LOO_MIN_PER_CLASS} examples per class`) }
  }
  if (acc >= 0.9) return { cls: 'good', first: true, text: t('ยอดเยี่ยม — แยกกลุ่มของคุณได้เกือบหมด', 'Excellent — it separates your classes almost cleanly') }
  if (acc >= 0.75) return { cls: 'good', first: true, text: t('ดี — สองกลุ่มนี้ดูต่างกันชัดในสายตาเครื่อง', 'Good — these classes look clearly different to the machine') }
  if (acc >= 0.6) return { cls: 'ok', first: false, text: t('ปานกลาง — ตัวอย่างยังทับซ้อนกัน ลองเปลี่ยนมุมและแสง', 'Fair — your examples still overlap; vary the angle and the light') }
  return { cls: 'bad', first: false, text: t('ยังแยกไม่ออก — ใกล้เคียงการเดามั่ว (สองกลุ่ม = 50%)', 'It cannot tell them apart yet — that is near guessing (two classes = 50%)') }
}

let looToken = { cancelled: true }
let celebrated = false
async function paintLoo() {
  looToken.cancelled = true
  const ok = store.filledClasses() >= 2 && set.length >= 3
  if (!ok) {
    looEl.textContent = t('ต้องมีตัวอย่างอย่างน้อย 3 ภาพ ในอย่างน้อยสองกลุ่ม', 'Needs at least 3 examples, in at least two classes')
    looGradeEl.hidden = true
    return
  }
  const token = (looToken = { cancelled: false })
  const data = set
  const classes = store.getClasses().length
  const acc = await leaveOneOutAsync(data, classes, K, { token })
  if (token.cancelled || acc == null) return
  looEl.textContent = `${pct(acc)}  ${t(`(ถูก ${n(Math.round(acc * data.length))} จาก ${n(data.length)} ภาพ)`, `(${Math.round(acc * data.length)} of ${data.length} right)`)}`
  const grade = gradeFor(acc, data.length, classes)
  looGradeEl.hidden = !grade
  if (grade) {
    looGradeEl.textContent = grade.text
    looGradeEl.className = `loo-grade ${grade.cls}`
    if (grade.first && !celebrated) {
      celebrated = true
      toast(t('คะแนนครั้งแรกที่ดี — ตอนนี้ลองยื่นสิ่งที่มันไม่เคยเห็นให้ดู', 'First strong score — now show it something it has never seen'))
    }
    if (!grade.first) celebrated = false
  }
}

let statsTimer = 0
function refreshStats() {
  clearTimeout(statsTimer)
  statsTimer = setTimeout(() => { paintLoo(); map.rebuild(set) }, STATS_DEBOUNCE_MS)
}

// ── The four-step checklist ─────────────────────────────────────────────

const howtoEl = $('[data-howto]')
const HOWTO = {
  examples: () => store.allFilled(),
  guess: () => !!lastLive,
  train: () => !!trained,
  judge: () => judged,
}
function paintHowto() {
  if (!howtoEl) return
  for (const li of howtoEl.querySelectorAll('[data-step]')) {
    if (HOWTO[li.dataset.step]?.()) li.setAttribute('data-done', '')
    else li.removeAttribute('data-done')
  }
}

store.onChange((kind) => {
  if (kind === 'names') { paintLabels(); paintLive(); paintTrainState(); return }
  set = store.trainingSet()
  samplesStamp++
  lastLiveKey = ''
  if (kind === 'structure') {
    training?.stop()
    training = null
    trained = null
    history = []
    celebrated = false
    judged = false
    drawCurve(curve, history)
    trainNote = () => t('เพิ่มตัวอย่างให้ครบทุกกลุ่ม แล้วกด “ฝึก”', 'Give every class an example, then press Train.')
    lastLive = null
    paintLabels()
    addClassBtn.disabled = store.getClasses().length >= store.MAX_CLASSES
  }
  paintTrainState()
  paintLive()
  paintHowto()
  paintChallenge()
  refreshStats()
})

trainBtn.addEventListener('click', async () => {
  $('.training-curve').open = true
  const data = set
  const classes = store.getClasses().length
  const stamp = samplesStamp
  const job = trainLayer(data, classes, {
    onProgress: (p) => {
      history = p.history
      drawCurve(curve, history)
      trainSay.textContent = `${t('รอบ', 'pass')} ${n(p.epoch)} / ${n(EPOCHS)} · ${t('ค่าผิดพลาด', 'mistakes')} ${p.loss.toFixed(3)} · ${t('ถูก', 'right')} ${pct(p.acc)}`
    },
  })
  training = job
  paintTrainState()
  const result = await job.done
  if (training !== job) return
  training = null
  if (!result) { paintTrainState(); return }
  trained = { layer: result.layer, classes, stamp, examples: data.length, epochs: EPOCHS, imported: false }
  trainNote = () => t('ฝึกเสร็จแล้ว ลองภาพใหม่แล้วดูคำตอบด้านล่าง คะแนนตอนฝึกไม่ใช่คะแนนสอบกับภาพใหม่', 'Ready! Try a new picture and watch the answer below. Doing well on practice pictures does not mean it will get new ones right.')
  $('.training-curve').open = false
  lastLiveKey = ''
  paintTrainState()
  paintHowto()
  paintChallenge()
  toast(t(`พร้อมแล้ว! ลองภาพใหม่แล้วดูคำตอบด้านล่าง`, `Ready! Try a new picture and watch the answer below.`))
})

// ── Live prediction: a few looks a second at whatever the source shows ──

function paintLive() {
  const knn = lastLive?.knn ?? null
  const lay = lastLive?.lay ?? null
  knnBars.setProbs(knn)
  layerBars.setProbs(lay)
  const el = $('[data-live-say]')
  const probs = lay ?? knn
  if (!probs) {
    el.textContent = canGuess() ? t('กำลังดู…', 'Looking…') : t('จะเริ่มทายเมื่อมีตัวอย่างอย่างน้อยสองกลุ่ม', 'It starts guessing once two classes have examples.')
    return
  }
  const i = probs.indexOf(Math.max(...probs))
  const c = store.getClasses()[i]
  const who = lay ? t('หลังฝึก', 'after training') : t('ภาพที่คล้ายกัน', 'similar examples')
  el.textContent = c ? `${t('คล้ายที่สุด', 'Looks most like')}: ${label(c, i)} — ${pct(probs[i])} (${who})` : ''
}

function canGuess() {
  return store.filledClasses() >= 2 || !!trained
}

async function liveTick() {
  try {
    const src = specimen.source
    if (isLoaded() && !isBusy() && !document.hidden && document.querySelector('.advanced-training').open && src?.ready && canGuess()) {
      // Stills and photos only change now and then: look again only when they, or the examples, do.
      const key = src.moving ? '' : `${src.frameAt}:${samplesStamp}:${trained ? 1 : 0}`
      if (src.moving || key !== lastLiveKey) {
        lastLiveKey = key
        const x = await embed(snapshot(src))
        const classes = store.getClasses().length
        const k = store.filledClasses() >= 2 ? knnPredict(set, x, classes, K) : null
        const lay = trained?.classes === classes ? trained.layer.predict(x) : null
        lastLive = { knn: k?.probs ?? null, lay }
        paintLive()
        paintHowto()
        map.setLive(x, k?.neighbours ?? [])
      }
    } else if (!canGuess() && lastLive) {
      lastLive = null
      paintLive()
      paintHowto()
      map.setLive(null)
    }
  } catch { /* a dropped frame is not worth a message */ }
  setTimeout(liveTick, LIVE_MS)
}

// ── The shortcut game: teach it the wrong thing on purpose, and catch it ──

const challengeEl = $('[data-challenge]')
const challengeSay = $('[data-challenge-say]')
const challengeAside = document.querySelector('.challenge')
let challenge = false

function paintChallenge() {
  if (!challenge) {
    challengeAside?.removeAttribute('data-active')
    challengeSay.textContent = ''
    challengeEl.innerHTML = `<span class="th" lang="th">▶ เริ่มเกมนี้</span><span class="en" lang="en">▶ Start this game</span>`
    return
  }
  challengeAside?.setAttribute('data-active', '')
  const allFilled = store.allFilled()
  challengeSay.textContent = !allFilled
    ? t('ขั้นที่ 1 — ถือแก้วไว้ “ซ้ายมือ” เท่านั้น เพิ่มให้ครบกลุ่มละ 10 ภาพ อย่าขยังอย่างอื่น', 'Step 1 — keep the cup in your LEFT hand only. Ten per class, move nothing else')
    : !trained
      ? t('ขั้นที่ 2 — กด “ฝึก” ที่หัวข้อ 02 แล้วรอเส้นค่าผิดพลาดลดลง', 'Step 2 — press Train in section 02 and wait for the loss to fall')
      : t('ขั้นที่ 3 — ย้ายแก้วไป “ขวามือ” แล้วดูแถบคะแนนข้างบน ถ้ามันร่วงหรือสลับข้าง เครื่องเรียนรู้ “ข้างซ้าย” ไม่ใช่ “แก้ว”', 'Step 3 — slide the cup to the RIGHT and watch the bars. If the score collapses or flips, it learned “left side”, not “cup”')
  challengeEl.innerHTML = `<span class="th" lang="th">■ จบเกม</span><span class="en" lang="en">■ End the game</span>`
}

challengeEl.addEventListener('click', async () => {
  if (challenge) {
    challenge = false
    paintChallenge()
    return
  }
  if (store.hasSamples() && !(await confirmBox(t('เริ่มเกมนี้? ตัวอย่างทั้งหมดจะหายไป', 'Start this game? All your examples will be cleared.'), { ok: t('เริ่มเกม', 'Start the game'), cancel: t('ยกเลิก', 'Cancel') }))) return
  challenge = true
  presetChosen = true
  setPreset('cup')
  paintChallenge()
  toast(t('ตั้งกลุ่ม “มีแก้ว / ไม่มีแก้ว” แล้ว — ถือแก้วไว้ซ้ายมือตลอด', 'Cup / No cup is set — hold the cup in your LEFT hand throughout'))
  document.querySelector('[data-specimen]')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
})

// ── Judge the country ───────────────────────────────────────────────────

let judgeMode = 'layer'
const modeBtns = [...document.querySelectorAll('[data-judge-mode]')]
for (const b of modeBtns) {
  b.addEventListener('click', () => {
    judgeMode = b.dataset.judgeMode
    for (const x of modeBtns) x.setAttribute('aria-pressed', String(x === b))
  })
}

function judgeModels() {
  const classes = store.getClasses()
  const count = classes.length
  const frozenSet = set
  const layer = trained?.classes === count ? trained.layer : null
  const viaLayer = layer && { predict: (x) => layer.predict(x), classes, how: t('ชั้นที่ฝึกแล้ว', 'the trained layer') }
  const viaKnn = store.filledClasses() >= 2 && {
    predict: (x) => knnPredict(frozenSet, x, count, K).probs,
    classes,
    how: t('ภาพที่คล้ายกัน', 'similar examples'),
  }
  if (judgeMode === 'both') return [viaLayer, viaKnn].filter(Boolean)
  if (judgeMode === 'knn') return [viaKnn || viaLayer].filter(Boolean)
  if (viaLayer) return [viaLayer]
  // Layer mode with no usable layer: fall back, and say exactly why.
  if (!viaKnn) return []
  const why = !trained ? t(' (ยังไม่ได้ฝึกชั้น)', ' (no layer trained yet)')
    : trained.imported ? t(' (ชั้นจากไฟล์มีจำนวนกลุ่มไม่ตรง)', ' (the file’s layer has a different number of classes)')
      : t(' (ชั้นที่ฝึกไว้มีจำนวนกลุ่มไม่ตรง ฝึกใหม่ก่อน)', ' (your trained layer has a different number of classes — train again)')
  return [{ ...viaKnn, how: viaKnn.how + why }]
}

createJudge(
  { start: $('[data-judge-start]'), stop: $('[data-judge-stop]'), readout: $('[data-judge-say]'), out: $('[data-judge-out]') },
  judgeModels,
  (results, models) => {
    judged = true
    paintHowto()
    const same = models.length > 1
      ? results.filter((r) => r.top === r.probs[1].indexOf(Math.max(...r.probs[1]))).length
      : null
    toast(same == null
      ? t(`ตัดสินครบ ${n(results.length)} กล้อง — ดูกลุ่มด้านล่าง`, `Judged all ${n(results.length)} cameras — see the groups below`)
      : t(`ตัดสินครบ ${n(results.length)} กล้อง · สองวิธีเห็นตรงกัน ${n(same)} ครั้ง`, `Judged all ${n(results.length)} cameras · the two agreed ${n(same)} times`))
  },
)

// ── Keep it: export / import the trained layer (a local file, never uploaded) ─

const keepSay = $('[data-keep-say]')
exportBtn.addEventListener('click', () => {
  if (!trained) return
  const names = store.getClasses().map((c) => [store.nameOf(c, 'th'), store.nameOf(c, 'en')])
  download(layerFile(trained.layer, names, { examples: trained.examples, epochs: trained.epochs }), 'vision-train-layer.json')
  keepSay.textContent = t('ดาวน์โหลดแล้ว ไฟล์อยู่ในเครื่องของคุณ', 'Downloaded — the file is on your device.')
})

$('[data-import]').addEventListener('change', async (e) => {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return
  try {
    if (file.size > 2_000_000) {
      const err = new Error('big')
      err.code = 'big'
      throw err
    }
    const got = parseLayerFile(await file.text())
    const differ = got.names.length !== store.getClasses().length
    if (differ && store.hasSamples() && !(await confirmBox(t('ไฟล์นี้มีจำนวนกลุ่มไม่เท่าตอนนี้ ตัวอย่างทั้งหมดจะหายไป ตกลงไหม?', 'This file has a different number of classes; your examples will be cleared. Continue?'), { ok: t('เปิดไฟล์', 'Open the file'), cancel: t('ยกเลิก', 'Cancel') }))) return
    store.setNames(got.names)
    trained = { layer: got.layer, classes: got.names.length, stamp: samplesStamp, examples: got.examples ?? 0, epochs: got.epochs ?? 0, imported: true }
    trainNote = () => t('ใช้ชั้นจากไฟล์อยู่ ฝึกใหม่เมื่อไรก็จะแทนที่', 'Using the layer from your file; training again replaces it.')
    paintTrainState()
    paintHowto()
    lastLiveKey = ''
    keepSay.textContent = t('เปิดไฟล์แล้ว ทุกอย่างอยู่ในแท็บนี้', 'Opened — it stays in this tab.')
  } catch (err) {
    keepSay.textContent = `${t('เปิดไฟล์นี้ไม่ได้', 'Could not open that file')}: ${fileReason(err)}`
  }
})

// ── Language and size changes ───────────────────────────────────────────

onLang(() => {
  renderPresets()
  paintActivity()
  paintLabels()
  paintModel()
  paintLoadBar()
  statusEl.textContent = status()
  paintTrainState()
  paintLoo()
  paintLive()
  paintChallenge()
  drawCurve(curve, history)
  map.draw()
})
let resizeTimer = 0
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => { drawCurve(curve, history); map.draw() }, 150)
})

renderPresets()
store.applyPreset(preset)
paintModel()
paintHowto()
paintChallenge()
liveTick()

$('.training-details').addEventListener('toggle', () => { if ($('.training-details').open) { map.rebuild(set); map.draw() } })
paintActivity()

$('.training-curve').addEventListener('toggle', () => { if ($('.training-curve').open) drawCurve(curve, history) })

mountVideoLesson(specimen)
