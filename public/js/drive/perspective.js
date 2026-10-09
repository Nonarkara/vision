// The windshield and detector boxes share the top-view world's coordinates.
// Only actual tracks get boxes; visible, missed objects stay unboxed.
// Vehicles are drawn at their real Thai sizes (VEHICLES in sim.js): a sedan
// is 4.4 × 1.8 m with a 1.5 m roof, a 6-wheel lorry 9.6 × 2.5 m and 3.2 m
// tall — so what towers over you in this view is what would tower over you
// on the road.
import { at, LANE } from './track.js'
import { sightRange } from './perceive.js?v=1.10.2'
import { VEHICLES } from './sim.js?v=1.10.2'

export function relative(car, point) {
  const dx = point.x - car.x,
    dy = point.y - car.y
  return {
    side: -Math.sin(car.h) * dx + Math.cos(car.h) * dy,
    depth: Math.cos(car.h) * dx + Math.sin(car.h) * dy,
  }
}
export function project(car, point, w, h, height = 0) {
  const p = relative(car, point)
  if (p.depth < 1.8) return null
  const f = w * 0.68
  return {
    x: w / 2 + (p.side * f) / p.depth,
    y: h * 0.38 + ((1.35 - height) * f) / p.depth,
    scale: f / p.depth,
    depth: p.depth,
  }
}
const names = {
  car: ['รถ', 'car'],
  person: ['คน', 'person'],
  dog: ['สุนัข', 'dog'],
  cat: ['แมว?', 'cat?'],
  truck: ['รถบรรทุก', 'truck'],
  bus: ['รถโดยสาร', 'bus'],
}
function line(g, points) {
  g.beginPath()
  points.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)))
  g.stroke()
}
function polygon(g, points) {
  g.beginPath()
  points.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)))
  g.closePath()
  g.fill()
}
// Clip pavement at the near plane rather than popping entire segments out.
function roadQuad(car, points, w, h) {
  let out = []
  for (let i = 0; i < points.length; i++) {
    const a = points[i],
      b = points[(i + 1) % points.length],
      da = relative(car, a).depth,
      db = relative(car, b).depth
    if (da >= 1.8) out.push(a)
    if (da >= 1.8 !== db >= 1.8) {
      const t = (1.8 - da) / (db - da)
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })
    }
  }
  return out.map((p) => project(car, p, w, h)).filter(Boolean)
}
function person(g, x, y, s, t) {
  g.strokeStyle = '#f0ebe1'
  g.lineWidth = Math.max(2, s * 0.085)
  g.lineCap = 'round'
  g.fillStyle = '#f0ebe1'
  g.beginPath()
  g.arc(x, y - s * 1.55, s * 0.14, 0, Math.PI * 2)
  g.fill()
  const stride = Math.sin(t * 7) * s * 0.18
  line(g, [
    [x, y - s * 1.3],
    [x, y - s * 0.65],
  ])
  line(g, [
    [x - s * 0.3, y - s * 0.85 - stride],
    [x, y - s * 1.15],
    [x + s * 0.3, y - s * 0.85 + stride],
  ])
  line(g, [
    [x - s * 0.23 - stride, y],
    [x, y - s * 0.65],
    [x + s * 0.23 + stride, y],
  ])
}
function dog(g, x, y, s, t) {
  g.strokeStyle = '#ddc97c'
  g.fillStyle = '#ddc97c'
  g.lineWidth = Math.max(2, s * 0.075)
  g.lineCap = 'round'
  g.beginPath()
  g.ellipse(x, y - s * 0.45, s * 0.42, s * 0.18, 0, 0, Math.PI * 2)
  g.fill()
  g.beginPath()
  g.ellipse(x + s * 0.38, y - s * 0.65, s * 0.17, s * 0.15, 0, 0, Math.PI * 2)
  g.fill()
  polygon(g, [
    { x: x + s * 0.29, y: y - s * 0.73 },
    { x: x + s * 0.3, y: y - s * 0.98 },
    { x: x + s * 0.43, y: y - s * 0.74 },
  ])
  const stride = Math.sin(t * 10) * s * 0.09
  for (const a of [-0.28, -0.1, 0.15, 0.32])
    line(g, [
      [x + s * a, y - s * 0.45],
      [x + s * a + stride, y],
    ])
  line(g, [
    [x - s * 0.35, y - s * 0.48],
    [x - s * 0.58, y - s * 0.75],
  ])
}
// Vehicle silhouettes at true scale: cross-sections from rear (a=0) to
// front (a=1), each with its height in metres. A sedan's roof is 1.50 m;
// a pickup's cab 1.90 m; a lorry's box rides at 3.20 m — the reason it
// towers over you in the windshield. Heights track VEHICLES in sim.js.
const PROFILES = {
  car: [[0, 1.02], [0.1, 1.5], [0.48, 1.5], [0.62, 1.02], [0.78, 0.88], [1, 0.72]],
  pickup: [[0, 1.2], [0.5, 1.2], [0.55, 1.9], [0.75, 1.9], [0.8, 1.05], [1, 0.95]],
  truck: [[0, 3.2], [0.68, 3.2], [0.71, 2.25], [0.86, 2.25], [0.89, 1.6], [1, 1.55]],
  bus: [[0, 3.3], [0.92, 3.3], [1, 2.6]],
}
const BODY_COLOUR = {
  careful: { top: '#e8e8de', side: '#c2c2b6' },
  normal: { top: '#879599', side: '#6b767a' },
  hasty: { top: '#d1b85e', side: '#af9749' },
}
const GLASS = '#26323b'
const AXLES = { car: [0.17, 0.83], pickup: [0.16, 0.84], truck: [0.11, 0.66], bus: [0.12, 0.86] }

