// A demo set the page draws for itself: no photograph, no camera, no upload.
// Two synthetic road scenes — busy and empty — with an answer key, so one
// click wakes every instrument on the page (bars, map, leave-one-out, the
// curve, the judge) for someone with no webcam, no working public camera, or
// no patience.
//
// The scene is drawn with a real pinhole projection: one vanishing point on
// the horizon, road edges and lane markings that converge with distance, and
// every vehicle a solid box at its true relative size. So a lorry ahead is
// bigger than a hatchback beside it, and a car reads as a car — not as two
// stacked rectangles.
//
// The scenes vary on purpose: sky, light, camera height, lane count, road
// tone, the number, colour and placement of vehicles. A demo that varied
// nothing would teach the network a single number, and would flatter it when
// the judge showed real cameras.

const W = 320
const H = 180
export const DEMO_PER_CLASS = 8

const CARS = ['#c9c9c4', '#8f9aa3', '#2f3a44', '#b7472f', '#d8c25a', '#3f6b52', '#7d7f85', '#c26a3d', '#48607a', '#a9b0b5']

// Real body sizes in metres: length, width, height, and how much of the roof
// the cabin takes. Mostly cars, with the pickups, vans, lorries and buses a
// Thai road actually carries — on 3.2 m lanes, like the Drive room.
const SHAPES = [
  [4.3, 1.78, 1.45, 0.56], // hatchback
  [4.7, 1.82, 1.48, 0.6], // sedan
  [5.3, 1.86, 1.82, 0.62], // pickup
  [5.6, 2.0, 2.05, 0.78], // van
  [7.4, 2.35, 2.9, 0.84], // lorry
  [9.8, 2.5, 3.1, 0.86], // bus
]

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

/** Darken (k < 0) or lighten toward white (k > 0) a #rrggbb colour. */
function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16)
  let r = (n >> 16) & 255, gg = (n >> 8) & 255, b = n & 255
  if (k < 0) { r *= 1 + k; gg *= 1 + k; b *= 1 + k } else { r += (255 - r) * k; gg += (255 - gg) * k; b += (255 - b) * k }
  return `rgb(${r | 0},${gg | 0},${b | 0})`
}

