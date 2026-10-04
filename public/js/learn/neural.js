// Chapters 7–8: a trained network, and where it breaks. One detector serves
// both benches and loads only when someone presses the button — 17 MB is a
// real cost on a phone, and nobody should pay it just for scrolling past.

import { t, lang, onLang } from '../core/i18n.js'
import * as ops from '../cv/ops.js'
import { clear, containRect, drawDetections } from '../cv/draw.js'
import { detect, loadDetector, tally, DETECTOR_INPUT_WIDTH } from '../ml/detector.js'
import { backend } from '../ml/tf.js'
import { cocoName } from '../ml/labels.js'
import { runBench, blit, slider, parts, writer } from './bench.js'

// ── The page's one network ──────────────────────────────────────────────

const model = { status: 'idle', p: 0, listeners: new Set() }
const emitModel = () => { for (const fn of model.listeners) fn() }

function ensureModel() {
  if (model.status === 'loading' || model.status === 'ready') return
  model.status = 'loading'
  model.p = 0
  emitModel()
  loadDetector()
    .then(() => { model.status = 'ready' })
    .catch(() => { model.status = 'error' })
    .finally(emitModel)
}

document.addEventListener('modelprogress', (e) => {
  if (e.detail.name !== 'detector' || model.status !== 'loading') return
  model.p = e.detail.p
  emitModel()
})

/** Wire a chapter's "load the network" button; `onChange` runs whenever the model's status moves. */
function modelButton(chapter, onChange) {
  const btn = chapter.querySelector('[data-load]')
  const render = () => {
    btn.hidden = model.status === 'ready'
    btn.disabled = model.status === 'loading'
    btn.textContent = model.status === 'loading' ? `${t('กำลังโหลดโครงข่าย', 'Loading the network')} ${Math.round(model.p * 100)}%`
      : model.status === 'error' ? t('โหลดไม่สำเร็จ · ลองอีกครั้ง', 'Could not load · try again')
        : t('▶ โหลดโครงข่ายประสาทเทียม (≈17 MB ครั้งเดียว)', '▶ Load the neural network (≈17 MB, once)')
    onChange()
  }
  btn.addEventListener('click', ensureModel)
  model.listeners.add(render)
  onLang(render)
  render()
}

function modelSays() {
  if (model.status === 'loading') return t('กำลังโหลด… ครั้งต่อไปเบราว์เซอร์จะจำไว้', 'Loading… your browser keeps it for next time')
  if (model.status === 'error') return t('โหลดโครงข่ายไม่สำเร็จ ตรวจการเชื่อมต่อแล้วกดอีกครั้ง', 'The network did not load — check the connection and press again')
  return t('โครงข่ายยังไม่ได้โหลด กดปุ่มด้านบน ภาพยังอยู่ในเครื่องนี้เสมอ', 'The network is not loaded yet — press the button above. Pictures stay on this device either way.')
}

/**
 * Copy the source's frame into our own canvas. The source reuses one canvas
 * for every grab, and detection is asynchronous; a private copy means no
 * other bench can repaint the picture while the network is reading it.
 */
function copyFrame(src, into) {
  const c = src.canvas(DETECTOR_INPUT_WIDTH)
  into.width = c.width
  into.height = c.height
  into.getContext('2d').drawImage(c, 0, 0)
  return into
}

function summary(detections) {
  if (!detections.length) return t('ไม่พบอะไรที่มั่นใจถึง 30%', 'nothing at 30% or more')
  return Object.entries(tally(detections)).sort((a, b) => b[1] - a[1])
    .map(([cls, k]) => `${cocoName(+cls, lang())} ×${k}`).join(' · ')
}

// ── 07 — A trained network guesses ──────────────────────────────────────

const FLOOR = 0.1        // the network is asked for everything above 10%; the slider decides what is shown
const LIST_MAX = 12
const EVERY_MS = 700     // a moving picture is re-read this often; a still, once per new frame

export function detectorChapter(chapter, getSource) {
  const { canvas, readout } = parts(chapter)
  const list = chapter.querySelector('[data-list]')
  const write = writer(readout)
  const input = document.createElement('canvas')
  const run = { busy: false, at: 0, frame: -1, detections: [], ms: 0, error: null }
  const min = slider(chapter, 'min', (v) => `${v}%`, () => { bench.invalidate(); render() })
  const minScore = () => min.value / 100

  const due = (src) => (src.moving ? performance.now() - run.at > EVERY_MS : run.frame !== src.frameAt)

  function start(src) {
    run.busy = true
    const frameAt = src.frameAt
    detect(copyFrame(src, input), { minScore: FLOOR })
      .then(({ detections, ms }) => { run.detections = detections; run.ms = ms; run.error = null })
      .catch((err) => { run.error = err })
      .finally(() => { run.busy = false; run.frame = frameAt; run.at = performance.now(); bench.invalidate(); render() })
  }

  function render() {
    const cut = minScore()
    const sorted = [...run.detections].sort((a, b) => b.score - a.score)
    list.replaceChildren(...sorted.slice(0, LIST_MAX).map((d) => scoreRow(d, d.score >= cut)))
    if (model.status !== 'ready') return write(modelSays(), true)
    if (run.error) return write(t('โครงข่ายทำงานในเบราว์เซอร์นี้ไม่ได้', 'The network could not run in this browser'), true)
    if (run.frame === -1) return write(t('กำลังดู…', 'Looking…'), true)
    const above = sorted.filter((d) => d.score >= cut).length
    const below = sorted.length - above
    const none = above ? '' : `\n${t(`ไม่มีอะไรที่มั่นใจถึง ${min.value}% ซึ่งไม่ได้แปลว่าไม่มีอะไรอยู่ตรงนั้น`, `Nothing at ${min.value}% or more — which does not mean nothing is there`)}`
    write(`${above} ${t('กรอบผ่านเส้น', 'boxes pass the line')} · ${below} ${t('อยู่ใต้เส้น (ไม่แสดงบนภาพ)', 'below it (not drawn)')} · ${Math.round(run.ms)} ms · ${backend()}${none}`, true)
  }

  const bench = runBench(canvas, getSource, (ctx, src) => {
    clear(ctx)
    const rect = src.drawTo(ctx, canvas.width, canvas.height)
    if (!rect) return
    if (model.status === 'ready' && !run.busy && due(src)) start(src)
    drawDetections(ctx, run.detections.filter((d) => d.score >= minScore()), rect)
  })

  modelButton(chapter, () => { bench.invalidate(); render() })
  onLang(render)
  return {
    invalidate: bench.invalidate,
    reset() { run.detections = []; run.frame = -1; run.at = 0; render() },
  }
}

