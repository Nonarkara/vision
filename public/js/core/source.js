// Frame sources: one interface over four very different things — a live HLS
// stream from a road agency, a still JPEG passed through our relay, the
// visitor's own webcam, and a photo the visitor chooses. Every lens, model
// and game reads frames through this, so none of them care where a picture
// came from.
//
// The privacy line runs through this file. A camera frame arrives from its
// owner (or our memory-only relay) and stays in this tab. A webcam frame or a
// chosen photo never leaves the device at all: nothing here uploads anything.

import { t } from './i18n.js'

let hlsLoading = null
function loadHls() {
  if (window.Hls) return Promise.resolve(window.Hls)
  hlsLoading ??= new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = '/vendor/hls.min.js'
    s.onload = () => resolve(window.Hls)
    s.onerror = () => { hlsLoading = null; reject(new Error('hls.js did not load')) }
    document.head.append(s)
  })
  return hlsLoading
}

// Video elements must be in the document for some browsers to keep decoding.
// They live here, invisible; what people see is always our canvas.
function holder() {
  let el = document.getElementById('feed-holder')
  if (!el) {
    el = document.createElement('div')
    el.id = 'feed-holder'
    el.setAttribute('aria-hidden', 'true')
    Object.assign(el.style, { position: 'fixed', left: '0', top: '0', width: '2px', height: '2px', overflow: 'hidden', opacity: '0', pointerEvents: 'none' })
    document.body.append(el)
  }
  return el
}

export class SourceError extends Error {
  constructor(th, en) {
    super(en)
    this.th = th
    this.en = en
  }
  get text() { return t(this.th, this.en) }
}

class FrameSource {
  constructor(kind, el, { cam = null, width = 0, height = 0, mirror = false } = {}) {
    this.kind = kind          // 'video' | 'still' | 'webcam' | 'photo'
    this.el = el              // HTMLVideoElement | ImageBitmap
    this.cam = cam
    // A front camera is shown as a mirror, because that is what people expect
    // of their own face. The flip happens here, at the source, so every lens
    // and every model downstream sees the same picture the person sees.
    this.mirror = mirror
    this._w = width
    this._h = height
    this.frameAt = Date.now()
    this._canvas = document.createElement('canvas')
    this._ctx = this._canvas.getContext('2d', { willReadFrequently: true })
    this.closed = false
  }
  get width() { return this.el.videoWidth || this.el.width || this._w }
  get height() { return this.el.videoHeight || this.el.height || this._h }
  get moving() { return this.kind === 'video' || this.kind === 'webcam' }
  get ready() { return this.width > 0 && this.height > 0 && !this.closed }

  /** Draw the frame into a context, letterboxed; returns the rectangle used. */
  drawTo(ctx, dw, dh, fit = 'contain') {
    const sw = this.width, sh = this.height
    if (this.closed || !sw || !sh) return null
    const scale = fit === 'cover' ? Math.max(dw / sw, dh / sh) : Math.min(dw / sw, dh / sh)
    const w = sw * scale, h = sh * scale
    const x = (dw - w) / 2, y = (dh - h) / 2
    this._paint(ctx, x, y, w, h)
    return { x, y, w, h }
  }

  _paint(ctx, x, y, w, h) {
    if (!this.mirror) return ctx.drawImage(this.el, x, y, w, h)
    ctx.save()
    ctx.translate(x + w, y)
    ctx.scale(-1, 1)
    ctx.drawImage(this.el, 0, 0, w, h)
    ctx.restore()
  }

  /** The current frame as ImageData, `w` wide, aspect kept. */
  grab(w = 320) {
    const sw = this.width, sh = this.height
    if (this.closed || !sw || !sh) return null
    const h = Math.max(1, Math.round((w * sh) / sw))
    if (this._canvas.width !== w || this._canvas.height !== h) { this._canvas.width = w; this._canvas.height = h }
    this._paint(this._ctx, 0, 0, w, h)
    return this._ctx.getImageData(0, 0, w, h)
  }

  /** A canvas holding the current frame at `w` wide — what models take as input. */
  canvas(w = 640) {
    this.grab(w)
    return this._canvas
  }

  async refresh() { return this }

  close() {
    this.closed = true
    if (this.el instanceof ImageBitmap) this.el.close?.()
  }
}