/** One synthetic frame. kind: 'busy' draws many vehicles, 'empty' almost none. */
export function roadScene(kind, seed) {
  const rand = rng(seed)
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const g = canvas.getContext('2d')

  const light = rand() // time of day, 0 = overcast, 1 = hard sun
  const hor = Math.round(54 + rand() * 20) // horizon line in pixels
  const f = W * (1.02 + rand() * 0.14) // focal length in pixels
  const camH = 1.4 + rand() * 1.5 // camera height in metres (dashcam-ish)
  const camX = (rand() - 0.5) * 1.2 // camera a little off the centre line
  const NEAR = 2.2 // nothing in front of this plane is drawn

  // A point in the world — x lateral (m), z forward (m), h up (m) — onto the
  // screen. Everything converges on (W/2, hor) as z grows: one vanishing point.
  const flat = (x, z, h = 0) => {
    if (z < NEAR) return null
    const s = f / z
    return { x: W / 2 + (x - camX) * s, y: hor + (camH - h) * s, s, z }
  }
  const poly = (pts, fill) => {
    const sp = []
    for (const p of pts) {
      const q = flat(p[0], p[1], p[2] || 0)
      if (!q) return false
      sp.push(q)
    }
    g.beginPath()
    sp.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)))
    g.closePath()
    g.fillStyle = fill
    g.fill()
    return true
  }
  const stroke = (a, b, colour, w) => {
    const p = flat(a[0], a[1], a[2] || 0), q = flat(b[0], b[1], b[2] || 0)
    if (!p || !q) return
    g.beginPath()
    g.moveTo(p.x, p.y)
    g.lineTo(q.x, q.y)
    g.strokeStyle = colour
    g.lineWidth = w
    g.stroke()
  }

  // --- Sky -----------------------------------------------------------------
  const sky = g.createLinearGradient(0, 0, 0, hor)
  sky.addColorStop(0, `rgb(${(120 + light * 70) | 0}, ${(160 + light * 60) | 0}, ${(200 + light * 45) | 0})`)
  sky.addColorStop(1, `rgb(${(205 + light * 40) | 0}, ${(210 + light * 35) | 0}, ${(206 + light * 30) | 0})`)
  g.fillStyle = sky
  g.fillRect(0, 0, W, hor)

  // Sun or moon, with a soft halo, so the light has a direction.
  const sx = W * (0.12 + rand() * 0.76), sy = hor * (0.16 + rand() * 0.42)
  const halo = g.createRadialGradient(sx, sy, 2, sx, sy, 34 + rand() * 20)
  halo.addColorStop(0, `rgba(255,250,230,${0.4 + light * 0.3})`)
  halo.addColorStop(1, 'rgba(255,250,230,0)')
  g.fillStyle = halo
  g.fillRect(sx - 60, sy - 60, 120, 120)
  g.beginPath()
  g.arc(sx, sy, 7 + rand() * 6, 0, Math.PI * 2)
  g.fillStyle = light > 0.45 ? 'rgba(255,246,214,0.95)' : 'rgba(238,238,232,0.9)'
  g.fill()

  // A couple of clouds, so the top half is not a flat colour.
  for (let i = 0, n = 1 + Math.floor(rand() * 3); i < n; i++) {
    const cx = rand() * W, cy = 6 + rand() * (hor * 0.55), cw = 20 + rand() * 40
    g.beginPath()
    g.ellipse(cx, cy, cw, 5 + rand() * 6, 0, 0, Math.PI * 2)
    g.fillStyle = `rgba(255,255,255,${0.25 + rand() * 0.3})`
    g.fill()
  }

  // A distant skyline, so the horizon is busy with things the model must ignore.
  const haze = `rgb(${(150 + rand() * 30) | 0}, ${(158 + rand() * 30) | 0}, ${(168 + rand() * 30) | 0})`
  let bx = 0
  while (bx < W) {
    const bw = 10 + rand() * 26
    const bh = 6 + rand() * (hor * 0.5)
    g.fillStyle = haze
    g.fillRect(bx, hor - bh, bw, bh)
    bx += bw + rand() * 5
  }

  // --- Ground and road -----------------------------------------------------
  const verge = `rgb(${(78 + rand() * 30) | 0}, ${(88 + rand() * 26) | 0}, ${(66 + rand() * 22) | 0})`
  g.fillStyle = verge
  g.fillRect(0, hor, W, H - hor)

  const nLanes = rand() > 0.55 ? 4 : 2
  const halfRoad = nLanes * 1.6
  const laneCentres = []
  for (let i = 0; i < nLanes; i++) laneCentres.push(-halfRoad + 1.6 + i * 3.2)

  const roadTone = 68 + Math.round(light * 40 + rand() * 22)
  const roadColour = `rgb(${roadTone}, ${roadTone + 3}, ${roadTone + 7})`
  const zFar = 220
  // Footways first, then the road on top of them.
  poly([[-halfRoad - 1.5, NEAR + 0.01, 0], [halfRoad + 1.5, NEAR + 0.01, 0], [halfRoad + 1.5, zFar, 0], [-halfRoad - 1.5, zFar, 0]], `rgb(${(120 + rand() * 20) | 0}, ${(120 + rand() * 20) | 0}, ${(118 + rand() * 20) | 0})`)
  poly([[-halfRoad, NEAR + 0.01, 0], [halfRoad, NEAR + 0.01, 0], [halfRoad, zFar, 0], [-halfRoad, zFar, 0]], roadColour)

  // Kerbs: a pale strip just outside each edge.
  for (const side of [-1, 1]) {
    poly([[side * halfRoad, NEAR + 0.01, 0], [side * (halfRoad + 0.16), NEAR + 0.01, 0], [side * (halfRoad + 0.16), 120, 0], [side * halfRoad, 120, 0]], `rgb(${(196 + rand() * 24) | 0}, ${(196 + rand() * 24) | 0}, ${(192 + rand() * 24) | 0})`)
  }
  // Two faint wheel tracks, darker wear down the road.
  for (const side of [-1, 1]) {
    const c = side * halfRoad * 0.55
    poly([[c - 0.5, NEAR + 0.01, 0], [c + 0.5, NEAR + 0.01, 0], [c + 0.5, zFar, 0], [c - 0.5, zFar, 0]], 'rgba(0,0,0,0.06)')
  }

  // Lane markings that really converge: dashes between lanes, solid at the edges.
  const white = `rgba(255,255,255,${0.4 + light * 0.45})`
  for (let lane = 1; lane < nLanes; lane++) {
    const lx = -halfRoad + lane * 3.2
    if (nLanes === 4 && lane === 2) {
      for (let z = NEAR + 2; z < 150; z += 7) poly([[lx - 0.1, z, 0], [lx + 0.1, z, 0], [lx + 0.1, z + 3.4, 0], [lx - 0.1, z + 3.4, 0]], white)
    } else {
      poly([[lx - 0.08, NEAR + 0.01, 0], [lx + 0.08, NEAR + 0.01, 0], [lx + 0.08, 150, 0], [lx - 0.08, 150, 0]], white)
    }
  }
  for (const side of [-1, 1]) {
    const lx = side * (halfRoad - 0.3)
    poly([[lx - 0.1, NEAR + 0.01, 0], [lx + 0.1, NEAR + 0.01, 0], [lx + 0.1, zFar, 0], [lx - 0.1, zFar, 0]], white)
  }

  // --- Buildings and lamps along both kerbs --------------------------------
  const facades = []
  for (const side of [-1, 1]) {
    let z = 7
    while (z < 140) {
      const depth = 5 + rand() * 11
      const h = 3 + rand() * 9
      const x = side * (halfRoad + 1.7)
      facades.push({ side, x, z, depth, h })
      z += depth + 0.8 + rand() * 3
    }
  }
  facades.sort((a, b) => b.z - a.z)
  for (const b of facades) {
    const tone = `rgb(${(96 + rand() * 26) | 0}, ${(92 + rand() * 24) | 0}, ${(86 + rand() * 22) | 0})`
    poly([[b.x, b.z, 0], [b.x, b.z + b.depth, 0], [b.x, b.z + b.depth, b.h], [b.x, b.z, b.h]], tone)
    // A few windows in perspective.
    for (let wz = b.z + 1; wz < b.z + b.depth - 0.6; wz += 1.6) {
      for (let hh = 1.2; hh < b.h - 0.8; hh += 1.7) {
        if (rand() < 0.35) continue
        poly([[b.x, wz, hh], [b.x, wz + 0.9, hh], [b.x, wz + 0.9, hh + 0.9], [b.x, wz, hh + 0.9]], `rgba(${(180 + light * 60) | 0}, ${(190 + light * 55) | 0}, ${(160 + light * 70) | 0}, 0.55)`)
      }
    }
  }
  for (const side of [-1, 1]) {
    for (let z = 10; z < 130; z += 17) {
      const x = side * (halfRoad + 0.5)
      stroke([x, z, 0], [x, z, 5.5], '#5b6167', 2)
      stroke([x, z, 5.4], [x - side * 0.9, z, 5.7], '#3c4247', 2)
    }
  }

  // --- Vehicles ------------------------------------------------------------
  const shapesAt = () => {
    const r = rand()
    return r < 0.46 ? SHAPES[0] : r < 0.74 ? SHAPES[1] : r < 0.86 ? SHAPES[2] : r < 0.93 ? SHAPES[3] : r < 0.975 ? SHAPES[4] : SHAPES[5]
  }
  const firstZ = (len) => NEAR + len / 2 + 0.6
  const cars = []
  const n = kind === 'busy' ? 6 + Math.floor(rand() * 4) : rand() > 0.72 ? 1 : 0
  const laneLast = laneCentres.map((c) => ({ x: c, last: 0 }))
  for (let i = 0; i < n; i++) {
    const laneIndex = Math.floor(rand() * laneCentres.length)
    const lane = laneLast[laneIndex]
    const [len, wid, hgt, cabFrac] = shapesAt()
    const zNear = Math.max(firstZ(len), lane.last + 2.8 + rand() * 6)
    lane.last = zNear
    if (zNear > 160) continue
    cars.push({
      cx: lane.x + (rand() - 0.5) * 0.24,
      cz: zNear,
      len, wid, hgt, cabFrac,
      colour: CARS[Math.floor(rand() * CARS.length)],
    })
  }
  cars.sort((a, b) => b.cz - a.cz)

  for (const c of cars) {
    const hw = c.wid / 2
    const z0 = c.cz - c.len / 2, z1 = c.cz + c.len / 2
    // Ground shadow first.
    poly([[c.cx - hw - 0.12, z0 - 0.12, 0], [c.cx + hw + 0.12, z0 - 0.12, 0], [c.cx + hw + 0.12, z1 + 0.12, 0], [c.cx - hw - 0.12, z1 + 0.12, 0]], 'rgba(0,0,0,0.2)')
    // Wheels: two dark discs on the near face, sized by distance.
    for (const wx of [c.cx - hw + 0.32, c.cx + hw - 0.32]) {
      const p = flat(wx, z0, 0.34)
      if (p) {
        g.beginPath()
        g.arc(p.x, p.y, 0.34 * p.s, 0, Math.PI * 2)
        g.fillStyle = '#141a1f'
        g.fill()
      }
    }
    const bodyH = c.hgt * 0.62
    const cabH = c.hgt - bodyH
    const cols = { top: shade(c.colour, 0.12), side: shade(c.colour, -0.16), front: c.colour, far: shade(c.colour, -0.28) }
    // Lower body: a real box with visible top, sides and rear face.
    const xl = c.cx - hw, xr = c.cx + hw
    poly([[xl, z1, 0], [xr, z1, 0], [xr, z1, bodyH], [xl, z1, bodyH]], cols.far)
    poly([[xl, z0, 0], [xl, z1, 0], [xl, z1, bodyH], [xl, z0, bodyH]], cols.side)
    poly([[xr, z0, 0], [xr, z1, 0], [xr, z1, bodyH], [xr, z0, bodyH]], cols.side)
    poly([[xl, z0, bodyH], [xr, z0, bodyH], [xr, z1, bodyH], [xl, z1, bodyH]], cols.top)
    poly([[xl, z0, 0], [xr, z0, 0], [xr, z0, bodyH], [xl, z0, bodyH]], cols.front)
    // Taillights on the rear face.
    poly([[xl + 0.1, z0, bodyH * 0.45], [xl + 0.42, z0, bodyH * 0.45], [xl + 0.42, z0, bodyH * 0.78], [xl + 0.1, z0, bodyH * 0.78]], '#c0392b')
    poly([[xr - 0.42, z0, bodyH * 0.45], [xr - 0.1, z0, bodyH * 0.45], [xr - 0.1, z0, bodyH * 0.78], [xr - 0.42, z0, bodyH * 0.78]], '#c0392b')
    // Cabin box on top, windows on its rear and sides.
    const cabLen = c.len * c.cabFrac
    const z0c = c.cz - cabLen / 2 - c.len * 0.06, z1c = c.cz + cabLen / 2 - c.len * 0.06
    const hwc = hw * 0.9
    const cxl = c.cx - hwc, cxr = c.cx + hwc
    poly([[cxl, z1c, bodyH], [cxr, z1c, bodyH], [cxr, z1c, c.hgt], [cxl, z1c, c.hgt]], cols.far)
    poly([[cxl, z0c, bodyH], [cxl, z1c, bodyH], [cxl, z1c, c.hgt], [cxl, z0c, c.hgt]], cols.side)
    poly([[cxr, z0c, bodyH], [cxr, z1c, bodyH], [cxr, z1c, c.hgt], [cxr, z0c, c.hgt]], cols.side)
    poly([[cxl, z0c, c.hgt], [cxr, z0c, c.hgt], [cxr, z1c, c.hgt], [cxl, z1c, c.hgt]], cols.top)
    poly([[cxl, z0c, bodyH], [cxr, z0c, bodyH], [cxr, z0c, c.hgt], [cxl, z0c, c.hgt]], cols.front)
    const win = '#20262e'
    poly([[cxl + 0.12, z0c, bodyH + 0.12], [cxr - 0.12, z0c, bodyH + 0.12], [cxr - 0.12, z0c, c.hgt - 0.08], [cxl + 0.12, z0c, c.hgt - 0.08]], win)
    poly([[cxl, z0c + 0.3, bodyH + 0.14], [cxl, z1c - 0.2, bodyH + 0.14], [cxl, z1c - 0.2, c.hgt - 0.1], [cxl, z0c + 0.3, c.hgt - 0.1]], win)
    poly([[cxr, z0c + 0.3, bodyH + 0.14], [cxr, z1c - 0.2, bodyH + 0.14], [cxr, z1c - 0.2, c.hgt - 0.1], [cxr, z0c + 0.3, c.hgt - 0.1]], win)
  }

  // --- Grain and vignette --------------------------------------------------
  const img = g.getImageData(0, 0, W, H)
  const d = img.data
  const strength = 5 + rand() * 8
  for (let i = 0; i < d.length; i += 4) {
    const v = (rand() - 0.5) * strength
    d[i] += v; d[i + 1] += v; d[i + 2] += v
  }
  g.putImageData(img, 0, 0)

  const vig = g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95)
  vig.addColorStop(0, 'rgba(0,0,0,0)')
  vig.addColorStop(1, `rgba(0,0,0,${0.16 + rand() * 0.2})`)
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
