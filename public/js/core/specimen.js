// The specimen: the one picture a page is currently studying. A page opens
// one source and every bench on it reads from that, so ten lenses cost one
// stream. The bar that controls it always names the camera and its owner.

import { loadCatalog, pickReadable, camName, sourceName, shuffle, isReadable } from './catalog.js'
import { openCamera, openWebcam, openPhoto, openLocalVideo, SourceError, canUseWebcam, countWebcams } from './source.js?v=1.10.0'
import { t, bi, esc, onLang } from './i18n.js'
import { toast } from './site.js?v=1.10.0'

const STILL_REFRESH_MS = 20_000

export function createSpecimen({ bar = null, prefer = 'video', refreshStills = true } = {}) {
  let source = null
  let cams = []
  let queue = []
  let refreshTimer = null
  let searching = null
  let request = 0
  const barSize = bar?.classList.contains('specimen-bar') && 'ResizeObserver' in window
    ? new ResizeObserver(() => document.documentElement.style.setProperty('--specimen-height', `${bar.getBoundingClientRect().height}px`)) : null
  barSize?.observe(bar)
  const listeners = new Set()
  const errorListeners = new Set()

  function emit() {
    for (const fn of listeners) fn(source)
    document.dispatchEvent(new CustomEvent('specimenchange'))
  }

  function setSource(next, ticket) {
    // A late public-camera response must never override a newer choice.
    if (ticket !== request) { next?.close(); return false }
    source?.close()
    source = next
    if (next && !next.onended) {
      next.onended = () => { if (source === next) status(t('สตรีมนี้ขาดไป กด ↻ เพื่อดูกล้องอื่น', 'This stream dropped — press ↻ for another camera')) }
    }
    clearInterval(refreshTimer)
    if (source?.kind === 'still' && refreshStills) {
      const current = source
      let refreshing = false
      refreshTimer = setInterval(async () => {
        if (document.hidden || refreshing) return
        refreshing = true
        try {
          await current.refresh()
          if (source === current && !current.closed) emit()
        } catch { /* keep the last good frame */ }
        finally { refreshing = false }
      }, STILL_REFRESH_MS)
    }
    render()
    emit()
    return true
  }

  async function ensureCatalog() {
    if (cams.length) return
    const data = await loadCatalog()
    cams = data.cameras
  }

  function nextCandidates() {
    if (!queue.length) {
      const vids = shuffle(cams.filter((c) => c.k === 'video'))
      const stills = pickReadable(cams, 30)
      queue = prefer === 'video' ? [...vids.slice(0, 4), ...stills] : [...stills, ...vids.slice(0, 2)]
    }
    return queue
  }

  /** Open the next camera that actually answers. Tries a few before giving up. */
  async function next() {
    if (searching === request) return source
    const ticket = ++request
    searching = ticket
    status(t('กำลังหากล้องที่ตอบ…', 'Finding a camera that answers…'))
    try {
      await ensureCatalog()
      for (let attempt = 0; attempt < 6 && ticket === request; attempt++) {
        const cam = nextCandidates().shift()
        if (!cam) break
        try {
          const src = await openCamera(cam)
          return setSource(src, ticket) ? src : null
        } catch { /* try the next camera */ }
      }
      if (ticket !== request) return null
      status(t('ไม่มีกล้องตอบตอนนี้ ลองใช้กล้องของคุณเองหรือรูปของคุณ', 'No camera is answering right now — try your own camera or a photo'))
      return null
    } catch {
      if (ticket !== request) return null
      status(t('โหลดรายชื่อกล้องไม่ได้', 'Could not load the camera list'))
      return null
    } finally {
      if (searching === ticket) searching = null
    }
  }

  async function useCamera(cam) {
    if (!isReadable(cam)) throw new SourceError('กล้องนี้ระบบอ่านพิกเซลไม่ได้', 'No machine here can read this camera')
    const ticket = ++request
    status(t('กำลังเปิดกล้อง…', 'Opening camera…'))
    try {
      const src = await openCamera(cam)
      return setSource(src, ticket) ? src : null
    } catch (err) {
      // Whatever was showing keeps showing; the bar names it again.
      if (ticket !== request) return null
      if (source) render()
      throw err
    }
  }

  let facing = 'user'
  let webcamCount = 0

  /** Open the visitor's camera. Resolves to the source, or null with the reason shown in the bar. */
  async function useWebcam(nextFacing = facing) {
    const ticket = ++request
    status(t('กำลังขออนุญาตใช้กล้องของคุณ…', 'Asking for your camera…'))
    // Release the current camera first: phones refuse a second open of the same sensor.
    if (source?.kind === 'webcam') { source.close(); source = null }
    try {
      const src = await openWebcam({ facing: nextFacing })
      if (ticket !== request) { src.close(); return null }
      facing = nextFacing
      src.onended = () => { if (source === src) status(t('กล้องของคุณหยุดส่งภาพ หรือถูกใช้ที่เครื่องมืออื่นบนหน้านี้ กด “กล้องของฉัน” เพื่อใช้ที่นี่', 'Your camera stopped, or another instrument on this page is using it — press “My camera” to use it here')) }
      if (!setSource(src, ticket)) return null
      // Device enumeration is optional; a pending browser response must not
      // hold a working camera behind the startup message.
      countWebcams().then((count) => {
        if (source !== src || ticket !== request) return
        webcamCount = count
        render()
      })
      return src
    } catch (err) {
      if (ticket !== request) return null
      const text = err instanceof SourceError ? err.text : t('เปิดกล้องไม่ได้', 'Could not open the camera')
      // Keep showing whatever was on screen; the reason goes in a toast.
      if (source) { render(); toast(text, 10000) }
      status(text)
      for (const fn of errorListeners) fn(text, !!source)
      return null
    }
  }

  function flipWebcam() {
    return useWebcam(facing === 'user' ? 'environment' : 'user')
  }

  async function usePhoto(file) {
    const ticket = ++request
    try {
      const src = await openPhoto(file)
      return setSource(src, ticket) ? src : null
    } catch (err) {
      if (ticket !== request) return null
      status(err instanceof SourceError ? err.text : t('เปิดรูปไม่ได้', 'Could not open the picture'))
    }
  }

  function status(text) {
    const el = bar?.querySelector('[data-specimen-name]')
    if (el) el.textContent = text
  }

  function describe() {
    if (!source) return { name: '', meta: '' }
    if (source.kind === 'webcam') return { name: t('กล้องของคุณ', 'Your camera'), meta: t('ภาพอยู่ในเครื่องของคุณเท่านั้น ไม่ถูกส่งไปไหน', 'The picture stays on this device; nothing is sent anywhere') }
    if (source.kind === 'photo') return { name: t('รูปของคุณ', 'Your photo'), meta: t('เปิดในเครื่องของคุณ ไม่ได้อัปโหลด', 'Opened on this device; not uploaded') }
    if (source.kind === 'practice') return { name: t('วิดีโอฝึกที่วาดในหน้านี้', 'Drawn practice video'), meta: t('ภาพจำลอง ไม่ใช่ถนนจริง · รถแน่นสลับถนนโล่งทุก 8 วินาที', 'Simulation, not a real road · busy and quiet alternate every 8 seconds') }
    if (source.kind === 'localvideo') return { name: t('วิดีโอของคุณ', 'Your video'), meta: t('เปิดในเครื่อง ไม่อัปโหลด', 'Played locally; not uploaded') }
    const c = source.cam
    const kind = c.k === 'video' ? t('วิดีโอสด', 'live video') : t('ภาพนิ่ง ส่งต่อผ่านหน่วยความจำ', 'still, relayed in memory')
    return { name: camName(c), meta: `${t('ภาพจาก', 'Image')}: ${sourceName(c.src)} · ${kind}`, link: c.w }
  }

  function render() {
    if (!bar) return
    const d = describe()
    const name = bar.querySelector('[data-specimen-name]')
    const meta = bar.querySelector('[data-specimen-meta]')
    if (name) name.textContent = d.name
    if (meta) meta.innerHTML = esc(d.meta) + (d.link ? ` · <a href="${esc(d.link)}" target="_blank" rel="noopener">${esc(t('ดูที่เจ้าของ', 'view at owner'))} ↗</a>` : '')
    const mine = source?.kind === 'webcam'
    bar.querySelector('[data-specimen-webcam]')?.setAttribute('aria-pressed', String(mine))
    const flip = bar.querySelector('[data-specimen-flip]')
    if (flip) flip.hidden = !(mine && webcamCount > 1)
  }

  if (bar) {
    bar.querySelector('[data-specimen-next]')?.addEventListener('click', () => next())
    const cam = bar.querySelector('[data-specimen-webcam]')
    if (cam && !canUseWebcam()) cam.hidden = true
    cam?.addEventListener('click', () => useWebcam())
    bar.querySelector('[data-specimen-flip]')?.addEventListener('click', () => flipWebcam())
    const file = bar.querySelector('[data-specimen-photo]')
    file?.addEventListener('change', () => { if (file.files?.[0]) usePhoto(file.files[0]); file.value = '' })
    onLang(render)
  }

  return {
    get source() { return source },
    next, useCamera, useWebcam, flipWebcam, usePhoto,
    async useVideo(file) {
      const ticket = ++request
      try { const src = await openLocalVideo(file); return setSource(src, ticket) ? src : null }
      catch(err) { if(ticket !== request)return null; throw err }
    },
    useLocal(src) { return setSource(src, ++request) },
    on(fn) { listeners.add(fn); return () => listeners.delete(fn) },
    onError(fn) { errorListeners.add(fn); return () => errorListeners.delete(fn) },
    close() { request++; barSize?.disconnect(); clearInterval(refreshTimer); source?.close(); source = null; render(); emit() },
  }
}

