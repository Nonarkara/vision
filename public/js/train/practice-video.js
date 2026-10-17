// The Teach room's default clip: real public-camera frames, not a drawing.
// Busy and quiet are two cameras the catalogue already names. The learner
// captures examples from whichever scene is on screen.
import { TEACH } from '../footage/library.js?v=1.17.5'

const W = 640
const H = 360

function load(urls) {
  if (typeof Image === 'undefined') return []
  return urls.map((src) => {
    const img = new Image()
    img.decoding = 'async'
    img.src = src
    return img
  })
}

function paintFrame(g, img) {
  g.fillStyle = '#253122'
  g.fillRect(0, 0, W, H)
  if (!img || !img.complete || !img.naturalWidth) return
  const s = Math.min(W / img.naturalWidth, H / img.naturalHeight)
  const dw = img.naturalWidth * s
  const dh = img.naturalHeight * s
  g.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh)
}

export function practiceVideo() {
  const busy = load(TEACH.busy.frames)
  const quiet = load(TEACH.quiet.frames)
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const g = canvas.getContext('2d')
  let closed = false,
    t = 0,
    fixedScene = null,
    last = performance.now()
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
  const syncVisibility = () => { last = performance.now() }
  document.addEventListener('visibilitychange', syncVisibility)
  const scene = () => fixedScene ?? (Math.floor(t / 8) % 2 === 0 ? 'busy' : 'quiet')
  function frames() { return scene() === 'quiet' ? quiet : busy }
  function draw(now) {
    if (closed) return
    const dt = Math.max(0, (now - last) / 1000)
    last = now
    if (!document.hidden) t += dt
    const pack = frames()
    const index = reduced || !pack.length ? 0 : Math.floor(t * 2) % pack.length
    paintFrame(g, pack[index])
  }
  draw(last)
  return {
    kind: 'practice',
    moving: true,
    get scene() { return scene() },
    get sceneMode() { return fixedScene ?? 'auto' },
    setScene(next) { fixedScene = next === 'busy' || next === 'quiet' ? next : null },
    get ready() { return !closed },
    width: W,
    height: H,
    get frameAt() { return t },
    get credit() {
      const pack = scene() === 'quiet' ? TEACH.quiet : TEACH.busy
      return pack.camera
    },
    drawTo(ctx, w, h) {
      draw(performance.now())
      const s = Math.min(w / W, h / H)
      const dw = W * s
      const dh = H * s
      ctx.drawImage(canvas, (w - dw) / 2, (h - dh) / 2, dw, dh)
      return { x: (w - dw) / 2, y: (h - dh) / 2, w: dw, h: dh }
    },
    close() {
      closed = true
      document.removeEventListener('visibilitychange', syncVisibility)
    },
  }
}
