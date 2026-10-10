// The census: ask a few dozen cameras for one picture each, run the detector
// on every picture, and add up what it reports. It is the closest this site
// comes to "how many cars are on Thai roads right now" — and the page says
// plainly how far that is from the real answer.
//
// Politeness is the rule that shapes the code: at most two frames in flight,
// a pause after each, a hard cap on how many, and a stop button that works.
// The cameras belong to road agencies and city halls, not to us.

import { t, lang, n, pct, onLang } from '../core/i18n.js'
import { camName, sourceName, pickReadable } from '../core/catalog.js'
import { openCamera, SourceError } from '../core/source.js?v=1.13.0'
import { sleep } from '../core/site.js?v=1.13.0'
import { detect, loadDetector, DETECTOR_INPUT_WIDTH } from '../ml/detector.js'
import { STREET, cocoName } from '../ml/labels.js'
import { SIGNAL, BLACK } from '../cv/draw.js'

const CONCURRENCY = 2
const PAUSE_MS = 700
const MIN_SCORE = 0.3
const ALLOWED_N = [12, 24, 48]
const TILE_W = 480, TILE_H = 270

function emptyTally() {
  return Object.fromEntries(STREET.map((c) => [c, { count: 0, sum: 0 }]))
}

export function createCensus(root, { getPool, onStudy }) {
  const nSel = root.querySelector('[data-census-n]')
  const runBtn = root.querySelector('[data-census-run]')
  const stopBtn = root.querySelector('[data-census-stop]')
  const statusEl = root.querySelector('[data-census-status]')
  const barsEl = root.querySelector('[data-census-bars]')
  const tilesEl = root.querySelector('[data-census-tiles]')
  const resultEl = root.querySelector('[data-census-result]')

  let run = null          // { asked, tiles, tally, read, failed, ms, stopped, done, modelPct }

  // ── Words ──────────────────────────────────────────────────────────────

  function statusText() {
    if (!run) return ''
    const { asked, read, failed } = run
    if (run.modelPct !== null) return `${t('กำลังโหลดโครงข่ายประสาทเทียม (ครั้งแรกเท่านั้น)', 'Loading the neural network (first time only)')} ${run.modelPct}%`
    if (run.error) return run.error
    const seen = `${t('อ่านภาพได้', 'Frames read')} ${n(read)} / ${n(asked.length)} · ${t('ต้นทางไม่ตอบ', 'owners did not answer')} ${n(failed)}`
    if (!run.done) return `${seen}\n${t('ขอทีละไม่เกิน 2 ภาพ และเว้นจังหวะทุกครั้ง เพราะกล้องเหล่านี้เป็นของผู้อื่น', 'At most 2 frames at a time, with a pause after each — these cameras belong to other people.')}`
    const how = run.stopped ? t('หยุดก่อนครบ', 'Stopped early') : t('เสร็จแล้ว', 'Done')
    return `${how}. ${seen} · ${t('เวลาโมเดลเฉลี่ย', 'mean model time')} ${read ? Math.round(run.ms / read) : 0} ms/${t('ภาพ', 'frame')}`
  }

  function renderBars() {
    const rows = STREET.map((c) => ({ c, ...run.tally[c] }))
    const total = rows.reduce((s, r) => s + r.count, 0)
    const sum = rows.reduce((s, r) => s + r.sum, 0)
    const max = Math.max(1, ...rows.map((r) => r.count))
    const top = total ? rows.reduce((a, b) => (b.count > a.count ? b : a)).c : null
    const html = rows.map((r) => {
      const mean = r.count ? ` · ${pct(r.sum / r.count)}` : ''
      return `<div class="bar${r.c === top ? ' top' : ''}"><span>${cocoName(r.c, lang())}<span class="census-mean">${mean}</span></span><div class="bar-track"><div class="bar-fill" data-w="${(r.count / max) * 100}"></div></div><span class="num">${n(r.count)}</span></div>`
    })
    html.push(`<div class="bar census-total"><span>${t('รวมทุกประเภท', 'All street classes')}</span><span class="micro">${total ? `${t('ความมั่นใจเฉลี่ย', 'mean confidence')} ${pct(sum / total)}` : ''}</span><span class="num">${n(total)}</span></div>`)
    // Labels come from our own COCO table and numbers from our own arithmetic — no catalogue text here.
    barsEl.innerHTML = html.join('')
    for (const fill of barsEl.querySelectorAll('[data-w]')) fill.style.width = `${fill.dataset.w}%`
  }

  function renderTile(tile) {
    const { cam, state, detections } = tile
    tile.who.textContent = camName(cam)
    tile.src.textContent = sourceName(cam.src)
    const street = detections.filter((d) => STREET.includes(d.cls))
    tile.tag.classList.toggle('hit', street.length > 0)
    if (state === 'wait') { tile.tag.textContent = '…'; tile.found.textContent = t('รอคิว', 'Waiting its turn'); return }
    if (state === 'busy') { tile.tag.textContent = '…'; tile.found.textContent = t('กำลังขอภาพจากเจ้าของ', 'Asking the owner for a frame'); return }
    if (state === 'fail') { tile.tag.textContent = t('ไม่ตอบ', 'no answer'); tile.found.textContent = tile.why; return }
    if (state === 'skip') { tile.tag.textContent = '—'; tile.found.textContent = t('ไม่ได้ขอ (หยุดแล้ว)', 'Not asked (stopped)'); return }
    tile.tag.textContent = n(street.length)
    if (!street.length) { tile.found.textContent = t('ไม่เห็นอะไรบนถนนที่มั่นใจเกิน 30%', 'Nothing on the street above 30%'); return }
    const counts = {}
    for (const d of street) counts[d.cls] = [(counts[d.cls]?.[0] ?? 0) + 1, (counts[d.cls]?.[1] ?? 0) + d.score]
    tile.found.textContent = Object.entries(counts)
      .sort((a, b) => b[1][0] - a[1][0])
      .map(([c, [k, s]]) => `${cocoName(+c, lang())} ×${k} (${pct(s / k)})`)
      .join(' · ')
  }

  function render() {
    statusEl.textContent = statusText()
    if (!run) return
    resultEl.hidden = false
    renderBars()
    for (const tile of run.tiles) renderTile(tile)
  }

  // ── Tiles ──────────────────────────────────────────────────────────────

  function makeTile(cam) {
    const el = document.createElement('div')
    el.className = 'tile'
    el.innerHTML = '<div class="tile-view"><canvas></canvas><span class="tile-tag"></span></div><div class="tile-meta"><span class="who"></span><span class="micro census-src"></span><span class="micro census-found"></span></div><div class="tile-actions"><button class="btn" type="button"></button></div>'
    const canvas = el.querySelector('canvas')
    canvas.width = TILE_W
    canvas.height = TILE_H
    const btn = el.querySelector('button')
    btn.addEventListener('click', () => onStudy(cam))
    const tile = { cam, el, canvas, btn, state: 'wait', detections: [], why: '', who: el.querySelector('.who'), src: el.querySelector('.census-src'), found: el.querySelector('.census-found'), tag: el.querySelector('.tile-tag') }
    btn.textContent = t('ศึกษากล้องนี้', 'Study this')
    return tile
  }

  /** Frame plus boxes. Words and numbers for each box are in the caption below, in the reader's language. */
  function paintTile(tile, src, detections) {
    const ctx = tile.canvas.getContext('2d')
    ctx.fillStyle = BLACK
    ctx.fillRect(0, 0, TILE_W, TILE_H)
    const r = src.drawTo(ctx, TILE_W, TILE_H)
    if (!r) return
    ctx.strokeStyle = SIGNAL
    ctx.lineWidth = 3
    for (const d of detections) ctx.strokeRect(r.x + d.x * r.w, r.y + d.y * r.h, d.w * r.w, d.h * r.h)
  }

  // ── The run ────────────────────────────────────────────────────────────

  // One detection at a time: two frames may be in flight, but the GPU does one picture at a time anyway.
  let chain = Promise.resolve()
  function detectOne(input) {
    const job = chain.then(() => detect(input, { minScore: MIN_SCORE }))
    chain = job.catch(() => {})
    return job
  }

  async function study(tile) {
    tile.state = 'busy'
    renderTile(tile)
    let src = null
    try {
      src = await openCamera(tile.cam)
      const { detections, ms } = await detectOne(src.canvas(DETECTOR_INPUT_WIDTH))
      const street = detections.filter((d) => STREET.includes(d.cls))
      paintTile(tile, src, street)
      for (const d of street) { run.tally[d.cls].count++; run.tally[d.cls].sum += d.score }
      tile.detections = detections
      tile.state = 'done'
      run.read++
      run.ms += ms
    } catch (err) {
      tile.state = 'fail'
      tile.why = err instanceof SourceError ? err.text : t('อ่านภาพนี้ไม่สำเร็จ', 'Could not read this frame')
      run.failed++
    } finally {
      src?.close()
    }
    render()
  }

  async function worker(queue) {
    while (!run.stopped && queue.length) {
      await study(queue.shift())
      if (!run.stopped && queue.length) await sleep(PAUSE_MS)
    }
  }

  async function start() {
    if (run && !run.done) return
    const want = ALLOWED_N.includes(Number(nSel.value)) ? Number(nSel.value) : 24
    const asked = pickReadable(getPool().filter((c) => c.k === 'still'), want)
    if (!asked.length) {
      run = null
      statusEl.textContent = t('ตัวกรองตอนนี้ไม่มีกล้องภาพนิ่งที่เครื่องอ่านได้ ลองล้างตัวกรอง', 'Your filters leave no readable still cameras — try clearing them.')
      return
    }
    run = { asked, tiles: asked.map(makeTile), tally: emptyTally(), read: 0, failed: 0, ms: 0, stopped: false, done: false, modelPct: 0, error: null }
    tilesEl.replaceChildren(...run.tiles.map((x) => x.el))
    runBtn.disabled = true
    stopBtn.disabled = false
    render()
    try {
      await loadDetector()
      run.modelPct = null
      render()
      const queue = [...run.tiles]
      await Promise.all(Array.from({ length: CONCURRENCY }, () => worker(queue)))
      for (const tile of queue) tile.state = 'skip'
    } catch {
      run.modelPct = null
      run.error = t('โหลดโครงข่ายประสาทเทียมไม่สำเร็จ ลองใหม่อีกครั้ง', 'The neural network did not load — please try again.')
    } finally {
      run.done = true
      runBtn.disabled = false
      stopBtn.disabled = true
      render()
    }
  }

  runBtn.addEventListener('click', start)
  stopBtn.addEventListener('click', () => { if (run) { run.stopped = true; stopBtn.disabled = true } })
  document.addEventListener('modelprogress', (e) => {
    if (e.detail.name !== 'detector' || !run || run.modelPct === null) return
    run.modelPct = Math.round(e.detail.p * 100)
    statusEl.textContent = statusText()
  })
  onLang(() => {
    render()
    if (run) for (const tile of run.tiles) tile.btn.textContent = t('ศึกษากล้องนี้', 'Study this')
  })

  return { get running() { return !!run && !run.done } }
}