/** True when the page was opened as ?source=mine — "start with my own camera". */
export function wantsWebcam() {
  return new URLSearchParams(location.search).get('source') === 'mine' && canUseWebcam()
}

/**
 * Start a page's specimen: the visitor's camera when asked for by URL, a
 * public camera otherwise. If the webcam is refused, fall back to a public one.
 */
export async function startSpecimen(specimen) {
  if (wantsWebcam()) {
    const src = await specimen.useWebcam()
    if (src) return src
  }
  return specimen.next()
}

/** The standard specimen bar markup — controls for choosing what to study. */
export function specimenBarHtml() {
  return `
  <div class="specimen-bar field-black" data-specimen>
    <div class="specimen-who">
      <span class="label">${bi('กำลังศึกษา', 'Studying')}</span>
      <strong data-specimen-name>…</strong>
      <span class="micro" data-specimen-meta></span>
    </div>
    <div class="controls">
      <button class="btn" type="button" data-specimen-next>↻ ${bi('กล้องอื่น', 'Another camera')}</button>
      <button class="btn" type="button" data-specimen-webcam aria-pressed="false">● ${bi('กล้องของฉัน', 'My camera')}</button>
      <button class="btn" type="button" data-specimen-flip hidden>⇄ ${bi('สลับกล้อง', 'Switch camera')}</button>
      <label class="btn">${bi('รูปของฉัน', 'My photo')}<input type="file" accept="image/*" class="vh" data-specimen-photo></label>
    </div>
  </div>`
}
