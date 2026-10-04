// /train: a Teachable-Machine-style room. Your examples go in on the right,
// the frozen network turns each into 1,280 numbers, and two small learners
// decide on top: nearest neighbours (instant) and a trained layer (watch it
// learn). Then the thing you taught goes out to judge the country's cameras.
//
// Everything — examples, weights, predictions — lives in this tab's memory.

import '../core/site.js'
import { t, n, pct, lang, onLang } from '../core/i18n.js'
import { toast } from '../core/site.js'
import { createSpecimen, startSpecimen, specimenBarHtml } from '../core/specimen.js'
import { canUseWebcam } from '../core/source.js'
import { runLens, createLensState } from '../cv/lenses.js'
import { knnPredict, leaveOneOut } from '../ml/learner.js'
import * as store from '../train/store.js'
import { snapshot, shrink, embed, isBusy, isLoaded } from '../train/eye.js'
import { createClassList } from '../train/classes-ui.js'
import { createBars } from '../train/bars.js'
import { trainLayer, drawCurve, EPOCHS, layerFile, download, parseLayerFile } from '../train/layer.js'
import { createMap } from '../train/map.js'
import { createJudge } from '../train/judge.js'

const K = 5
const LIVE_MS = 250
const STATS_DEBOUNCE_MS = 400

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
viewState.textContent = t('กำลังหากล้องที่ตอบ…', 'Finding a camera that answers…')
startSpecimen(specimen).then((src) => { if (!src) viewState.textContent = t('ยังไม่มีกล้องตอบ ลองกด ↻ หรือใช้กล้องของคุณ', 'No camera answered yet — press ↻ or use your own camera') })

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
  if (e.detail.done) say(() => t('โครงข่ายพร้อมแล้ว ครั้งแรกอาจช้าสักครู่ระหว่างที่การ์ดจอเตรียมตัว', 'The network is ready. The very first look can take a moment while the graphics card warms up.'))
  else say(() => `${t('กำลังโหลดโครงข่าย (13 MB ครั้งแรกเท่านั้น)', 'Loading the network (13 MB, first time only)')} ${Math.round(modelP * 100)}%`)
})
say(() => t('กด “เพิ่มตัวอย่าง” ครั้งแรก แล้วโครงข่ายจะโหลด (13 MB ครั้งเดียว)', 'The network loads (13 MB, once) when you add your first example.'))

// ── Classes and examples ────────────────────────────────────────────────

const label = (c, i) => `${store.GLYPHS[i]} ${store.nameOf(c, lang())}`

async function capture(key, { quiet }) {
  const src = specimen.source
  if (!src?.ready) { if (!quiet) toast(t('ยังไม่มีภาพ รอกล้องสักครู่', 'No picture yet — wait for the camera')); return }
  if (store.isFull(key)) { if (!quiet) toast(t(`กลุ่มนี้เต็มแล้ว (${store.MAX_PER_CLASS} ภาพ)`, `This class is full (${store.MAX_PER_CLASS} examples)`)); return }
  const snap = snapshot(src)
  if (!snap) return
  const thumb = shrink(snap)
  try {
    const x = await embed(snap)
    paintModel()
    if (!store.addSample(key, { x, thumb })) return
    const list = store.getClasses()
    const i = list.findIndex((c) => c.key === key)
    if (i >= 0) say(() => `+1 → ${label(list[i], i)} (${n(store.getClasses()[i]?.samples.length ?? 0)})`)
  } catch {
    say(() => t('โหลดโครงข่ายไม่สำเร็จ ลองอีกครั้ง', 'The network did not load — try again'))
  }
}

createClassList($('[data-classes]'), { onCapture: capture })
const addClassBtn = $('[data-add-class]')
addClassBtn.addEventListener('click', () => store.addClass())

const presetEl = $('[data-preset]')
let preset = 'ab'
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
presetEl.addEventListener('change', () => {
  if (store.hasSamples() && !confirm(t('เริ่มใหม่ด้วยชุดนี้? ตัวอย่างทั้งหมดจะหายไป', 'Start again with this set? All examples will be cleared.'))) { presetEl.value = preset; return }
  preset = presetEl.value
  store.applyPreset(preset)
})

