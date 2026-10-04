// "Judge the country": point what you just taught at public cameras it has
// never seen. One camera at a time, with a pause between, because every
// frame is a request to somebody else's server. The model is frozen at the
// moment you press start, so retraining mid-run cannot muddle the results.

import { t, esc, n, pct, lang, onLang } from '../core/i18n.js'
import { loadCatalog, pickReadable, camName, sourceName } from '../core/catalog.js'
import { openCamera } from '../core/source.js'
import { sleep } from '../core/site.js'
import { snapshot, shrink, embed } from './eye.js'
import { GLYPHS, nameOf } from './store.js'

export const JUDGE_COUNT = 24
const PAUSE_MS = 700
const BACKOFF_MS = 6000
const SURE = 0.7
// The owner link comes from the catalogue, which we do not control: web links only.
const webLink = (u) => (typeof u === 'string' && /^https?:\/\//i.test(u) ? u : '')

/**
 * els: { start, stop, readout, out }. getModel() returns
 * { predict(x) → probs, classes: [class snapshot], how: string } or null.
 */
export function createJudge(els, getModel) {
  let running = false
  let stopAsked = false
  let results = []
  let model = null
  let failed = 0
  let note = ''

  function setRunning(on) {
    running = on
    els.start.disabled = on
    els.stop.disabled = !on
  }

  async function run() {
    if (running) return
    model = getModel()
    if (!model) { els.readout.textContent = t('ยังไม่มีอะไรให้ตัดสิน ต้องมีตัวอย่างอย่างน้อยสองกลุ่มก่อน', 'Nothing to judge with yet — add examples to at least two classes first'); return }
    setRunning(true)
    stopAsked = false
    results = []
    failed = 0
    render()
    try {
      const data = await loadCatalog()
      const cams = pickReadable(data.cameras, JUDGE_COUNT)
      for (let i = 0; i < cams.length && !stopAsked; i++) {
        note = t(`กำลังขอภาพจากกล้องที่ ${n(i + 1)} จาก ${n(cams.length)}…`, `Asking camera ${i + 1} of ${cams.length}…`)
        paintReadout()
        const waited = await judgeOne(cams[i])
        if (!stopAsked) await sleep(waited ? BACKOFF_MS : PAUSE_MS)
      }
      note = stopAsked ? t('หยุดแล้ว', 'Stopped') : t('เสร็จแล้ว', 'Done')
    } catch {
      note = t('โหลดรายชื่อกล้องไม่ได้', 'Could not load the camera list')
    } finally {
      setRunning(false)
      paintReadout()
    }
  }

  /** Returns true when the server asked us to slow down. */
  async function judgeOne(cam) {
    let src = null
    try {
      src = await openCamera(cam)
      const snap = snapshot(src)
      if (!snap) throw new Error('empty frame')
      const thumb = shrink(snap, 320)
      const x = await embed(snap)
      const probs = model.predict(x)
      results = [...results, { cam, thumb, probs, top: probs.indexOf(Math.max(...probs)) }]
      render()
      return false
    } catch (err) {
      failed++
      return /429|Too many/.test(err?.en ?? err?.message ?? '')
    } finally {
      src?.close()
    }
  }

  function paintReadout() {
    const done = results.length
    const lines = [
      note,
      done || failed ? t(`ตัดสินแล้ว ${n(done)} กล้อง · ไม่ตอบ ${n(failed)} กล้อง`, `Judged ${done} cameras · ${failed} did not answer`) : '',
      model ? `${t('ใช้', 'Using')}: ${model.how}` : '',
    ]
    els.readout.textContent = lines.filter(Boolean).join('\n')
  }

  function tileFor(r, classes) {
    const tile = document.createElement('article')
    tile.className = 'tile'
    const p = r.probs[r.top]
    const sure = p >= SURE
    const name = nameOf(classes[r.top], lang())
    tile.innerHTML = `
      <div class="tile-view"></div>
      <span class="tile-tag${sure ? ' hit' : ''}">${esc(GLYPHS[r.top])} ${esc(name)} ${pct(p)}${sure ? '' : ` · ${esc(t('ไม่แน่ใจ', 'unsure'))}`}</span>
      <div class="tile-meta"><span class="who">${esc(camName(r.cam))}</span><span class="micro judge-owner">${esc(sourceName(r.cam.src))}${webLink(r.cam.w) ? ` · <a href="${esc(webLink(r.cam.w))}" target="_blank" rel="noopener">${esc(t('ดูที่เจ้าของ', 'owner'))} ↗</a>` : ''}</span></div>`
    tile.querySelector('.tile-view').append(r.thumb)
    return tile
  }

  // Grouped by the class the model chose, most confident first within each.
  function render() {
    paintReadout()
    if (!model) { els.out.replaceChildren(); return }
    const classes = model.classes
    const groups = classes.map((c, y) => ({ c, y, items: results.filter((r) => r.top === y).sort((a, b) => b.probs[b.top] - a.probs[a.top]) }))
    const blocks = groups.filter((g) => g.items.length).map((g) => {
      const sec = document.createElement('section')
      sec.className = 'verdict'
      const h = document.createElement('h3')
      h.textContent = `${GLYPHS[g.y]} ${nameOf(g.c, lang())} · ${n(g.items.length)}`
      const grid = document.createElement('div')
      grid.className = 'tiles'
      grid.append(...g.items.map((r) => tileFor(r, classes)))
      sec.append(h, grid)
      return sec
    })
    els.out.replaceChildren(...blocks)
  }

  els.start.addEventListener('click', run)
  els.stop.addEventListener('click', () => { stopAsked = true; note = t('กำลังหยุด…', 'Stopping…'); paintReadout() })
  els.stop.disabled = true
  onLang(render)

  return { get running() { return running } }
}
