// The learning half of transfer learning: one layer of weights on top of the
// frozen network, trained in front of you. Each animation frame runs as many
// passes over the examples as fit in a few milliseconds, then redraws the
// curve — so "training" is something you watch happen, not a spinner.

import { createLayer } from '../ml/learner.js'
import { EMBED_SIZE } from '../ml/embedder.js'
import { fitCanvas, clear, canvasScale, NAPLES, GRAY } from '../cv/draw.js'
import { t } from '../core/i18n.js'

export const EPOCHS = 200
const FRAME_BUDGET_MS = 10
// A small set trains 200 passes in a few milliseconds — too fast to see. At
// most two passes per frame keeps the curve watchable (~2 s at 60 fps); the
// readout reports the real arithmetic time separately.
const MAX_PASSES_PER_FRAME = 2
const FORMAT = 'vision.nonarkara.org/train-layer'

/**
 * Train a fresh layer on `samples` ([{x, y}]). Calls onProgress({ epoch,
 * loss, acc, history, computeMs }) every frame and resolves with
 * { layer, computeMs }, or null if stopped. Returns { done, stop }.
 */
export function trainLayer(samples, classes, { epochs = EPOCHS, onProgress } = {}) {
  const layer = createLayer(EMBED_SIZE, classes)
  const history = []
  let stopped = false
  let raf = 0
  let computeMs = 0
  let finish
  const done = new Promise((resolve) => {
    finish = resolve
    const frame = () => {
      if (stopped) return resolve(null)
      const start = performance.now()
      let passes = 0
      do {
        history.push(layer.step(samples))
        passes++
      } while (history.length < epochs && passes < MAX_PASSES_PER_FRAME && performance.now() - start < FRAME_BUDGET_MS)
      computeMs += performance.now() - start
      const last = history[history.length - 1]
      onProgress?.({ epoch: history.length, loss: last.loss, acc: last.acc, history, computeMs })
      if (stopped) return resolve(null)
      if (history.length >= epochs) return resolve({ layer, computeMs })
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
  })
  return { done, stop() { stopped = true; cancelAnimationFrame(raf); finish(null) } }
}

/**
 * The curve: loss falling (Naples) and training accuracy rising (gray),
 * each named at its end so neither depends on colour.
 */
export function drawCurve(canvas, history, epochs = EPOCHS) {
  const ctx = fitCanvas(canvas)
  clear(ctx)
  const W = canvas.width, H = canvas.height
  const dpr = canvasScale(canvas)
  const pad = { l: 40 * dpr, r: 84 * dpr, t: 16 * dpr, b: 28 * dpr }
  const pw = W - pad.l - pad.r, ph = H - pad.t - pad.b
  const yMax = Math.max(1, ...history.map((h) => h.loss))
  const X = (i) => pad.l + (i / Math.max(1, epochs - 1)) * pw
  const Y = (v) => pad.t + ph - (v / yMax) * ph

  ctx.font = `${Math.round(11 * dpr)}px "JetBrains Mono", "IBM Plex Sans Thai", monospace`
  ctx.fillStyle = GRAY
  ctx.textBaseline = 'middle'
  ctx.fillRect(pad.l, pad.t + ph, pw, Math.max(1, dpr))
  ctx.fillText('0', pad.l - 18 * dpr, Y(0))
  ctx.fillText(yMax.toFixed(1), pad.l - 34 * dpr, Y(yMax))
  ctx.textBaseline = 'top'
  ctx.fillText(t(`รอบที่ฝึก → ${epochs}`, `passes → ${epochs}`), pad.l, pad.t + ph + 8 * dpr)
  if (!history.length) return

  const line = (key, colour, dash) => {
    ctx.strokeStyle = colour
    ctx.lineWidth = 2 * dpr
    ctx.setLineDash(dash.map((d) => d * dpr))
    ctx.beginPath()
    history.forEach((h, i) => (i ? ctx.lineTo(X(i), Y(h[key])) : ctx.moveTo(X(i), Y(h[key]))))
    ctx.stroke()
    ctx.setLineDash([])
  }
  line('acc', GRAY, [5, 4])
  line('loss', NAPLES, [])

  const last = history[history.length - 1]
  const tag = (text, v, colour) => {
    ctx.fillStyle = colour
    ctx.textBaseline = 'middle'
    ctx.fillText(text, X(history.length - 1) + 6 * dpr, Y(v))
  }
  tag(`${t('ค่าผิดพลาด', 'loss')} ${last.loss.toFixed(2)}`, last.loss, NAPLES)
  tag(`${t('ถูก', 'acc')} ${Math.round(last.acc * 100)}%`, last.acc, GRAY)
}

/** A predictor rebuilt from saved weights (an imported file). */
export function layerFromWeights({ dim, classes, W, b }) {
  const Wf = Float32Array.from(W), bf = Float32Array.from(b)
  function predict(x) {
    const z = new Array(classes)
    for (let c = 0; c < classes; c++) {
      let s = bf[c]
      const off = c * dim
      for (let i = 0; i < dim; i++) s += Wf[off + i] * x[i]
      z[c] = s
    }
    const max = Math.max(...z)
    const e = z.map((v) => Math.exp(v - max))
    const sum = e.reduce((a, v) => a + v, 0)
    return e.map((v) => v / sum)
  }
  return { predict, export: () => ({ dim, classes, W: Array.from(Wf), b: Array.from(bf) }) }
}

/** What goes in the downloaded file: weights and names. No pictures, no embeddings. */
export function layerFile(layer, names, { examples, epochs }) {
  return JSON.stringify({
    format: FORMAT,
    version: 1,
    created: new Date().toISOString(),
    embedder: 'MobileNetV2 1.0/224, average-pool features (1,280 numbers)',
    examples,
    epochs,
    names,
    ...layer.export(),
  })
}

/** Download text as a file. Made on this device; nothing is uploaded. */
export function download(text, filename) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const isNum = (v) => typeof v === 'number' && Number.isFinite(v)
const isName = (s) => typeof s === 'string' && s.length > 0 && s.length <= 32

/**
 * Read a layer file chosen by the visitor. The file is untrusted input, so
 * every field is checked before any of it is used. Returns { layer, names }
 * or throws an Error whose `.code` names the problem, so the page can say it
 * in whichever language the visitor is reading.
 */
const REASONS = [
  ['json', 'ไฟล์นี้ไม่ใช่ JSON', 'this file is not JSON'],
  ['format', 'ไฟล์นี้ไม่ใช่ไฟล์ชั้นของหน้านี้', 'not a layer file from this page'],
  ['shape', 'รูปทรงไม่ถูกต้อง — ต้องมี 1,280 ตัวเลขและ 2–4 กลุ่ม', 'wrong shape — expected 1,280 numbers and 2–4 classes'],
  ['weights', 'ค่าน้ำหนักในไฟล์เสียหาย', 'the weights in the file are damaged'],
  ['biases', 'ค่า bias ในไฟล์เสียหาย', 'the biases in the file are damaged'],
  ['names', 'รายชื่อกลุ่มในไฟล์เสียหาย', 'the class names in the file are damaged'],
  ['big', 'ไฟล์ใหญ่เกินไป', 'the file is too large'],
]
export function fileReason(err) {
  const found = REASONS.find(([code]) => code === err?.code)
  if (found) return t(found[1], found[2])
  return String(err?.message ?? err)
}

export function parseLayerFile(text) {
  let d
  try { d = JSON.parse(text) } catch { throw fail('json') }
  if (d?.format !== FORMAT || d.version !== 1) throw fail('format')
  const { dim, classes, W, b, names } = d
  if (dim !== EMBED_SIZE || !Number.isInteger(classes) || classes < 2 || classes > 4) throw fail('shape')
  if (!Array.isArray(W) || W.length !== dim * classes || !W.every(isNum)) throw fail('weights')
  if (!Array.isArray(b) || b.length !== classes || !b.every(isNum)) throw fail('biases')
  if (!Array.isArray(names) || names.length !== classes) throw fail('names')
  const pairs = names.map((p) => (Array.isArray(p) && p.length === 2 && p.every(isName) ? [p[0], p[1]] : null))
  if (pairs.includes(null)) throw fail('names')
  return {
    layer: layerFromWeights({ dim, classes, W, b }),
    names: pairs,
    examples: Number.isInteger(d.examples) ? d.examples : null,
    epochs: Number.isInteger(d.epochs) ? d.epochs : null,
  }
}

function fail(code) {
  const err = new Error(code)
  err.code = code
  return err
}