/** A point on a vehicle, in world metres: frac 0–1 rear→front, side ±1, height m. */
function vpt(view, o, dims, frac, side, height, w, h) {
  const along = (frac - 0.5) * dims.L
  const lat = side * (dims.W / 2)
  return project(view, {
    x: o.x + Math.cos(o.h) * along - Math.sin(o.h) * lat,
    y: o.y + Math.sin(o.h) * along + Math.cos(o.h) * lat,
  }, w, h, height)
}

/** One vehicle as a depth-sorted set of real-size faces. */
function drawVehicle(g, view, o, w, h, night) {
  const dims = o.dims ?? VEHICLES.car
  const prof = PROFILES[o.body ?? 'car'] ?? PROFILES.car
  const col = BODY_COLOUR[o.styleName] ?? BODY_COLOUR.normal
  const braking = o.decision.acc < -0.3

  // Ground shadow, spread a little wider than the tyres.
  const gl = vpt(view, o, dims, 0, -1.08, 0, w, h), gr = vpt(view, o, dims, 0, 1.08, 0, w, h)
  const fl = vpt(view, o, dims, 1, -1.08, 0, w, h), fr = vpt(view, o, dims, 1, 1.08, 0, w, h)
  if (gl && gr && fl && fr) {
    g.fillStyle = night ? 'rgba(0,0,0,.45)' : 'rgba(20,24,26,.2)'
    polygon(g, [gl, gr, fr, fl])
  }

  // Sections: two roof corners and two ground corners, projected.
  const secs = prof.map(([a, hgt]) => ({
    a, h: hgt,
    lt: vpt(view, o, dims, a, -1, hgt, w, h), rt: vpt(view, o, dims, a, 1, hgt, w, h),
    lg: vpt(view, o, dims, a, -1, 0, w, h), rg: vpt(view, o, dims, a, 1, 0, w, h),
  })).filter((s) => s.lt && s.rt && s.lg && s.rg)
  if (secs.length < 2) return

  // Faces with a depth each, painted far to near.
  const faces = []
  for (let i = 0; i < secs.length - 1; i++) {
    const A = secs[i], B = secs[i + 1]
    const glass = Math.abs(A.h - B.h) > 0.3 && A.a > 0.05 // windscreen slope, rear window
    const roof = glass ? GLASS : col.top
    faces.push({ depth: (A.lt.depth + B.lt.depth) / 2, pts: [A.lt, B.lt, B.rt, A.rt], fill: roof })
    faces.push({ depth: (A.lg.depth + B.lg.depth) / 2, pts: [A.lt, A.lg, B.lg, B.lt], fill: col.side })
    faces.push({ depth: (A.rg.depth + B.rg.depth) / 2, pts: [A.rt, A.rg, B.rg, B.rt], fill: col.side })
  }
  const rear = secs[0], front = secs.at(-1)
  faces.push({ depth: rear.lg.depth, pts: [rear.lg, rear.rg, rear.rt, rear.lt], fill: col.side })
  faces.push({ depth: front.lg.depth, pts: [front.lg, front.rg, front.rt, front.lt], fill: col.side })
  faces.sort((a, b) => b.depth - a.depth)
  for (const f of faces) { g.fillStyle = f.fill; polygon(g, f.pts) }

  // Glasshouse: a darker band under the roof run (cars, pickups, buses).
  const roofTop = Math.max(...prof.map(([, hgt]) => hgt))
  g.fillStyle = GLASS
  for (let i = 0; i < secs.length - 1; i++) {
    const A = secs[i], B = secs[i + 1]
    if (A.h < roofTop - 0.05 || B.h < roofTop - 0.05) continue
    const drop = 0.55
    for (const side of [-0.92, 0.92]) {
      const ta = vpt(view, o, dims, A.a, side, A.h, w, h)
      const tb = vpt(view, o, dims, B.a, side, B.h, w, h)
      const ba = vpt(view, o, dims, A.a, side, Math.max(A.h - drop, 0.7), w, h)
      const bb = vpt(view, o, dims, B.a, side, Math.max(B.h - drop, 0.7), w, h)
      if (ta && tb && ba && bb) polygon(g, [ta, tb, bb, ba])
    }
  }

  // Wheels at the axles, both sides — 0.64 m tyres on real Thai vehicles.
  g.fillStyle = '#171d22'
  for (const ax of AXLES[o.body ?? 'car'] ?? AXLES.car)
    for (const side of [-0.96, 0.96]) {
      const p = vpt(view, o, dims, ax, side, 0.32, w, h)
      if (p) { g.beginPath(); g.arc(p.x, p.y, Math.max(2, p.scale * 0.32), 0, Math.PI * 2); g.fill() }
    }

  // Lights at true positions: taillights on the rear face, headlights on
  // the front. Brake lights burn brighter — and glow at night.
  const inset = 1 - 0.45 / dims.W
  for (const side of [-1, 1]) {
    const t = vpt(view, o, dims, 0, side * inset, 0.75, w, h)
    if (t) {
      g.fillStyle = braking ? '#ff4530' : night ? '#c1372b' : '#a94335'
      if (braking && night) { g.shadowColor = '#ff4530'; g.shadowBlur = 10 }
      g.fillRect(t.x - t.scale * 0.09, t.y - t.scale * 0.05, t.scale * 0.18, t.scale * 0.1)
      g.shadowBlur = 0
    }
    const hd = vpt(view, o, dims, 1, side * inset, 0.66, w, h)
    if (hd) {
      g.fillStyle = night ? '#ffe9a8' : '#d9d4c2'
      if (night) { g.shadowColor = '#ffe9a8'; g.shadowBlur = 8 }
      g.fillRect(hd.x - hd.scale * 0.08, hd.y - hd.scale * 0.045, hd.scale * 0.16, hd.scale * 0.09)
      g.shadowBlur = 0
    }
  }
}

