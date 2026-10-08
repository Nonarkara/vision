// "Judge the country": point what you just taught at public cameras it has
// never seen. One camera at a time, with a pause between, because every
// frame is a request to somebody else's server. The model is frozen at the
// moment you press start, so retraining mid-run cannot muddle the results.
//
// One run can carry one learner or two: racing the trained layer against
// nearest neighbours over the same 24 cameras is how you find out whether
// training actually bought you anything.

import { t, esc, n, pct, lang, onLang } from '../core/i18n.js'
import { loadCatalog, pickReadable, camName, sourceName } from '../core/catalog.js'
import { openCamera } from '../core/source.js?v=1.10.1'
import { sleep } from '../core/site.js?v=1.10.1'
import { snapshot, shrink, embed } from './eye.js'
import { GLYPHS, nameOf } from './store.js?v=1.10.1'

export const JUDGE_COUNT = 24
const PAUSE_MS = 700
const BACKOFF_MS = 6000
const SURE = 0.7
// The owner link comes from the catalogue, which we do not control: web links only.
const webLink = (u) => (typeof u === 'string' && /^https?:\/\//i.test(u) ? u : '')

/**
 * els: { start, stop, readout, out }. getModels() returns an array of
 * { predict(x) → probs, classes: [class snapshot], how: string } — one entry
 * to judge with a single learner, two to race them. onDone(results) fires
 * once per finished run, for the page's checklist.
 */
export function createJudge(els, getModels, onDone) {
  let running = false
  let stopAsked = false
  let results = []
  let models = []
  let classes = []
  let failed = 0
  let note = ''

  function setRunning(on) {
    running = on
    els.start.disabled = on
    els.stop.disabled = !on
  }

  async function run() {
    if (running) return
    models = getModels()
    if (!models.length) { els.readout.textContent = t('ยังไม่มีอะไรให้ตัดสิน ต้องมีตัวอย่างอย่างน้อยสองกลุ่มก่อน', 'Nothing to judge with yet — add examples to at least two classes first'); return }
    classes = models[0].classes
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
      if (!stopAsked) onDone?.(results, models)
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
      const probs = models.map((m) => m.predict(x))
      results = [...results, { cam, thumb, probs, top: probs[0].indexOf(Math.max(...probs[0])) }]
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
      models.length ? `${t('ใช้', 'Using')}: ${models.map((m) => m.how).join(models.length > 1 ? ` ${t('เทียบกับ', 'vs')} ` : '')}` : '',
      models.length > 1 && done ? agreement(done) : '',
    ]
    els.readout.textContent = lines.filter(Boolean).join('\n')
  }

  /** How often the two learners picked the same class — the point of racing them. */
  function agreement(done) {
    const same = results.filter((r) => r.top === r.probs[1].indexOf(Math.max(...r.probs[1]))).length
    return t(`ทั้งสองเห็นตรงกัน ${n(same)} จาก ${n(done)} กล้อง`, `The two agreed on ${same} of ${done} cameras`)
  }

  function tileFor(r) {
    const tile = document.createElement('article')
    tile.className = 'tile'
    const p = r.probs[0][r.top]
    const sure = p >= SURE
    const name = nameOf(classes[r.top], lang())
    tile.innerHTML = `
      <div class="tile-view"></div>
      <span class="tile-tag${sure ? ' hit' : ''}">${esc(GLYPHS[r.top])} ${esc(name)} ${pct(p)}${sure ? '' : ` · ${esc(t('ไม่แน่ใจ', 'unsure'))}`}</span>
      ${altFor(r)}
      <div class="tile-meta"><span class="who">${esc(camName(r.cam))}</span><span class="micro judge-owner">${esc(sourceName(r.cam.src))}${webLink(r.cam.w) ? ` · <a href="${esc(webLink(r.cam.w))}" target="_blank" rel="noopener">${esc(t('ดูที่เจ้าของ', 'owner'))} ↗</a>` : ''}</span></div>`
    tile.querySelector('.tile-view').append(r.thumb)
    return tile
  }

  /** The second learner's verdict on the same picture, marked agree/differ. */
  function altFor(r) {
    if (models.length < 2) return ''
    const q = r.probs[1]
    const i = q.indexOf(Math.max(...q))
    const same = i === r.top
    const word = same ? t('ตรงกัน', 'agrees') : t('ต่างกัน', 'differs')
    return `<span class="tile-alt ${same ? 'agree' : 'differs'}">${esc(GLYPHS[i])} ${esc(nameOf(classes[i], lang()))} ${pct(q[i])} · ${esc(word)}</span>`
  }

  // Grouped by the class the first learner chose, most confident first within each.
  function render() {
    paintReadout()
    if (!models.length) { els.out.replaceChildren(); return }
    const groups = classes.map((c, y) => ({ c, y, items: results.filter((r) => r.top === y).sort((a, b) => b.probs[0][b.top] - a.probs[0][a.top]) }))
    const blocks = groups.filter((g) => g.items.length).map((g) => {
      const sec = document.createElement('section')
      sec.className = 'verdict'
      const h = document.createElement('h3')
      h.textContent = `${GLYPHS[g.y]} ${nameOf(g.c, lang())} · ${n(g.items.length)}`
      const grid = document.createElement('div')
      grid.className = 'tiles'
      grid.append(...g.items.map((r) => tileFor(r)))
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
