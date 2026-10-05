// A demo set the page draws for itself: no photograph, no camera, no upload.
// Two synthetic road scenes — busy and empty — with an answer key, so one
// click wakes every instrument on the page (bars, map, leave-one-out, the
// curve, the judge) for someone with no webcam, no working public camera, or
// no patience.
//
// The scenes vary on purpose: sky, light, camera height, road tone, the
// number, colour and placement of vehicles. A demo that varied nothing would
// teach the network a single number, and would flatter it when the judge
// showed real cameras.

const W = 320
const H = 180
export const DEMO_PER_CLASS = 8

const CARS = ['#c9c9c4', '#8f9aa3', '#2f3a44', '#b7472f', '#d8c25a', '#3f6b52', '#7d7f85']

/** A tiny xorshift, so the demo is the same on every machine and every reload. */
function rng(seed) {
  let s = seed >>> 0 || 1
  return () => {
    s ^= s << 13; s >>>= 0
    s ^= s >> 17
    s ^= s << 5; s >>>= 0
    return s / 4294967296
  }
}

function car(g, x, y, w, colour, rand) {
  const h = w * 0.5
  const roof = h * 0.55
  g.fillStyle = colour
  g.fillRect(x, y - h, w, h)
  g.fillRect(x + w * 0.18, y - h - roof, w * 0.62, roof)
  g.fillStyle = '#1d242b'
  g.fillRect(x + w * 0.24, y - h - roof + 2, w * 0.5, roof - 3)
  g.beginPath()
  g.arc(x + w * 0.22, y, w * 0.11, 0, Math.PI * 2)
  g.arc(x + w * 0.78, y, w * 0.11, 0, Math.PI * 2)
  g.fill()
  if (rand() > 0.6) { g.fillStyle = 'rgba(255,255,255,0.55)'; g.fillRect(x + 1, y - h + 1, w - 2, 2) }
}

/** One synthetic frame. kind: 'busy' draws many vehicles, 'empty' almost none. */
export function roadScene(kind, seed) {
  const rand = rng(seed)
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const g = canvas.getContext('2d')

  const light = rand()                        // time of day, 0 = overcast, 1 = hard sun
  const horizon = Math.round(58 + rand() * 26)
  const roadTone = 70 + Math.round(light * 45 + rand() * 20)

  // Sky
  const sky = g.createLinearGradient(0, 0, 0, horizon)
  sky.addColorStop(0, `rgb(${150 + light * 60 | 0}, ${175 + light * 55 | 0}, ${200 + light * 45 | 0})`)
  sky.addColorStop(1, `rgb(${205 + light * 40 | 0}, ${210 + light * 35 | 0}, ${205 + light * 30 | 0})`)
  g.fillStyle = sky
  g.fillRect(0, 0, W, horizon)

  // A skyline, so the top half is not a flat colour the model could key on.
  g.fillStyle = `rgb(${95 + rand() * 40 | 0}, ${100 + rand() * 40 | 0}, ${105 + rand() * 40 | 0})`
  let x = 0
  while (x < W) {
    const bw = 14 + rand() * 30
    const bh = 8 + rand() * (horizon * 0.55)
    g.fillRect(x, horizon - bh, bw, bh)
    x += bw + rand() * 6
  }

  // Road
  g.fillStyle = `rgb(${roadTone}, ${roadTone + 3}, ${roadTone + 6})`
  g.fillRect(0, horizon, W, H - horizon)

  // Kerb and lane markings, in perspective.
  g.fillStyle = `rgba(255,255,255,${0.35 + light * 0.45})`
  const dash = 10 + rand() * 8
  for (let y = horizon + 8; y < H; y += dash * 2) {
    const k = (y - horizon) / (H - horizon)
    g.fillRect(W * 0.5 - 1 - k * 2, y, 2 + k * 4, dash * (0.5 + k))
  }
  g.fillStyle = `rgba(0,0,0,${0.18 + rand() * 0.15})`
  g.fillRect(0, horizon, W, 3)

  // Vehicles
  const n = kind === 'busy' ? 5 + Math.floor(rand() * 5) : (rand() > 0.75 ? 1 : 0)
  const lanes = [0.16, 0.38, 0.62, 0.85]
  const placed = []
  for (let i = 0; i < n; i++) {
    const depth = rand()                        // 0 near the horizon, 1 near the camera
    const lane = lanes[Math.floor(rand() * lanes.length)]
    const y = horizon + 8 + depth * (H - horizon - 14)
    const scale = 0.35 + depth * 1.5
    const w = 26 * scale
    const px = lane * W - w / 2 + (rand() - 0.5) * 18
    if (placed.some(([ox, oy]) => Math.abs(ox - px) < w * 0.7 && Math.abs(oy - y) < w * 0.5)) continue
    placed.push([px, y])
    car(g, px, y, w, CARS[Math.floor(rand() * CARS.length)], rand)
  }

  // Grain: a real sensor has noise, and the difference keeps two "busy"
  // frames from being near-identical.
  const img = g.getImageData(0, 0, W, H)
  const d = img.data
  const strength = 6 + rand() * 8
  for (let i = 0; i < d.length; i += 4) {
    const v = (rand() - 0.5) * strength
    d[i] += v; d[i + 1] += v; d[i + 2] += v
  }
  g.putImageData(img, 0, 0)

  // A soft vignette, so the corners differ too.
  const vig = g.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.95)
  vig.addColorStop(0, 'rgba(0,0,0,0)')
  vig.addColorStop(1, `rgba(0,0,0,${0.18 + rand() * 0.2})`)
  g.fillStyle = vig
  g.fillRect(0, 0, W, H)

  return canvas
}

/**
 * The whole demo set, interleaved: [{ y: 0 | 1, canvas }].
 * y 0 is "busy road", y 1 is "empty road" — the same order as the preset.
 */
export function demoFrames() {
  const out = []
  for (let i = 0; i < DEMO_PER_CLASS; i++) {
    out.push({ y: 0, canvas: roadScene('busy', 1000 + i * 977) })
    out.push({ y: 1, canvas: roadScene('empty', 5003 + i * 977) })
  }
  return out
}
