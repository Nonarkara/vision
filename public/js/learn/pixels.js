// Chapters 1–3: what a picture is before anyone does anything clever with it.
// A grid of numbers, three numbers per square for colour, and the first
// decision a machine can make about a pixel — light or dark.

import { t, n, pct } from '../core/i18n.js'
import * as ops from '../cv/ops.js'
import { numbers as numbersLens } from '../cv/lenses.js'
import { clear, containRect, fitCanvas, GRAY, NAPLES } from '../cv/draw.js'
import { runBench, blit, slider, choice, parts, writer, tag } from './bench.js'

const WORK_WIDTH = 320 // analysis width: enough to see, cheap enough for twelve frames a second

/** 01 — A picture is numbers. The numbers lens with a "squares across" slider. */
export function numbersChapter(chapter, getSource) {
  const { canvas, readout } = parts(chapter)
  const write = writer(readout)
  const cols = slider(chapter, 'cols', (v) => `${v}`, () => bench.invalidate())
  const bench = runBench(canvas, getSource, (ctx, src) => {
    const r = numbersLens(ctx, src, null, { cols: cols.value })
    if (!r) return
    const dpr = canvas.width / Math.max(1, canvas.clientWidth)
    const here = r.cols * r.rows
    const full = src.width * src.height * 3
    const hint = r.cell < 20 * dpr ? `\n${t('เลื่อนแถบไปทางซ้ายให้ช่องใหญ่ขึ้น แล้วตัวเลขจะปรากฏ', 'Slide left until the squares are big enough to show their numbers')}` : ''
    write(
      `${t('ตารางนี้', 'This grid')}: ${r.cols} × ${r.rows} = ${n(here)} ${t('ตัวเลข', 'numbers')}\n` +
      `${t('ภาพเต็มจากแหล่งนี้', 'The full picture from this source')}: ${n(src.width)} × ${n(src.height)} × 3 ${t('สี', 'colours')} = ${n(full)} ${t('ตัวเลข', 'numbers')}${hint}`,
      !src.moving,
    )
  })
  return bench
}

/** 02 — Colour is three numbers. All four views at once, or one channel filling the bench. */
export function colourChapter(chapter, getSource) {
  const { canvas, readout } = parts(chapter)
  const write = writer(readout)
  const mode = choice(chapter, 'channel', () => bench.invalidate())
  const NAMES = { all: ['ภาพจริง', 'Picture'], r: ['แดง R', 'Red R'], g: ['เขียว G', 'Green G'], b: ['น้ำเงิน B', 'Blue B'] }

  function paintQuarter(ctx, img, which, qx, qy, qw, qh) {
    const r = containRect(img.width, img.height, qw, qh)
    const rect = { x: qx + r.x, y: qy + r.y, w: r.w, h: r.h }
    blit(ctx, which === 'all' ? img : ops.channel(img, which), rect, true)
    tag(ctx, t(...NAMES[which]), rect.x, rect.y)
  }

  const bench = runBench(canvas, getSource, (ctx, src) => {
    const img = src.grab(WORK_WIDTH)
    if (!img) return
    const W = canvas.width, H = canvas.height
    clear(ctx)
    if (mode.value === 'grid') {
      const hw = W / 2, hh = H / 2
      paintQuarter(ctx, img, 'all', 0, 0, hw, hh)
      paintQuarter(ctx, img, 'r', hw, 0, hw, hh)
      paintQuarter(ctx, img, 'g', 0, hh, hw, hh)
      paintQuarter(ctx, img, 'b', hw, hh, hw, hh)
    } else {
      paintQuarter(ctx, img, mode.value, 0, 0, W, H)
    }
    write(describeColour(img), !src.moving)
  })
  return bench
}

function describeColour(img) {
  const { data, width, height } = img
  const c = (Math.floor(height / 2) * width + Math.floor(width / 2)) * 4
  let r = 0, g = 0, b = 0
  for (let p = 0; p < data.length; p += 4) { r += data[p]; g += data[p + 1]; b += data[p + 2] }
  const k = data.length / 4
  return `${t('พิกเซลกลางภาพ', 'Centre pixel')}: R ${data[c]} · G ${data[c + 1]} · B ${data[c + 2]}\n` +
    `${t('ค่าเฉลี่ยทั้งภาพ', 'Whole-picture average')}: R ${Math.round(r / k)} · G ${Math.round(g / k)} · B ${Math.round(b / k)}`
}

/** 03 — Light or dark. A threshold slider, Otsu's automatic choice, and the histogram behind both. */
export function thresholdChapter(chapter, getSource) {
  const { canvas, readout } = parts(chapter)
  const histCanvas = chapter.querySelector('canvas[data-hist]')
  const autoBtn = chapter.querySelector('[data-otsu]')
  const write = writer(readout)
  let auto = false
  const setAuto = (on) => { auto = on; autoBtn.setAttribute('aria-pressed', String(on)); bench.invalidate() }
  const level = slider(chapter, 'level', (v) => `${v}`, () => setAuto(false))
  autoBtn.addEventListener('click', () => setAuto(!auto))

  const bench = runBench(canvas, getSource, (ctx, src) => {
    const img = src.grab(WORK_WIDTH)
    if (!img) return
    const gray = ops.toGray(img)
    if (auto) level.set(ops.otsu(gray))
    const cut = level.value
    const mask = ops.threshold(gray, cut)
    const out = new ImageData(img.width, img.height)
    let light = 0
    for (let i = 0, p = 0; i < mask.length; i++, p += 4) {
      const on = mask[i]
      light += on
      out.data[p] = on ? 251 : 16; out.data[p + 1] = on ? 230 : 16; out.data[p + 2] = on ? 160 : 16; out.data[p + 3] = 255
    }
    clear(ctx)
    blit(ctx, out, containRect(img.width, img.height, canvas.width, canvas.height))
    const hist = ops.histogram(gray)
    drawHistogram(histCanvas, hist, cut)
    const why = auto ? `\n${t('โอตสึเลือกเส้นนี้ เพราะแยกพิกเซลเป็นสองกลุ่มที่ต่างกันมากที่สุด', 'Otsu chose this line: it splits the pixels into the two most different groups')}` : ''
    write(`${t('เส้นแบ่ง', 'Line')} ${cut} · ${pct(light / mask.length)} ${t('ของพิกเซลเป็น “สว่าง”', 'of pixels are “light”')}${why}`, true)
  })
  return bench
}

/** Brightness counts, 0 on the left to 255 on the right; the line is the current cut. */
function drawHistogram(canvas, hist, cut) {
  const ctx = fitCanvas(canvas)
  const W = canvas.width, H = canvas.height
  clear(ctx)
  let max = 1
  for (let i = 1; i < 255; i++) max = Math.max(max, hist[i]) // the two ends are often clipped spikes
  const bw = W / 256
  for (let i = 0; i < 256; i++) {
    const h = Math.min(H, (hist[i] / max) * H)
    ctx.fillStyle = i >= cut ? NAPLES : GRAY
    ctx.fillRect(i * bw, H - h, Math.ceil(bw), h)
  }
  const dpr = W / Math.max(1, canvas.clientWidth)
  ctx.fillStyle = '#f7f5ef'
  ctx.fillRect(cut * bw - dpr, 0, 2 * dpr, H)
}
