// The control-room wall, small: six real cameras, and a machine that watches
// all of them at once and points at the screen where something changed.
//
// It uses the plainest machine there is — frame differencing (cv/ops.js via
// the motion lens). No model, no names, no faces: only "these pixels changed".
// That is the point of the story: the first useful thing a machine does in an
// operations centre is not to understand, but to not blink.

import { loadCatalog, pickReadable, camName, sourceName } from '../core/catalog.js'
import { openCamera, openWebcam, SourceError } from '../core/source.js?v=1.14.0'
import { runLens, createLensState } from '../cv/lenses.js'
import { t, esc, pct } from '../core/i18n.js'

const SCREENS = 6
const STILL_REFRESH_MS = 20_000
const OPEN_PAUSE_MS = 400        // open cameras one after another, not all at once
const ATTENTION_MIN_CHANGE = 0.004 // below this share of changed pixels, a screen is "quiet"

export function createWall(root) {
  const grid = root.querySelector('[data-wall]')
  const say = root.querySelector('[data-wall-say]')
  const watchBtn = root.querySelector('[data-wall-watch]')
  const mineBtn = root.querySelector('[data-wall-mine]')
  const screens = []
  let watching = false
  let started = false
  let timer = 0
  let catalogFailed = false

  function tileHtml(i) {
    return `<div class="tile wall-tile" data-screen="${i}">
      <div class="tile-view"><canvas role="img"></canvas><span class="tile-tag num">${String(i + 1).padStart(2, '0')}</span></div>
      <div class="tile-meta"><span class="who">…</span></div>
    </div>`
  }

  function lensFor(screen) {
    return () => ({ name: watching ? 'motion' : 'picture' })
  }

  function mount(i, src) {
    const s = screens[i]
    s.src?.close()
    clearInterval(s.refresh)
    s.src = src
    s.state.prevGray = null
    s.state.motion = null
    const who = s.el.querySelector('.who')
    if (src.kind === 'webcam') who.innerHTML = esc(t('กล้องของคุณ · อยู่ในเครื่องนี้เท่านั้น', 'Your camera · stays on this device'))
    else who.innerHTML = `${esc(camName(src.cam))}<br><span class="micro">${esc(sourceName(src.cam.src))}</span>`
    if (src.kind === 'still') {
      s.refresh = setInterval(() => { if (!document.hidden) src.refresh().catch(() => { /* keep last frame */ }) }, STILL_REFRESH_MS + i * 1500)
    }
  }

  /** Two openers share one queue of candidates: polite to owners, quick enough for a person. */
  async function fill(cams) {
    const queue = [...cams]
    const slots = Array.from({ length: SCREENS }, (_, i) => i)
    const worker = async () => {
      for (let i = slots.shift(); i !== undefined; i = slots.shift()) {
        while (queue.length) {
          const cam = queue.shift()
          try {
            const src = await openCamera(cam)
            if (screens[i].src?.kind === 'webcam') { src.close(); break } // the visitor took this screen meanwhile
            mount(i, src)
            break
          } catch { /* the owner did not answer; try the next camera */ }
        }
        await new Promise((r) => setTimeout(r, OPEN_PAUSE_MS))
      }
    }
    await Promise.all([worker(), worker()])
  }

  /** Which screen should the human look at? The one with the most change, if any. */
  function attend() {
    let best = null
    for (const s of screens) {
      const changed = watching && s.src?.ready ? s.state.motion?.changed ?? 0 : 0
      s.changed = changed
      if (changed >= ATTENTION_MIN_CHANGE && (!best || changed > best.changed)) best = s
    }
    for (const s of screens) {
      const hit = s === best
      s.el.classList.toggle('is-picked', hit)
      const tag = s.el.querySelector('.tile-tag')
      tag.classList.toggle('hit', hit)
      tag.textContent = hit ? t('ดูจอนี้', 'Look here') : String(s.i + 1).padStart(2, '0')
    }
    if (catalogFailed && !screens.some((x) => x.src)) return // keep the reason on screen
    if (!watching) {
      say.textContent = t('หกจอ ไม่มีใครช่วยดู ลองจ้องสักนาที แล้วถามตัวเองว่าเห็นอะไรเปลี่ยนบ้าง', 'Six screens, nobody helping. Stare for a minute, then ask yourself what changed.')
      return
    }
    const live = screens.filter((s) => s.src?.ready).length
    say.textContent = best
      ? `${t('เครื่องดูอยู่', 'Machine watching')} ${live} ${t('จอ', 'screens')} · ${t('เปลี่ยนมากที่สุด: จอ', 'most change: screen')} ${best.i + 1} (${pct(best.changed, 1)} ${t('ของพิกเซล', 'of pixels')}) · ${t('ไม่เปลี่ยน ≠ ไม่มีอะไร', 'no change ≠ nothing there')}`
      : `${t('เครื่องดูอยู่', 'Machine watching')} ${live} ${t('จอ', 'screens')} · ${t('ยังไม่มีจอไหนเปลี่ยนพอจะสะกิด', 'no screen has changed enough to flag yet')}`
  }

  async function start() {
    if (started) return
    started = true
    grid.innerHTML = Array.from({ length: SCREENS }, (_, i) => tileHtml(i)).join('')
    for (let i = 0; i < SCREENS; i++) {
      const el = grid.children[i]
      const state = createLensState()
      const screen = { i, el, state, src: null, refresh: 0, changed: 0 }
      screen.loop = runLens(el.querySelector('canvas'), () => screen.src, lensFor(screen), { fps: 8, state })
      screens.push(screen)
    }
    watchBtn.disabled = false
    mineBtn.disabled = false
    timer = setInterval(attend, 500)
    attend()
    try {
      const data = await loadCatalog()
      await fill(pickReadable(data.cameras, SCREENS * 3, { video: 2 }))
    } catch {
      catalogFailed = true
      say.textContent = t('โหลดรายชื่อกล้องไม่ได้ ลองเอากล้องของคุณขึ้นผนังแทน', 'Could not load the camera list — try putting your own camera on the wall')
    }
  }

  function toggleWatch() {
    watching = !watching
    watchBtn.setAttribute('aria-pressed', String(watching))
    for (const s of screens) { s.state.prevGray = null; s.state.motion = null }
    attend()
  }

  async function mine() {
    try {
      mount(SCREENS - 1, await openWebcam())
      if (!watching) toggleWatch()
    } catch (err) {
      say.textContent = err instanceof SourceError ? err.text : t('เปิดกล้องไม่ได้', 'Could not open the camera')
    }
  }

  root.querySelector('[data-wall-start]').addEventListener('click', start)
  watchBtn.addEventListener('click', toggleWatch)
  mineBtn.addEventListener('click', mine)
  return { start, stop() { clearInterval(timer); for (const s of screens) { s.loop.stop(); clearInterval(s.refresh); s.src?.close() } } }
}