// ── Two learners ────────────────────────────────────────────────────────

const knnBars = createBars($('[data-bars-knn]'))
const layerBars = createBars($('[data-bars-layer]'))
const layerFlag = $('[data-layer-flag]')
const trainBtn = $('[data-train]')
const trainSay = $('[data-train-say]')
const curve = $('[data-curve]')
const looEl = $('[data-loo]')
const exportBtn = $('[data-export]')
const map = createMap($('[data-map]'))

let set = []              // the training set, same order everywhere (kNN, map)
let samplesStamp = 0      // bumps whenever examples change; a layer remembers the stamp it learned
let trained = null        // { layer, classes, stamp, examples, epochs, imported }
let training = null
let history = []
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
  const stale = trained && !trained.imported && trained.stamp !== samplesStamp
  layerFlag.textContent = !trained ? `· ${t('ยังไม่ได้ฝึก', 'not trained yet')}`
    : trained.imported ? `· ${t('จากไฟล์', 'from a file')}`
      : stale ? `· ${t('ตัวอย่างเปลี่ยนแล้ว กดฝึกใหม่', 'examples changed — train again')}` : ''
  trainSay.textContent = trainNote()
}

function paintLoo() {
  const ok = store.filledClasses() >= 2 && set.length >= 3
  const acc = ok ? leaveOneOut(set, store.getClasses().length, K) : null
  looEl.textContent = acc == null
    ? t('ต้องมีตัวอย่างอย่างน้อย 3 ภาพ ในอย่างน้อยสองกลุ่ม', 'Needs at least 3 examples, in at least two classes')
    : `${pct(acc)}  ${t(`(ถูก ${n(Math.round(acc * set.length))} จาก ${n(set.length)} ภาพ)`, `(${Math.round(acc * set.length)} of ${set.length} right)`)}`
}

let statsTimer = 0
function refreshStats() {
  clearTimeout(statsTimer)
  statsTimer = setTimeout(() => { paintLoo(); map.rebuild(set) }, STATS_DEBOUNCE_MS)
}

store.onChange((kind) => {
  if (kind === 'names') { paintLabels(); paintLive(); return }
  set = store.trainingSet()
  samplesStamp++
  lastLiveKey = ''
  if (kind === 'structure') {
    training?.stop()
    training = null
    trained = null
    history = []
    drawCurve(curve, history)
    trainNote = () => t('เพิ่มตัวอย่างให้ครบทุกกลุ่ม แล้วกด “ฝึก”', 'Give every class an example, then press Train.')
    lastLive = null
    paintLabels()
    addClassBtn.disabled = store.getClasses().length >= store.MAX_CLASSES
  }
  paintTrainState()
  paintLive()
  refreshStats()
})

trainBtn.addEventListener('click', async () => {
  const data = set
  const classes = store.getClasses().length
  const stamp = samplesStamp
  let last = { loss: 0, acc: 0 }
  const job = trainLayer(data, classes, {
    onProgress: (p) => {
      history = p.history
      last = p
      drawCurve(curve, history)
      trainSay.textContent = `${t('รอบ', 'pass')} ${n(p.epoch)} / ${n(EPOCHS)} · ${t('ค่าผิดพลาด', 'loss')} ${p.loss.toFixed(3)} · ${t('ถูก', 'right')} ${pct(p.acc)}`
    },
  })
  training = job
  paintTrainState()
  const result = await job.done
  if (training !== job) return
  training = null
  if (!result) { paintTrainState(); return }
  const ms = result.computeMs
  trained = { layer: result.layer, classes, stamp, examples: data.length, epochs: EPOCHS, imported: false }
  const secs = (ms / 1000).toFixed(2)
  trainNote = () => t(
    `${n(EPOCHS)} รอบ · ${n(data.length)} ตัวอย่าง · คำนวณจริง ${secs} วินาที (ภาพเคลื่อนช้าลงให้ดูทัน) · ค่าผิดพลาด ${last.loss.toFixed(3)} · ถูก ${pct(last.acc)} บนตัวอย่างที่ใช้ฝึก`,
    `${EPOCHS} passes · ${data.length} examples · ${secs} s of arithmetic (drawn slower so you can watch) · loss ${last.loss.toFixed(3)} · ${pct(last.acc)} right on its own examples`)
  lastLiveKey = ''
  paintTrainState()
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
  const who = lay ? t('ชั้นที่ฝึกแล้ว', 'trained layer') : t('เพื่อนบ้านใกล้สุด', 'nearest neighbours')
  el.textContent = c ? `${t('คล้ายที่สุด', 'Looks most like')}: ${label(c, i)} — ${pct(probs[i])} (${who})` : ''
}

function canGuess() {
  return store.filledClasses() >= 2 || !!trained
}

async function liveTick() {
  try {
    const src = specimen.source
    if (isLoaded() && !isBusy() && !document.hidden && src?.ready && canGuess()) {
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
        map.setLive(x, k?.neighbours ?? [])
      }
    } else if (!canGuess() && lastLive) {
      lastLive = null
      paintLive()
      map.setLive(null)
    }
  } catch { /* a dropped frame is not worth a message */ }
  setTimeout(liveTick, LIVE_MS)
}