export function drawWindshield(g, car, world, w, h, language = 'en') {
  const night = world.weather === 'night',
    rain = world.weather === 'rain',
    sun = world.weather === 'sun'
  const sky = g.createLinearGradient(0, 0, 0, h * 0.45)
  sky.addColorStop(
    0,
    night ? '#101725' : rain ? '#566570' : sun ? '#7eacbe' : '#a0b9c4',
  )
  sky.addColorStop(1, night ? '#283346' : rain ? '#99a5a9' : '#e4ded0')
  g.fillStyle = sky
  g.fillRect(0, 0, w, h)
  if (!night && !rain) {
    g.fillStyle = sun ? '#ffe3a0' : '#f0e6b7'
    g.beginPath()
    g.arc(w * 0.78, h * 0.15, sun ? h * 0.055 : h * 0.03, 0, Math.PI * 2)
    g.fill()
  }
  g.fillStyle = night ? '#17201f' : '#6f796b'
  g.fillRect(0, h * 0.38, w, h * 0.62)
  // Quiet skyline, intentionally stylised rather than a real Bangkok map.
  g.fillStyle = night ? '#222b34' : '#8d9999'
  for (let i = 0; i < 20; i++) {
    const bh = ((20 + ((i * 23) % 48)) * h) / 480
    g.fillRect((i * w) / 20, h * 0.38 - bh, w / 23, bh)
  }
  const quads = []
  for (const route of Object.values(world.track))
    for (let s = 0; s < route.len; s += 3) {
      const a = at(route, s),
        b = at(route, s + 3)
      if (Math.hypot(a.x - car.x, a.y - car.y) > 105) continue
      const edge = (p, side) => ({
        x: p.x - Math.sin(p.h) * LANE * side,
        y: p.y + Math.cos(p.h) * LANE * side,
      })
      quads.push({
        depth: relative(car, a).depth,
        points: roadQuad(
          car,
          [edge(a, -1), edge(b, -1), edge(b, 1), edge(a, 1)],
          w,
          h,
        ),
      })
    }
  g.fillStyle = night ? '#333c46' : rain ? '#515d64' : '#60676b'
  for (const q of quads.sort((a, b) => b.depth - a.depth))
    if (q.points.length >= 3) polygon(g, q.points)
  // Real road furniture, at real scale. Lane width is 3.2 m (LANE, the same
  // constant the top view draws with), so every road here is 6.4 m of
  // tarmac: solid edge lines at the shoulders, a dashed centre line with
  // the 3 m stroke / 9 m gap of a Thai urban road, zebra bars and stop
  // lines exactly where the top view has them.
  const edgeColour = night ? '#8d8f7d' : '#cfd0b4'
  const dashColour = night ? '#b9bb9d' : '#e6e4c6'
  const paint = night ? 'rgba(214,216,196,.75)' : 'rgba(238,238,224,.85)'
  function groundPoint(route, s, side) {
    const p = at(route, s)
    return { x: p.x - Math.sin(p.h) * LANE * side, y: p.y + Math.cos(p.h) * LANE * side }
  }
  function nearestS(route) {
    let best = 0, bd = Infinity
    for (let i = 0; i < route.pts.length; i += 2) {
      const p = route.pts[i]
      const d = (p.x - car.x) ** 2 + (p.y - car.y) ** 2
      if (d < bd) { bd = d; best = i }
    }
    return best * 0.5
  }
  g.lineWidth = Math.max(1.5, w / 400)
  for (const route of Object.values(world.track)) {
    const s0 = nearestS(route)
    // Solid edge lines at ±LANE, split into runs wherever the near plane cuts.
    for (const side of [-1, 1]) {
      g.strokeStyle = edgeColour
      g.beginPath()
      let pen = false
      for (let d = -30; d < 100; d += 3) {
        if (relative(car, groundPoint(route, s0 + d, side)).depth < 1.8) { pen = false; continue }
        const p = project(car, groundPoint(route, s0 + d, side), w, h)
        if (!p) { pen = false; continue }
        if (pen) g.lineTo(p.x, p.y)
        else { g.moveTo(p.x, p.y); pen = true }
      }
      g.stroke()
    }
    // Dashed centre line: 3 m stroke, 9 m gap (Thai urban standard).
    g.strokeStyle = dashColour
    for (let d = -36; d < 100; d += 12) {
      const a = project(car, groundPoint(route, s0 + d, 0), w, h)
      const b = project(car, groundPoint(route, s0 + d + 3, 0), w, h)
      if (a && b) line(g, [[a.x, a.y], [b.x, b.y]])
    }
    // Zebra crossings, as paint on the road surface where the top view has them.
    for (const z of route.zebras) {
      if (Math.hypot(at(route, z.s).x - car.x, at(route, z.s).y - car.y) > 110) continue
      for (let i = -2; i <= 2; i++) {
        const quad = roadQuad(car, [
          groundPoint(route, z.s + i * 0.9 - 0.3, -1),
          groundPoint(route, z.s + i * 0.9 + 0.3, -1),
          groundPoint(route, z.s + i * 0.9 + 0.3, 1),
          groundPoint(route, z.s + i * 0.9 - 0.3, 1),
        ], w, h)
        if (quad.length >= 3) { g.fillStyle = paint; polygon(g, quad) }
      }
    }
    if (route.stopS != null) {
      const quad = roadQuad(car, [
        groundPoint(route, route.stopS, -1),
        groundPoint(route, route.stopS + 0.5, -1),
        groundPoint(route, route.stopS + 0.5, 1),
        groundPoint(route, route.stopS, 1),
      ], w, h)
      if (quad.length >= 3) { g.fillStyle = paint; polygon(g, quad) }
    }
  }
  const objects = world
    .objects()
    .filter((o) => o !== car && !o.gone)
    .map((o) => ({ o, p: project(car, o, w, h) }))
    .filter(({ p }) => p && p.depth < 100)
    .sort((a, b) => b.p.depth - a.p.depth)
  for (const { o, p } of objects) {
    const s = p.scale
    if (p.x < -s * 3 || p.x > w + s * 3) continue
    g.globalAlpha = night
      ? Math.max(0.15, 1 - p.depth / 85)
      : rain
        ? Math.max(0.3, 1 - p.depth / 130)
        : 1
    let bw, bh
    if (o.kind === 'car') {
      const dims = o.dims ?? VEHICLES.car
      bw = s * dims.W
      bh = s * dims.H
      drawVehicle(g, car, o, w, h, night)
    } else if (o.kind === 'person') {
      bw = s * 0.8
      bh = s * 1.8
      person(g, p.x, p.y, s, world.t * (o.state === 'wait' ? 0 : 1))
    } else {
      bw = s * 1.3
      bh = s
      dog(g, p.x, p.y, s, world.t * (o.state === 'run' ? 1 : 0))
    }
    g.globalAlpha = 1
    const tr = car.tracks.get(o.id)
    if (tr && !car.blind) {
      const binding = car.decision.targetId === o.id
      g.strokeStyle = binding ? '#ff714f' : '#e1c97c'
      g.lineWidth = binding ? 3 : 1.5
      g.setLineDash(world.t - tr.last > 0.2 ? [5, 4] : [])
      g.strokeRect(p.x - bw / 2 - 3, p.y - bh - 3, bw + 6, bh + 6)
      g.setLineDash([])
      const label = `${names[tr.label]?.[language === 'th' ? 0 : 1] ?? tr.label} ${Math.round(tr.conf * 100)}% · ${Math.round(Math.hypot(o.x - car.x, o.y - car.y))} m`
      g.font = `${Math.max(11, Math.min(15, w / 55))}px sans-serif`
      const tw = g.measureText(label).width + 10,
        lx = Math.max(2, Math.min(w - tw - 2, p.x - bw / 2 - 3)),
        ly = Math.max(18, p.y - bh - 5)
      g.fillStyle = '#172127'
      g.fillRect(lx, ly - 18, tw, 19)
      g.fillStyle = binding ? '#ff9c79' : '#eee3b8'
      g.fillText(label, lx + 5, ly - 4)
    }
  }
  if (car.route.stopS != null) {
    const p = at(car.route, car.route.stopS),
      lamp = project(car, p, w, h, 3.3)
    if (lamp && lamp.depth < 65) {
      g.fillStyle = '#1a242a'
      g.fillRect(lamp.x - 6, lamp.y - 20, 12, 30)
      g.fillStyle = { red: '#ff6047', amber: '#f5d369', green: '#73c58a' }[
        world.light[car.route.lightGroup ?? car.route.id]
      ]
      g.beginPath()
      g.arc(lamp.x, lamp.y - 5, 4, 0, 7)
      g.fill()
    }
  }
  if (rain) {
    g.strokeStyle = 'rgba(215,234,243,.5)'
    g.lineWidth = 1
    for (let i = 0; i < 75; i++) {
      const x = (((i * 137) % 997) / 997) * w,
        y = (i * 73 + world.t * 260) % h
      line(g, [
        [x, y],
        [x, y + 12 + h * 0.025],
      ])
    }
    g.strokeStyle = '#10171b'
    g.lineWidth = 5
    for (const base of [0.22, 0.7]) {
      const a = -2.35 + (Math.sin(world.t * 4) * 0.5 + 0.5) * 1.45
      line(g, [
        [w * base, h * 0.93],
        [w * base + Math.cos(a) * h * 0.62, h * 0.93 + Math.sin(a) * h * 0.62],
      ])
    }
  }
  if (sun) {
    g.fillStyle = 'rgba(255,236,170,.14)'
    g.fillRect(w * 0.64, 0, w * 0.26, h * 0.7)
  }
  if (car.blind) {
    g.fillStyle = 'rgba(12,18,23,.94)'
    g.fillRect(0, 0, w, h)
    g.fillStyle = '#f0e6ce'
    g.font = '20px sans-serif'
    g.textAlign = 'center'
    g.fillText(
      language === 'th'
        ? 'ปิดกล้องอยู่ — ไม่เห็นอุปสรรค'
        : 'Camera covered — no new detections',
      w / 2,
      h / 2,
    )
    g.textAlign = 'left'
  }
  g.fillStyle = '#1c252c'
  polygon(g, [
    { x: 0, y: h },
    { x: w * 0.08, y: h * 0.9 },
    { x: w * 0.92, y: h * 0.9 },
    { x: w, y: h },
  ])
  return sightRange(car, world.weather)
}
