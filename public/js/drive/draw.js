// Drawing the track from above. Colours keep the site's rule: Peach Red is
// only ever what a machine sees — the cones and the boxes. The traffic light
// is the one exception, because a red light has to look red.

import { WORLD, LANE, RING, ZEBRAS, LIGHT, at } from './track.js'
import { FOV, sightRange } from './perceive.js?v=1.15.0'
import { VEHICLES } from './sim.js?v=1.15.0'
import { ITEMS, STREET, offset } from './street.js?v=1.15.0'

const LIGHT_RGB = { red: '#e8412b', amber: '#f4c430', green: '#5fc46b' }

export function palette() {
  const css = getComputedStyle(document.documentElement)
  const v = (k) => css.getPropertyValue(k).trim()
  return {
    // Three instrument steps, well apart, so three surfaces read as three
    // surfaces from above: verge, footway, carriageway. Hardware, not content,
    // so they stay in the black ramp and never borrow a plate hue.
    ground: v('--black'), pave: v('--black-2'), road: v('--black-3'),
    kerb: v('--gray'), block: v('--olive'),
    mark: v('--gray'), white: v('--white'),
    naples: v('--naples'), gray: v('--gray'), olive: v('--olive'), signal: v('--signal'), black: v('--black'),
  }
}

/** The localised name a detection label prints. Keys come from ITEMS in street.js. */
export function labelName(label, lang) {
  const row = ITEMS[label]
  return row ? row.label[lang === 'en' ? 1 : 0] : label
}

/** Size the canvas to its box (sharp on high-DPI screens); returns metres → pixels. */
export function fit(canvas) {
  const w = canvas.clientWidth
  const dpr = Math.min(w < 700 ? 2 : 3, window.devicePixelRatio || 1)
  const h = (w * WORLD.h) / WORLD.w
  if (canvas.width !== Math.round(w * dpr)) {
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
  }
  return (w / WORLD.w) * dpr
}

/** The static layer: roads, island, zebras, stop lines, footways, buildings, trees. */
export function drawTrack(ctx, k, track, c, street, weather = 'day') {
  const night = weather === 'night'
  ctx.fillStyle = night ? c.black : c.ground
  ctx.fillRect(0, 0, WORLD.w * k, WORLD.h * k)
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  for (const route of Object.values(track)) {
    ctx.strokeStyle = night ? c.black : c.road
    ctx.lineWidth = LANE * 2 * k
    ctx.beginPath()
    route.pts.forEach((p, i) => (i ? ctx.lineTo(p.x * k, p.y * k) : ctx.moveTo(p.x * k, p.y * k)))
    ctx.closePath()
    ctx.stroke()
    // Shoulders: a solid line at each edge of the lane.
    ctx.strokeStyle = c.mark
    ctx.globalAlpha = night ? 0.35 : 0.7
    ctx.lineWidth = Math.max(1, 0.16 * k)
    for (const side of [-1, 1]) {
      ctx.beginPath()
      for (let s = 0, pen = false; s <= route.len; s += 3) {
        const p = at(route, s)
        const x = (p.x - Math.sin(p.h) * LANE * 0.92 * side) * k
        const y = (p.y + Math.cos(p.h) * LANE * 0.92 * side) * k
        if (pen) ctx.lineTo(x, y)
        else { ctx.moveTo(x, y); pen = true }
      }
      ctx.stroke()
    }
    // Dashed centre line, 3 m paint / 4 m gap, so the lane reads as a lane.
    ctx.setLineDash([3 * k, 4 * k])
    ctx.beginPath()
    route.pts.forEach((p, i) => (i ? ctx.lineTo(p.x * k, p.y * k) : ctx.moveTo(p.x * k, p.y * k)))
    ctx.stroke()
    ctx.setLineDash([])
    ctx.globalAlpha = 1
  }
  if (track.layout === 'practice' || track.layout === 'city') {
    ctx.fillStyle = c.olive
    ctx.globalAlpha = night ? 0.45 : 0.85
    ctx.beginPath()
    ctx.arc(RING.x * k, RING.y * k, (RING.r - LANE - 0.4) * k, 0, 2 * Math.PI)
    ctx.fill()
    ctx.globalAlpha = 1
  }
  if (street) drawStreet(ctx, k, street, c, weather)

  if (weather === 'rain') {
    ctx.fillStyle = c.gray
    ctx.globalAlpha = 0.14
    ctx.fillRect(0, 0, WORLD.w * k, WORLD.h * k)
    ctx.globalAlpha = 1
  } else if (weather === 'sun') {
    ctx.fillStyle = c.naples
    ctx.globalAlpha = 0.08
    ctx.fillRect(0, 0, WORLD.w * k, WORLD.h * k)
    ctx.globalAlpha = 1
  }

  for (const route of Object.values(track)) {
    ctx.fillStyle = c.mark
    ctx.globalAlpha = night ? 0.4 : 0.55
    for (let s = 20; s < route.len; s += 30) {
      const p = at(route, s)
      if (p.ring) continue
      chevron(ctx, p.x * k, p.y * k, p.h, 1.3 * k)
    }
    ctx.globalAlpha = 1
    if (route.stopS != null) {
      const p = at(route, route.stopS)
      ctx.strokeStyle = c.white
      ctx.globalAlpha = night ? 0.55 : 1
      ctx.lineWidth = 0.5 * k
      const nx = -Math.sin(p.h), ny = Math.cos(p.h)
      ctx.beginPath()
      ctx.moveTo((p.x + nx * LANE) * k, (p.y + ny * LANE) * k)
      ctx.lineTo((p.x - nx * LANE) * k, (p.y - ny * LANE) * k)
      ctx.stroke()
      ctx.globalAlpha = 1
    }
  }
  ctx.fillStyle = c.white
  ctx.globalAlpha = night ? 0.6 : 1
  for (const z of track.zebras) {
    for (let i = -2; i <= 2; i++) ctx.fillRect((z.x + i * 0.9 - 0.3) * k, (z.y - LANE) * k, 0.6 * k, LANE * 2 * k)
  }
  ctx.globalAlpha = 1
}

