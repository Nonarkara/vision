// The test track: two one-way loops in metres, seen from above.
//
//   Loop A (cars 1–3) — the outer loop, through the roundabout north → south.
//   Loop B (cars 4–6) — the inner loop, through the roundabout west → east.
//
// They meet twice: at the roundabout (A must give way to B already circling)
// and at the junction near the south-west corner (a traffic light decides).
// Thailand drives on the left, so the roundabout turns clockwise.
//
// A route is a closed polyline sampled every STEP metres; every position on it
// is one number, `s` — metres from the start line. Everything else (where a
// car is, how far an obstacle is "along my lane") is a lookup into these
// samples.

export const WORLD = { w: 200, h: 140 }
export const LANE = 3.2          // half the drawn road width: inside it means "in my lane"
export const STEP = 0.5          // metres between samples
export const RING = { x: 150, y: 65, r: 13 }

const ringArc = (from, to) => {
  const out = []
  for (let a = from; a <= to; a += 10) {
    const r = (a * Math.PI) / 180
    out.push([RING.x + RING.r * Math.cos(r), RING.y + RING.r * Math.sin(r)])
  }
  return out
}

/** Waypoints. Corners are rounded by `round()`; ring points are dense enough to stay a circle. */
const LOOP_A = [[20, 20], [150, 20], ...ringArc(270, 450), [150, 110], [20, 110]]
const LOOP_B = [[40, 65], ...ringArc(180, 360), [185, 65], [185, 130], [40, 130]]

/** Zebra crossings: where on which road, and which way people walk. */
export const ZEBRAS = [
  { id: 'z1', x: 85, y: 20, across: 'y' },
  { id: 'z2', x: 95, y: 110, across: 'y' },
  { id: 'z3', x: 90, y: 65, across: 'y' },
]

/** The light at the A/B junction. Each loop stops at its own line. */
export const LIGHT = { x: 40, y: 110, stops: { A: [47.5, 110], B: [40, 117.5] } }

/** Replace each corner with a curve of radius ≤ r, then sample every STEP metres. */
export function round(points, r) {
  const n = points.length
  const smooth = []
  for (let i = 0; i < n; i++) {
    const a = points[(i - 1 + n) % n], p = points[i], b = points[(i + 1) % n]
    const u1 = norm(p[0] - a[0], p[1] - a[1]), u2 = norm(b[0] - p[0], b[1] - p[1])
    const turn = Math.acos(Math.max(-1, Math.min(1, u1.x * u2.x + u1.y * u2.y)))
    if (turn < 0.05) { smooth.push(p); continue }
    const t = Math.min(r * Math.tan(turn / 2), u1.len / 2, u2.len / 2)
    const p0 = [p[0] - u1.x * t, p[1] - u1.y * t], p2 = [p[0] + u2.x * t, p[1] + u2.y * t]
    for (let k = 0; k <= 8; k++) {
      const q = k / 8, w = 1 - q // quadratic Bézier with the corner as control point
      smooth.push([w * w * p0[0] + 2 * w * q * p[0] + q * q * p2[0], w * w * p0[1] + 2 * w * q * p[1] + q * q * p2[1]])
    }
  }
  return resample(smooth)
}

function norm(x, y) {
  const len = Math.hypot(x, y) || 1
  return { x: x / len, y: y / len, len }
}

function resample(poly) {
  const out = []
  let carry = 0
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length]
    const len = Math.hypot(b[0] - a[0], b[1] - a[1])
    let d = carry
    while (d < len) {
      const q = d / len
      out.push({ x: a[0] + (b[0] - a[0]) * q, y: a[1] + (b[1] - a[1]) * q })
      d += STEP
    }
    carry = d - len
  }
  return out
}

/** A route: samples with heading, curvature speed limit and "on the ring" flag. */
export function makeRoute(id, waypoints, stop) {
  const pts = round(waypoints, 11)
  const n = pts.length
  pts.forEach((p, i) => { const b = pts[(i + 1) % n]; p.h = Math.atan2(b.y - p.y, b.x - p.x) })
  const W = 4 // curvature over ±2 m, so polyline kinks don't read as hairpins
  pts.forEach((p, i) => {
    const k = Math.abs(wrap(pts[(i + W) % n].h - pts[(i - W + n) % n].h)) / (2 * W * STEP) // 1/m
    p.vmax = k > 1e-3 ? Math.sqrt(3 / k) : Infinity         // keep sideways pull under 3 m/s²
    p.ring = Math.abs(Math.hypot(p.x - RING.x, p.y - RING.y) - RING.r) < 1.5
  })
  const route = { id, pts, len: n * STEP }
  route.stopS = stop ? nearestS(route, stop[0], stop[1]) : null
  route.zebras = ZEBRAS
    .map((z) => ({ zebra: z, s: nearestS(route, z.x, z.y) }))
    .filter(({ zebra, s }) => { const p = at(route, s); return Math.hypot(p.x - zebra.x, p.y - zebra.y) < 1.5 })
  return route
}

export function wrap(a) {
  while (a > Math.PI) a -= 2 * Math.PI
  while (a < -Math.PI) a += 2 * Math.PI
  return a
}

/** The sample at distance s (wrapping round the loop). */
export function at(route, s) {
  const n = route.pts.length
  return route.pts[((Math.round(s / STEP) % n) + n) % n]
}

/** s of the sample nearest to (x, y), anywhere on the loop. */
export function nearestS(route, x, y) {
  let best = 0, bd = Infinity
  route.pts.forEach((p, i) => {
    const d = (p.x - x) ** 2 + (p.y - y) ** 2
    if (d < bd) { bd = d; best = i }
  })
  return best * STEP
}

/**
 * Is (x, y) in my lane ahead of me — and how far along? Searches my route
 * from s to s + range; returns { along, lateral } for the closest sample, or
 * null when the point is nowhere near my lane.
 */
export function alongMyLane(route, s, range, x, y, slack = 0) {
  let best = null
  for (let d = 0; d <= range; d += STEP) {
    const p = at(route, s + d)
    const lat = Math.hypot(p.x - x, p.y - y)
    if (lat < LANE * 0.62 + slack && (!best || lat < best.lateral)) best = { along: d, lateral: lat }
  }
  return best
}

export function buildTrack(layout = 'practice') {
  if (layout !== 'practice' && layout !== 'city') {
    const count = layout === 'four' ? 4 : 2
    const track = {}
    for (let i = 0; i < count; i++) {
      const d = i * 3.6
      const points = [[20 + d, 30 + d], [180 - d, 30 + d], [180 - d, 110 - d], [20 + d, 110 - d]]
      // Left-hand traffic: each direction has its own actual path.
      if (i >= count / 2) points.reverse()
      const id = String.fromCharCode(65 + i)
      track[id] = makeRoute(id, points, null)
      track[id].zebras = []
    }
    Object.defineProperty(track, 'layout', { value: layout })
    Object.defineProperty(track, 'zebras', { value: [] })
    return track
  }
  const track = { A: makeRoute('A', LOOP_A, LIGHT.stops.A), B: makeRoute('B', LOOP_B, LIGHT.stops.B) }
  if (layout === 'city') {
    track.C = makeRoute('C', [[20, 40], [120, 40], [120, 110], [20, 110]], [47.5, 110])
    track.D = makeRoute('D', [[40, 20], [175, 20], [175, 130], [40, 130]], [40, 117.5])
    track.C.lightGroup = 'A'; track.D.lightGroup = 'B'
  }
  Object.defineProperty(track, 'layout', { value: layout })
  Object.defineProperty(track, 'zebras', { value: ZEBRAS })
  return track
}