/** One row of the score list: name, a bar as long as the confidence, the number. */
function scoreRow(d, shown) {
  const row = document.createElement('div')
  row.className = shown ? 'bar top' : 'bar below'
  const name = document.createElement('span')
  name.textContent = cocoName(d.cls, lang())
  const track = document.createElement('span')
  track.className = 'bar-track'
  const fill = document.createElement('span')
  fill.className = 'bar-fill'
  fill.style.width = `${Math.round(d.score * 100)}%`
  track.append(fill)
  const num = document.createElement('span')
  num.className = 'num'
  num.textContent = `${Math.round(d.score * 100)}%`
  row.append(name, track, num)
  return row
}

// ── 08 — What it cannot do ──────────────────────────────────────────────

const COLS_MIN = 8
const COLS_MAX = DETECTOR_INPUT_WIDTH
const DISPLAY_WIDTH = 320
const LIMIT_EVERY_MS = 1200
const LIMIT_SCORE = 0.3
/** Slider 0–100 → pixels across, on a log scale so the interesting low end gets room. */
const colsFrom = (v) => Math.round(COLS_MIN * (COLS_MAX / COLS_MIN) ** (v / 100))

export function limitsChapter(chapter, getSource) {
  const { canvas, readout } = parts(chapter)
  const write = writer(readout)
  const fullIn = document.createElement('canvas')
  const lowIn = document.createElement('canvas')
  const run = { busy: false, at: 0, key: '', full: null, low: null, cols: 0, error: null }
  const res = slider(chapter, 'res', (v) => `${colsFrom(v)} px`, () => bench.invalidate())

  const keyOf = (src, cols) => `${src.moving ? 'live' : src.frameAt}|${cols}`
  const due = (src, cols) => keyOf(src, cols) !== run.key || (src.moving && performance.now() - run.at > LIMIT_EVERY_MS)

  // The same frame, read twice: once whole, once blocky. Inputs are captured
  // now, synchronously; the two detections then run one after the other.
  async function start(src, cols) {
    run.busy = true
    run.key = keyOf(src, cols)
    const full = copyFrame(src, fullIn)
    const big = src.grab(DETECTOR_INPUT_WIDTH)
    const low = ops.pixelate(big, Math.max(1, Math.round(DETECTOR_INPUT_WIDTH / cols)))
    lowIn.width = low.width
    lowIn.height = low.height
    lowIn.getContext('2d').putImageData(new ImageData(low.data, low.width, low.height), 0, 0)
    try {
      run.full = (await detect(full, { minScore: LIMIT_SCORE })).detections
      run.low = (await detect(lowIn, { minScore: LIMIT_SCORE })).detections
      run.cols = cols
      run.error = null
    } catch (err) {
      run.error = err
    } finally {
      run.busy = false
      run.at = performance.now()
      bench.invalidate()
    }
  }

  function say(cols) {
    if (model.status !== 'ready') return `${t('ภาพแตกเป็นช่องได้ทันที', 'The pixelation works now.')} ${modelSays()}`
    if (run.error) return t('โครงข่ายทำงานในเบราว์เซอร์นี้ไม่ได้', 'The network could not run in this browser')
    if (!run.full) return t('กำลังดู…', 'Looking…')
    return `${t(`ภาพเต็ม (${COLS_MAX} พิกเซล)`, `Full picture (${COLS_MAX} px)`)}: ${summary(run.full)}\n` +
      `${t(`ที่ ${run.cols} พิกเซล`, `At ${run.cols} px across`)}: ${summary(run.low)}` +
      (run.cols !== cols ? `\n${t('กำลังอ่านใหม่…', 'Reading again…')}` : '')
  }

  const bench = runBench(canvas, getSource, (ctx, src) => {
    const cols = colsFrom(res.value)
    const img = src.grab(DISPLAY_WIDTH)
    if (!img) return
    const px = ops.pixelate(img, Math.max(1, Math.round(DISPLAY_WIDTH / cols)))
    const rect = containRect(px.width, px.height, canvas.width, canvas.height)
    clear(ctx)
    blit(ctx, px, rect)
    if (model.status === 'ready' && !run.busy && due(src, cols)) start(src, cols)
    if (run.low) drawDetections(ctx, run.low, rect)
    write(say(cols), true)
  })

  modelButton(chapter, () => bench.invalidate())
  return {
    invalidate: bench.invalidate,
    reset() { run.full = null; run.low = null; run.key = ''; run.at = 0 },
  }
}