/**
 * The street itself, seen from above: footways behind a kerb line, and the
 * shophouses set back behind those. Neither is a road marking, so neither is
 * drawn in road paint — a footway is a raised slab and a building is a block,
 * and from above the only honest difference is which tone they are.
 */
function drawStreet(ctx, k, street, c, weather = 'day') {
  for (const fw of street.footways) {
    if (fw.kerb.length < 2) continue
    ctx.beginPath()
    fw.kerb.forEach((p, i) => (i ? ctx.lineTo(p.x * k, p.y * k) : ctx.moveTo(p.x * k, p.y * k)))
    for (let i = fw.back.length - 1; i >= 0; i--) ctx.lineTo(fw.back[i].x * k, fw.back[i].y * k)
    ctx.closePath()
    ctx.fillStyle = c.pave
    ctx.fill()
    // The kerb itself: one line, at the real 3.2 m from the centreline.
    ctx.strokeStyle = c.kerb
    ctx.lineWidth = Math.max(1, 0.22 * k)
    ctx.beginPath()
    fw.kerb.forEach((p, i) => (i ? ctx.lineTo(p.x * k, p.y * k) : ctx.moveTo(p.x * k, p.y * k)))
    ctx.stroke()
  }
  // Buildings last: a cast shadow, the block, a darker roof. Trees are scenery
  // only — they are not street items, so the camera never boxes them.
  const night = weather === 'night'
  let tree = 0
  for (const it of street.items) {
    if (it.kind !== 'building') continue
    ctx.save()
    ctx.translate(it.x * k, it.y * k)
    ctx.rotate(it.h)
    const x0 = (-it.depth / 2) * k, y0 = (-it.width / 2) * k
    const dw = it.depth * k, dh = it.width * k
    ctx.fillStyle = c.black
    ctx.globalAlpha = night ? 0.55 : 0.28
    ctx.fillRect(x0 + 0.7 * k, y0 + 0.9 * k, dw, dh)
    ctx.globalAlpha = night ? 0.72 : 1
    ctx.fillStyle = c.block
    ctx.fillRect(x0, y0, dw, dh)
    ctx.fillStyle = c.black
    ctx.globalAlpha = 0.22
    ctx.fillRect(x0 + dw * 0.08, y0 + dh * 0.1, dw * 0.84, dh * 0.8)
    if (night) {
      ctx.globalAlpha = 0.9
      ctx.fillStyle = c.naples
      const win = Math.max(1.5, 0.7 * k)
      ctx.fillRect(x0 + dw * 0.2, y0 + dh * 0.28, win, win)
      ctx.fillRect(x0 + dw * 0.55, y0 + dh * 0.28, win, win)
    }
    ctx.restore()
    ctx.globalAlpha = 1
    if (tree++ % 2) continue
    const ox = Math.cos(it.h + 1.15) * (it.depth / 2 + 1.6)
    const oy = Math.sin(it.h + 1.15) * (it.depth / 2 + 1.6)
    const tx = (it.x + ox) * k, ty = (it.y + oy) * k, r = 1.35 * k
    ctx.fillStyle = c.black
    ctx.globalAlpha = night ? 0.4 : 0.22
    ctx.beginPath()
    ctx.ellipse(tx + 0.45 * k, ty + 0.55 * k, r, r * 0.42, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = night ? 0.6 : 1
    ctx.fillStyle = c.olive
    ctx.beginPath()
    ctx.arc(tx, ty, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = c.black
    ctx.globalAlpha = 0.2
    ctx.beginPath()
    ctx.arc(tx - r * 0.25, ty - r * 0.2, r * 0.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
  }
}

function chevron(ctx, x, y, h, size) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(h)
  ctx.beginPath()
  ctx.moveTo(size, 0)
  ctx.lineTo(-size * 0.6, -size * 0.7)
  ctx.lineTo(-size * 0.2, 0)
  ctx.lineTo(-size * 0.6, size * 0.7)
  ctx.closePath()
  ctx.globalAlpha = 0.5
  ctx.fill()
  ctx.restore()
}

/** Everything that moves. `selected` is the car whose eyes we look through. */
/**
 * Lamp posts, poles, signs and everything at the kerb, drawn at its real
 * footprint. These are the things the camera walks past without naming: from
 * above a lamp post is a 0.3 m square, which is exactly why it is easy to miss
 * and exactly why there is no box on it.
 */
function drawFurniture(ctx, k, world, c) {
  for (const it of world.street.items) {
    if (it.kind === 'building') continue        // static layer, already painted
    if (it.kind === 'person' || it.kind === 'dog') continue  // drawn with the walkers
    const dims = ITEMS[it.kind]?.dims
    if (!dims) continue
    ctx.save()
    ctx.translate(it.x * k, it.y * k)
    ctx.rotate(it.h)
    const L = dims.L * k, W = dims.W * k
    // Lamps, poles and signs stand upright; seen from above they are a footprint
    // plus the faint circle of what they shade.
    if (it.kind === 'lamp' || it.kind === 'pole') {
      ctx.fillStyle = c.gray
      ctx.fillRect(-W / 2, -W / 2, W, W)
      ctx.globalAlpha = 0.18
      ctx.beginPath()
      ctx.arc(0, 0, Math.max(2, 1.6 * k), 0, 2 * Math.PI)
      ctx.fill()
    } else if (it.kind === 'bicycle' || it.kind === 'motorcycle') {
      ctx.fillStyle = c.naples
      ctx.fillRect(-L / 2, -W / 2, L, W)
      ctx.fillStyle = c.black
      ctx.beginPath()
      ctx.arc(-L * 0.32, 0, Math.max(1, W * 0.42), 0, 2 * Math.PI)
      ctx.arc(L * 0.32, 0, Math.max(1, W * 0.42), 0, 2 * Math.PI)
      ctx.fill()
    } else if (it.kind === 'stopSign') {
      // White, not Peach Red. Red belongs to the machine: only a detection box
      // and its confidence are ever signal-coloured, never the object itself.
      ctx.fillStyle = c.white
      ctx.beginPath()
      ctx.arc(0, 0, Math.max(2, 0.45 * k), 0, 2 * Math.PI)
      ctx.fill()
    } else {
      ctx.fillStyle = c.gray
      ctx.globalAlpha = 0.75
      ctx.fillRect(-L / 2, -W / 2, L, W)
    }
    ctx.restore()
  }
}

/** Where a moving thing is drawn. `lead` is the fraction of a step still to come, so motion stays smooth without touching the physics state. */
function pose(o, lead) {
  if (!lead) return o
  if (o.route && o.v > 0 && !(o.frozen > 0)) {
    const p = at(o.route, o.s + o.v * lead)
    return { ...o, x: p.x, y: p.y, h: p.h }
  }
  if (o.vx || o.vy) return { ...o, x: o.x + (o.vx || 0) * lead, y: o.y + (o.vy || 0) * lead }
  return o
}

export function drawWorld(ctx, k, world, c, { selected, showAll, lang, lead = 0, reduced = false, now = 0 }) {
  const rain = world.weather === 'rain'
  drawLights(ctx, k, world, c)
  drawFurniture(ctx, k, world, c)

  for (const raw of world.cars) {
    const car = pose(raw, lead)
    const sel = car.id === selected
    if (!sel && !showAll) continue
    const R = car.blind ? 0 : sightRange(car, world.weather)
    ctx.fillStyle = c.signal
    ctx.globalAlpha = sel ? 0.13 : 0.05
    ctx.beginPath()
    ctx.moveTo(car.x * k, car.y * k)
    ctx.arc(car.x * k, car.y * k, R * k, car.h - FOV / 2, car.h + FOV / 2)
    ctx.closePath()
    ctx.fill()
    ctx.globalAlpha = 1
    if (!sel || car.blind || !R) continue
    // Predicted path: where this speed would be in the next two seconds.
    ctx.save()
    ctx.strokeStyle = c.signal
    ctx.globalAlpha = 0.75
    ctx.lineWidth = 1.5
    ctx.setLineDash([5, 5])
    ctx.beginPath()
    for (let i = 0; i <= 8; i++) {
      const p = at(car.route, car.s + car.v * 0.28 * i)
      if (i) ctx.lineTo(p.x * k, p.y * k)
      else ctx.moveTo(p.x * k, p.y * k)
    }
    ctx.stroke()
    ctx.setLineDash([])
    ctx.restore()
    if (reduced) continue
    // One lidar-style ray inside the cone. A single blurred stroke, not one per box.
    const u = (Math.sin(now / 280) + 1) / 2
    const a = car.h - FOV / 2 + u * FOV
    ctx.save()
    ctx.strokeStyle = c.signal
    ctx.globalAlpha = 0.9
    ctx.lineWidth = 1.5
    ctx.shadowColor = c.signal
    ctx.shadowBlur = 10
    ctx.beginPath()
    ctx.moveTo(car.x * k, car.y * k)
    ctx.lineTo(car.x * k + Math.cos(a) * R * k, car.y * k + Math.sin(a) * R * k)
    ctx.stroke()
    ctx.restore()
    ctx.shadowBlur = 0
    ctx.globalAlpha = 1
  }

  for (const raw of world.walkers) {
    const w = pose(raw, lead)
    if (w.kind === 'person') {
      ctx.fillStyle = c.white
      ctx.beginPath()
      ctx.arc(w.x * k, w.y * k, Math.max(3, 0.55 * k), 0, 2 * Math.PI)
      ctx.fill()
    } else {
      const h = Math.atan2(w.vy || w.ny, w.vx || w.nx)
      ctx.save()
      ctx.translate(w.x * k, w.y * k)
      ctx.rotate(h)
      ctx.fillStyle = c.naples
      ctx.fillRect(-0.6 * k, -0.28 * k, 1.2 * k, 0.56 * k)
      ctx.fillRect(0.45 * k, -0.35 * k, 0.45 * k, 0.7 * k)
      ctx.restore()
    }
  }

  for (const raw of world.cars) drawCar(ctx, k, pose(raw, lead), c, raw.id === selected, world.weather)

  for (const raw of world.cars) {
    const car = pose(raw, lead)
    if (car.id !== selected && !showAll) continue
    for (const tr of raw.tracks.values()) {
      const o = pose(tr.obj, lead)
      // The object's real footprint — a lorry's box is a lorry's size. Street
      // furniture has no dims of its own, so it borrows the class table's.
      const dims = o.dims ?? ITEMS[o.kind]?.dims
      const half = (dims ? Math.max(dims.L, dims.W) / 2 + 0.5 : o.kind === 'dog' ? 1.1 : 0.9) * k
      ctx.strokeStyle = c.signal
      ctx.globalAlpha = 0.35
      ctx.lineWidth = car.id === selected ? 5 : 2
      ctx.strokeRect(o.x * k - half, o.y * k - half, half * 2, half * 2)
      ctx.globalAlpha = 1
      ctx.lineWidth = car.id === selected ? 2 : 1
      ctx.strokeRect(o.x * k - half, o.y * k - half, half * 2, half * 2)
      if (car.id !== selected) continue
      const text = `${labelName(tr.label, lang)} ${Math.round(tr.conf * 100)}%`
      ctx.font = `600 ${Math.max(10, 1.9 * k)}px "JetBrains Mono", monospace`
      const tw = ctx.measureText(text).width
      ctx.fillStyle = c.signal
      ctx.fillRect(o.x * k - half, o.y * k - half - 2.4 * k, tw + 0.8 * k, 2.4 * k)
      ctx.fillStyle = c.black
      ctx.fillText(text, o.x * k - half + 0.4 * k, o.y * k - half - 0.6 * k)
    }
  }

  for (const e of world.events) {
    const age = world.t - e.t
    ctx.strokeStyle = c.signal
    ctx.lineWidth = 3
    ctx.globalAlpha = Math.max(0, 1 - age / 2.5)
    ctx.beginPath()
    ctx.arc(e.x * k, e.y * k, (2 + age * 4) * k, 0, 2 * Math.PI)
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  if (rain && !reduced) {
    ctx.strokeStyle = c.gray
    ctx.globalAlpha = 0.45
    ctx.lineWidth = 1
    const span = WORLD.w * k
    for (let i = 0; i < 48; i++) {
      const x = (i * 97 + now * 0.35) % span
      const y = (i * 53 + now * 0.8) % (WORLD.h * k)
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x - 3, y + 10)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
  }
}

/** A vehicle at its real Thai size, seen from above: 4.4 × 1.8 m sedans,
 *  5.3 m pickups, 9.6 m lorries with a separate cab, 12 m buses. */
function drawCar(ctx, k, car, c, sel, weather = 'day') {
  const dims = car.dims ?? VEHICLES.car
  const L = dims.L * k, W = dims.W * k
  const night = weather === 'night' || weather === 'rain'
  ctx.save()
  ctx.translate(car.x * k, car.y * k)
  ctx.rotate(car.h)
  ctx.fillStyle = c.black
  ctx.globalAlpha = night ? 0.45 : 0.22
  ctx.beginPath()
  ctx.ellipse(0.3 * k, W * 0.15, L * 0.46, W * 0.42, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1
  const body = car.styleName === 'careful' ? c.white : car.styleName === 'normal' ? c.gray : c.naples
  if (car.body === 'truck') {
    // Cargo box takes the rear 68%; the cab sits in front with a gap.
    ctx.fillStyle = c.black
    ctx.fillRect(-L / 2 + 0.7 * L, -W / 2 - 0.5, 0.04 * L, W + 1) // gap line between box and cab
    ctx.fillStyle = body
    ctx.fillRect(-L / 2, -W / 2, 0.68 * L, W)
    ctx.fillRect(-L / 2 + 0.72 * L, -W / 2 + 0.12 * k, 0.24 * L, W - 0.24 * k)
    ctx.fillStyle = c.black
    ctx.fillRect(-L / 2 + 0.66 * L, -W / 2 + 0.22 * k, 0.05 * L, W - 0.44 * k) // cab windscreen
  } else if (car.body === 'bus') {
    ctx.fillStyle = body
    ctx.fillRect(-L / 2, -W / 2, L, W)
    ctx.fillStyle = c.black
    for (let x = -L / 2 + 1.4 * k; x < L / 2 - 1.6 * k; x += 1.7 * k) ctx.fillRect(x, -W / 2 + 0.22 * k, 1.0 * k, 0.18 * k)
    ctx.fillRect(-L / 2 + 0.22 * k, -W / 2 + 0.25 * k, 0.35 * k, W - 0.5 * k) // windscreen
  } else {
    ctx.fillStyle = body
    ctx.fillRect(-L / 2, -W / 2, L, W)
    ctx.fillStyle = c.black
    ctx.fillRect(L / 2 - 1.2 * k, -W / 2 + 0.25 * k, 0.5 * k, W - 0.5 * k) // windscreen: which end is the front
    if (car.body === 'pickup') {
      // Open bed behind the cab.
      ctx.strokeStyle = c.black
      ctx.lineWidth = 0.18 * k
      ctx.strokeRect(-L / 2 + 0.3 * k, -W / 2 + 0.2 * k, 0.42 * L, W - 0.4 * k)
    }
  }
  // Wheels, then lamps. Headlights throw a short pool at night and in rain.
  ctx.fillStyle = c.black
  for (const fx of [-1, 1]) {
    for (const fy of [-1, 1]) {
      ctx.beginPath()
      ctx.ellipse(fx * L * 0.34, fy * W * 0.48, Math.max(1.2, L * 0.07), Math.max(1, W * 0.12), 0, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.fillStyle = night ? c.naples : c.white
  ctx.fillRect(L / 2 - 0.15 * k, -W / 2 + 0.12 * k, Math.max(1.5, 0.35 * k), Math.max(1.2, 0.28 * k))
  ctx.fillRect(L / 2 - 0.15 * k, W / 2 - 0.4 * k, Math.max(1.5, 0.35 * k), Math.max(1.2, 0.28 * k))
  if (night && car.v > 0.4) {
    ctx.fillStyle = c.naples
    ctx.globalAlpha = 0.16
    ctx.beginPath()
    ctx.moveTo(L / 2, -W * 0.3)
    ctx.lineTo(L / 2 + 4.2 * k, -W * 0.9)
    ctx.lineTo(L / 2 + 4.2 * k, W * 0.9)
    ctx.lineTo(L / 2, W * 0.3)
    ctx.closePath()
    ctx.fill()
    ctx.globalAlpha = 1
  }
  if (sel || car.frozen > 0) {
    ctx.strokeStyle = car.frozen > 0 ? c.signal : c.white
    ctx.lineWidth = 2
    ctx.strokeRect(-L / 2 - 3, -W / 2 - 3, L + 6, W + 6)
  }
  ctx.restore()
  ctx.font = `700 ${Math.max(10, 2.2 * k)}px "Archivo Narrow", sans-serif`
  ctx.fillStyle = c.white
  ctx.textAlign = 'center'
  ctx.fillText(String(car.id), car.x * k, car.y * k - 2.2 * k)
  ctx.textAlign = 'left'
}

function drawLights(ctx, k, world, c) {
  for (const route of Object.values(world.track)) {
    if (route.stopS == null) continue
    const { x, y } = at(route, route.stopS), loop = route.lightGroup ?? route.id
    const state = world.light[loop]
    const lx = loop === 'A' ? x : x - LANE - 2.2, ly = loop === 'A' ? y + LANE + 3 : y // on the driver's left
    ctx.fillStyle = c.black
    ctx.fillRect((lx - 1.1) * k, (ly - 2.9) * k, 2.2 * k, 5.8 * k)
    ;['red', 'amber', 'green'].forEach((s, i) => {
      ctx.fillStyle = s === state ? LIGHT_RGB[s] : c.road
      ctx.beginPath()
      ctx.arc(lx * k, (ly - 1.8 + i * 1.8) * k, 0.7 * k, 0, 2 * Math.PI)
      ctx.fill()
    })
  }
}
