// The windshield and detector boxes share the top-view world's coordinates.
// Only actual tracks get boxes; visible, missed objects stay unboxed.
import { at, LANE } from './track.js'
import { sightRange } from './perceive.js?v=1.10.0'

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
export function drawWindshield(g, car, world, w, h, language = 'en') {
  g.clearRect(0, 0, w, h)
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
  g.strokeStyle = night ? '#9a9b89' : '#d7d5b8'
  g.lineWidth = 2
  for (let d = 4; d < 95; d += 6)
    for (const side of [-1, 1]) {
      const a = at(car.route, car.s + d),
        b = at(car.route, car.s + d + 2.5)
      const pa = project(
        car,
        {
          x: a.x - Math.sin(a.h) * LANE * side,
          y: a.y + Math.cos(a.h) * LANE * side,
        },
        w,
        h,
      )
      const pb = project(
        car,
        {
          x: b.x - Math.sin(b.h) * LANE * side,
          y: b.y + Math.cos(b.h) * LANE * side,
        },
        w,
        h,
      )
      if (pa && pb)
        line(g, [
          [pa.x, pa.y],
          [pb.x, pb.y],
        ])
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
      bw = s * 1.85
      bh = s * 1.5
      g.fillStyle =
        o.styleName === 'hasty'
          ? '#d1b85e'
          : o.styleName === 'careful'
            ? '#e0e0d5'
            : '#879599'
      g.fillRect(p.x - bw / 2, p.y - bh * 0.65, bw, bh * 0.65)
      g.fillRect(p.x - bw * 0.36, p.y - bh, bw * 0.72, bh * 0.5)
      g.fillStyle = '#26323b'
      g.fillRect(p.x - bw * 0.28, p.y - bh * 0.9, bw * 0.56, bh * 0.28)
      g.fillStyle = '#161e24'
      g.fillRect(p.x - bw * 0.43, p.y - s * 0.14, s * 0.28, s * 0.2)
      g.fillRect(p.x + bw * 0.28, p.y - s * 0.14, s * 0.28, s * 0.2)
      const braking = o.decision.acc < -0.3
      g.fillStyle = braking ? '#ff5740' : night ? '#fff1ae' : '#a94335'
      g.fillRect(p.x - bw * 0.42, p.y - bh * 0.35, bw * 0.18, bh * 0.13)
      g.fillRect(p.x + bw * 0.24, p.y - bh * 0.35, bw * 0.18, bh * 0.13)
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