// ── Judge the country ───────────────────────────────────────────────────

let judgeMode = 'layer'
const modeBtns = [...document.querySelectorAll('[data-judge-mode]')]
for (const b of modeBtns) {
  b.addEventListener('click', () => {
    judgeMode = b.dataset.judgeMode
    for (const x of modeBtns) x.setAttribute('aria-pressed', String(x === b))
  })
}

function judgeModel() {
  const classes = store.getClasses()
  const layer = trained?.classes === classes.length ? trained.layer : null
  const viaLayer = layer && { predict: (x) => layer.predict(x), classes, how: t('ชั้นที่ฝึกแล้ว', 'the trained layer') }
  const frozenSet = set
  const viaKnn = store.filledClasses() >= 2 && {
    predict: (x) => knnPredict(frozenSet, x, classes.length, K).probs,
    classes,
    how: `${t('เพื่อนบ้านใกล้สุด', 'nearest neighbours')}${judgeMode === 'layer' && !layer ? t(' (ยังไม่ได้ฝึกชั้น)', ' (no layer trained yet)') : ''}`,
  }
  return (judgeMode === 'layer' ? viaLayer || viaKnn : viaKnn || viaLayer) || null
}

createJudge({ start: $('[data-judge-start]'), stop: $('[data-judge-stop]'), readout: $('[data-judge-say]'), out: $('[data-judge-out]') }, judgeModel)

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
    if (file.size > 2_000_000) throw new Error('too big')
    const got = parseLayerFile(await file.text())
    const differ = got.names.length !== store.getClasses().length
    if (differ && store.hasSamples() && !confirm(t('ไฟล์นี้มีจำนวนกลุ่มไม่เท่าตอนนี้ ตัวอย่างทั้งหมดจะหายไป ตกลงไหม?', 'This file has a different number of classes; your examples will be cleared. Continue?'))) return
    store.setNames(got.names)
    trained = { layer: got.layer, classes: got.names.length, stamp: samplesStamp, examples: got.examples ?? 0, epochs: got.epochs ?? 0, imported: true }
    trainNote = () => t('ใช้ชั้นจากไฟล์อยู่ ฝึกใหม่เมื่อไรก็จะแทนที่', 'Using the layer from your file; training again replaces it.')
    paintTrainState()
    lastLiveKey = ''
    keepSay.textContent = t('เปิดไฟล์แล้ว ทุกอย่างอยู่ในแท็บนี้', 'Opened — it stays in this tab.')
  } catch (err) {
    keepSay.textContent = `${t('เปิดไฟล์นี้ไม่ได้', 'Could not open that file')}: ${err.message}`
  }
})

// ── Language and size changes ───────────────────────────────────────────

onLang(() => {
  renderPresets()
  paintLabels()
  paintModel()
  statusEl.textContent = status()
  paintTrainState()
  paintLoo()
  paintLive()
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
liveTick()