async function openVideo(cam) {
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.autoplay = true
  video.crossOrigin = 'anonymous'
  holder().append(video)
  let hls = null
  let src = null
  const Hls = await loadHls().catch(() => null)
  const done = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new SourceError('กล้องไม่ส่งภาพภายใน 20 วินาที', 'The camera sent no picture within 20 seconds')), 20_000)
    video.addEventListener('loadeddata', () => { clearTimeout(timer); resolve() }, { once: true })
    video.addEventListener('error', () => { clearTimeout(timer); reject(new SourceError('เบราว์เซอร์เล่นวิดีโอนี้ไม่ได้', 'This browser could not play the stream')) }, { once: true })
    if (Hls && Hls.isSupported()) {
      hls = new Hls({ maxBufferLength: 8, liveSyncDurationCount: 2, enableWorker: true, lowLatencyMode: false })
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (!data.fatal) return
        clearTimeout(timer)
        reject(new SourceError('สตรีมจากต้นทางขาด', 'The upstream stream failed'))
        // After the stream has started, a fatal error means it dropped mid-viewing.
        if (src && !src.closed) { src.closed = true; src.onended?.() }
      })
      hls.loadSource(cam.v)
      hls.attachMedia(video)
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = cam.v
    } else {
      clearTimeout(timer)
      reject(new SourceError('เบราว์เซอร์นี้เล่นสตรีม HLS ไม่ได้', 'This browser cannot play HLS streams'))
    }
  })
  try {
    await done
    video.play().catch(() => {})
  } catch (err) {
    hls?.destroy()
    video.remove()
    throw err
  }
  src = new FrameSource('video', video, { cam })
  // Browsers pause muted, invisible videos (ours live in a 2px holder) when the
  // tab is hidden, and do not always resume them. A paused live feed looks
  // like a working camera that never moves — so resume whenever we can.
  const resume = () => { if (!src.closed && video.paused && !document.hidden) video.play().catch(() => {}) }
  const onPause = () => setTimeout(resume, 500)
  video.addEventListener('pause', onPause)
  document.addEventListener('visibilitychange', resume)
  // A native-HLS player (Safari) reports drops on the element instead.
  video.addEventListener('error', () => { if (!src.closed) { src.closed = true; src.onended?.() } })
  const close = src.close.bind(src)
  src.close = () => {
    close()
    document.removeEventListener('visibilitychange', resume)
    video.removeEventListener('pause', onPause)
    hls?.destroy()
    video.removeAttribute('src')
    try { video.load() } catch { /* already gone */ }
    video.remove()
  }
  return src
}

async function fetchStill(cam) {
  const res = await fetch(`/api/frame?id=${encodeURIComponent(cam.id)}`)
  if (!res.ok) {
    let msg = ''
    try { msg = (await res.json()).error ?? '' } catch { /* not json */ }
    if (res.status === 429) throw new SourceError('ขอภาพถี่เกินไป กรุณารอสักครู่ กล้องเป็นของผู้อื่น', 'Too many frames — please wait a moment; these cameras belong to other people')
    throw new SourceError(`กล้องต้นทางไม่ตอบ (${res.status})`, `The camera's owner did not answer (${res.status}${msg ? ': ' + msg : ''})`)
  }
  const blob = await res.blob()
  try {
    return await createImageBitmap(blob)
  } catch {
    throw new SourceError('ไฟล์ที่ได้รับไม่ใช่ภาพที่อ่านได้', 'What arrived was not a readable picture')
  }
}

async function openStill(cam) {
  const bitmap = await fetchStill(cam)
  const src = new FrameSource('still', bitmap, { cam })
  src.refresh = async () => {
    const next = await fetchStill(cam)
    if (src.closed) { next.close(); return src }
    src.el?.close?.()
    src.el = next
    src.frameAt = Date.now()
    return src
  }
  return src
}

/** Open a catalogue camera. Throws SourceError with a reason a person can read. */
export async function openCamera(cam) {
  if (!cam) throw new SourceError('ไม่มีกล้อง', 'No camera')
  if (cam.k === 'video') return openVideo(cam)
  if (cam.k === 'still') return openStill(cam)
  throw new SourceError('กล้องนี้ดูได้ที่เว็บไซต์ของเจ้าของเท่านั้น ระบบอ่านพิกเซลไม่ได้', 'This camera can only be watched on its owner\'s site; no machine here can read its pixels')
}

let activeWebcam = null
let webcamRequest = 0
const WEBCAM_FIRST_FRAME_MS = 8000
const WEBCAM_PERMISSION_MS = 15000

function cameraDeadline(promise, ms, error, onLate = () => {}) {
  let expired = false
  let timer
  const result = Promise.race([
    promise.then((value) => { if (expired) onLate(value); return value }),
    new Promise((_, reject) => {
      timer = setTimeout(() => { expired = true; reject(error) }, ms)
    }),
  ])
  return result.finally(() => clearTimeout(timer))
}

export function canUseWebcam() {
  return !!navigator.mediaDevices?.getUserMedia && window.isSecureContext
}

/** How many cameras this device has — decides whether to offer "switch". Labels stay hidden until permission. */
export async function countWebcams() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    return devices.filter((d) => d.kind === 'videoinput').length
  } catch { return 0 }
}

function webcamError(err) {
  switch (err?.name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return new SourceError('คุณไม่ได้อนุญาตให้ใช้กล้อง ไม่เป็นไร ใช้กล้องสาธารณะแทนได้ (เปลี่ยนได้ที่ไอคอนกล้องในแถบที่อยู่)', 'Camera permission was declined — that is fine; use a public camera instead (you can change this from the camera icon in the address bar)')
    case 'NotFoundError':
    case 'OverconstrainedError':
      return new SourceError('ไม่พบกล้องในอุปกรณ์นี้', 'No camera was found on this device')
    case 'NotReadableError':
    case 'AbortError':
      return new SourceError('กล้องถูกใช้งานโดยแอปอื่นอยู่ ปิดแอปนั้นแล้วลองใหม่', 'The camera is busy in another app — close it and try again')
    default:
      return new SourceError('เปิดกล้องของคุณไม่ได้', 'Could not open your camera')
  }
}

/**
 * The visitor's own camera. The picture never leaves this device.
 * `facing`: 'user' (front, mirrored) or 'environment' (back, as-is).
 */
export async function openWebcam({ facing = 'user' } = {}) {
  const ticket = ++webcamRequest
  if (!canUseWebcam()) {
    throw new SourceError('เบราว์เซอร์นี้ไม่อนุญาตให้ใช้กล้อง (ต้องเปิดผ่าน https)', 'This browser does not allow camera access here (it needs https)')
  }
  // One camera owner per tab: phones refuse to open a sensor twice, so a new
  // instrument takes the camera from the last one, which is told it stopped.
  if (activeWebcam && !activeWebcam.closed) { const prev = activeWebcam; prev.close(); prev.onended?.() }
  let stream
  try {
    stream = await cameraDeadline(
      navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false }),
      WEBCAM_PERMISSION_MS,
      new SourceError('เบราว์เซอร์ยังไม่ตอบคำขอใช้กล้อง ตรวจสิทธิ์กล้องในเบราว์เซอร์แล้วลองอีกครั้ง หรือใช้รูปของคุณ', 'The browser has not answered the camera request. Check its camera permission, then try again, or use My photo.'),
      (late) => { for (const track of late.getTracks()) track.stop() },
    )
  } catch (err) {
    if (err instanceof SourceError) throw err
    throw webcamError(err)
  }
  if (ticket !== webcamRequest) {
    for (const track of stream.getTracks()) track.stop()
    throw new SourceError('มีการเลือกกล้องใหม่แล้ว', 'A newer camera was selected')
  }
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.srcObject = stream
  holder().append(video)
  try {
    await cameraDeadline(video.play(), WEBCAM_FIRST_FRAME_MS,
      new SourceError('กล้องเปิดแล้วแต่เล่นภาพไม่ได้ ลองอีกครั้งหรือใช้รูปของคุณ', 'Camera playback did not start. Try again, or use My photo.'))
    if (!video.videoWidth) {
      let firstFrame
      const arrived = new Promise((resolve) => {
        firstFrame = resolve
        video.addEventListener('loadeddata', firstFrame, { once: true })
      })
      try {
        await cameraDeadline(arrived, WEBCAM_FIRST_FRAME_MS,
          new SourceError('กล้องของคุณเปิดแล้วแต่ไม่ส่งภาพ ลองอีกครั้ง', 'Your camera opened but sent no picture — please try again'))
      } finally {
        video.removeEventListener('loadeddata', firstFrame)
      }
    }
  } catch (err) {
    for (const track of stream.getTracks()) track.stop()
    video.srcObject = null
    video.remove()
    throw err instanceof SourceError ? err : webcamError(err)
  }
  if (ticket !== webcamRequest) {
    for (const track of stream.getTracks()) track.stop()
    video.srcObject = null
    video.remove()
    throw new SourceError('มีการเลือกกล้องใหม่แล้ว', 'A newer camera was selected')
  }
  // Laptops report no facingMode; treat an unknown camera as a front camera.
  const actual = stream.getVideoTracks()[0]?.getSettings?.().facingMode
  const src = new FrameSource('webcam', video, { mirror: (actual ?? facing) !== 'environment' })
  src.facing = facing
  // If the person revokes permission or unplugs the camera, say so instead of freezing.
  for (const track of stream.getVideoTracks()) track.addEventListener('ended', () => { src.closed = true; src.onended?.() }, { once: true })
  activeWebcam = src
  const resume = () => { if (!src.closed && video.paused && !document.hidden) video.play().catch(() => {}) }
  document.addEventListener('visibilitychange', resume)
  const close = src.close.bind(src)
  src.close = () => {
    close()
    document.removeEventListener('visibilitychange', resume)
    if (activeWebcam === src) activeWebcam = null
    for (const track of stream.getTracks()) track.stop()
    video.srcObject = null
    video.remove()
  }
  return src
}

/** A photo chosen from the device. Read locally; never uploaded. */
export async function openPhoto(file) {
  if (!file || !/^image\//.test(file.type)) throw new SourceError('กรุณาเลือกไฟล์รูปภาพ', 'Please choose an image file')
  try {
    const bitmap = await createImageBitmap(file)
    return new FrameSource('photo', bitmap)
  } catch {
    throw new SourceError('เปิดรูปนี้ไม่ได้', 'Could not open that picture')
  }
}
