// The world: six cars, people at the zebras, stray dogs, one traffic light.
// Pure state and arithmetic — no drawing, no DOM — so the same world runs in
// the page and in the tests, and a seed makes every run repeatable.

import { buildTrack, at, ZEBRAS, LANE } from './track.js'
import { perceive } from './perceive.js?v=1.14.0'
import { decide } from './decide.js?v=1.14.0'
import { buildStreet, stepStreet, detectable } from './street.js?v=1.14.0'
import { rng } from './rand.js?v=1.14.0'

// Re-exported so anything that used to reach for sim.js still finds it.
export { rng } from './rand.js?v=1.14.0'

export const DT = 1 / 30            // physics step, seconds
const LOOK_EVERY = 3                // perceive and decide at 10 Hz, like a real stack

// Real Thai vehicles, in metres — the sizes the road, the drawings and the
// collision maths all share. A Bangkok street is mostly sedans and pickups,
// with 6-wheel cargo trucks and city buses in the mix.
//   car: Honda City / Toyota Vios class — 4.40 × 1.80, roof 1.50
//   pickup: Isuzu D-Max / Toyota Revo — 5.30 × 1.90, cab 1.90
//   truck: 6-wheel cargo truck — 9.60 × 2.50, box 3.20
//   bus: Bangkok city bus — 11.95 × 2.50, roof 3.30
export const VEHICLES = {
  car: { L: 4.4, W: 1.8, H: 1.5 },
  pickup: { L: 5.3, W: 1.9, H: 1.9 },
  truck: { L: 9.6, W: 2.5, H: 3.2 },
  bus: { L: 11.95, W: 2.5, H: 3.3 },
}

/** What body each spawned vehicle gets, cycling with traffic size. */
const BODY_CYCLE = ['car', 'car', 'pickup', 'car', 'truck', 'car', 'car', 'pickup', 'car', 'car', 'truck', 'bus']

/** Lorries and buses drive like lorries and buses: slower, gentler, further back. */
function bodyAdjust(base, body) {
  if (body === 'car' || body === 'pickup') return base
  return {
    ...base,
    v0: Math.min(base.v0, 11.1),
    a: Math.min(base.a, 0.9),
    b: Math.min(base.b, 1.8),
    s0: base.s0 + 1.5,
    T: Math.max(base.T, 1.4),
  }
}

/** Collision circles for a body: capsules along the length, radius from width.
 *  Cars keep the original ±1.25 m / 1.05 m pair, so their physics is unchanged. */
export function circles(car) {
  const dims = car.dims ?? VEHICLES.car
  const r = dims.W / 2 + 0.15
  const span = Math.max(dims.L / 2 - r, 1.25)
  const n = Math.max(2, Math.ceil(dims.L / (2 * r)))
  const c = Math.cos(car.h), s = Math.sin(car.h)
  return Array.from({ length: n }, (_, i) => {
    const off = n === 1 ? 0 : -span + (2 * span * i) / (n - 1)
    return [car.x + c * off, car.y + s * off, r]
  })
}

export const STYLES = {
  careful: { v0: 12.5, T: 1.8, s0: 3.5, a: 1.4, b: 2.0, range: 50, quality: 0.97, yieldWaiting: true, wary: true, sightLimit: true },
  normal: { v0: 13.9, T: 1.2, s0: 2.5, a: 1.8, b: 2.5, range: 40, quality: 0.92, yieldWaiting: true, wary: false, sightLimit: true },
  hasty: { v0: 16.7, T: 0.6, s0: 2.0, a: 2.6, b: 3.5, range: 28, quality: 0.84, yieldWaiting: false, wary: false, sightLimit: false },
}

const LIGHT_CYCLE = [
  { A: 'green', B: 'red', d: 9 }, { A: 'amber', B: 'red', d: 2.5 }, { A: 'red', B: 'red', d: 1.5 },
  { A: 'red', B: 'green', d: 9 }, { A: 'red', B: 'amber', d: 2.5 }, { A: 'red', B: 'red', d: 1.5 },
]

const RATES = {
  people: { none: Infinity, few: 14, many: 6 },   // mean seconds between people at each zebra
  dogs: { none: Infinity, few: 12, many: 5 },     // mean seconds between dogs anywhere
}


export function createWorld({ seed = 1, weather = 'day', people = 'few', dogs = 'few', layout = 'practice', traffic = 6 } = {}) {
  const track = buildTrack(layout)
  // The street the road runs through. Built once per world from the same seed,
  // so a layout is the same street every time a visitor picks it.
  const street = buildStreet(track, { seed, layout })
  const world = {
    t: 0, tick: 0, rand: rng(seed), track, weather, people, dogs, layout, zebras: track.zebras,
    light: { ...LIGHT_CYCLE[0] }, phase: 0, phaseT: 0,
    cars: [], walkers: [], nextId: 100, events: [],
    street,
    // Everything the simulated camera is allowed to put a box on. References, not
    // copies: stepStreet moves the people and dogs on the footway in place, and
    // the camera has to see them where they actually are. Street lamps, poles,
    // kerbs and buildings are in the world but never in here, because COCO has no
    // name for them — the detector is not failing to see them.
    seen: detectable(street),
    zebraT: Object.fromEntries(track.zebras.map((z, i) => [z.id, 2 + 2 * i])),
    dogT: 4,
    // What a camera in this car could be pointed at: traffic first, then the
    // named street. Used by both perception and the windshield drawing, so the
    // two can never disagree about what is in frame.
    objects() { return [...this.cars, ...this.walkers, ...this.seen] },
  }
  const routes = Object.keys(track)
  const total = Math.max(4, Math.min(32, Number(traffic) || 6))
  const specs = Array.from({ length: total }, (_, i) => [routes[Math.floor(i * routes.length / total)], ['careful', 'normal', 'hasty'][i % 3], BODY_CYCLE[i % BODY_CYCLE.length]])
  const perLoop = Object.fromEntries(routes.map((id) => [id, 0]))
  specs.forEach(([loop, kind, body], i) => {
    const route = track[loop]
    const s = (perLoop[loop]++ / specs.filter(([id]) => id === loop).length) * route.len + 12
    const car = placeCar({
      id: i + 1, kind: 'car', body, dims: VEHICLES[body],
      style: bodyAdjust(STYLES[kind], body), styleName: kind, route, s, v: 6, h: 0,
      laps: 0, crashes: 0, wasHit: 0, hitPeople: 0, hitDogs: 0, frozen: 0, cooldown: 0, blind: false,
      tracks: new Map(), ghost: new Set(), decision: { acc: 0, action: 'cruising', reason: 'clear' }, r: 1.1,
    })
    // Routes may share pavement: never start two cars inside each other.
    for (let attempt = 0; attempt < 100 && world.cars.some((other) => circles(car).some((p) => circles(other).some((q) => Math.hypot(p[0] - q[0], p[1] - q[1]) < p[2] + q[2] + 0.5))); attempt++) {
      car.s = (car.s + 6) % route.len; placeCar(car)
    }
    world.cars.push(car)
  })
  return world
}

function placeCar(car) {
  const p = at(car.route, car.s)
  car.x = p.x; car.y = p.y; car.h = p.h
  return car
}

/** Advance the world by one physics step. */
export function step(world) {
  world.t += DT
  world.tick++
  tickLight(world)
  spawn(world)
  const look = world.tick % LOOK_EVERY === 0
  for (const car of world.cars) {
    car.cooldown = Math.max(0, car.cooldown - DT)
    for (const id of car.ghost) {
      const o = world.cars[id - 1]
      if (Math.hypot(o.x - car.x, o.y - car.y) > 8) car.ghost.delete(id)
    }
    if (car.frozen > 0) {
      car.frozen -= DT
      car.v = 0
      car.decision = { acc: 0, action: 'waiting', reason: car.crashReason ?? 'crashed' }
      continue
    }
    if (look) {
      perceive(car, world, world.rand)
      car.decision = decide(car, world)
    }
    car.v = Math.max(0, car.v + car.decision.acc * DT)
    car.s += car.v * DT
    if (car.s >= car.route.len) { car.s -= car.route.len; car.laps++ }
    placeCar(car)
  }
  moveWalkers(world)
  stepStreet(world.street, world)
  collide(world)
  world.events = world.events.filter((e) => world.t - e.t < 2.5)
}

function tickLight(world) {
  world.phaseT += DT
  if (world.phaseT >= LIGHT_CYCLE[world.phase].d) {
    world.phaseT = 0
    world.phase = (world.phase + 1) % LIGHT_CYCLE.length
    world.light = { ...LIGHT_CYCLE[world.phase] }
  }
}

// ── People and dogs ─────────────────────────────────────────────────────

function spawn(world) {
  const r = world.rand
  for (const z of world.zebras) {
    world.zebraT[z.id] -= DT
    if (world.zebraT[z.id] > 0) continue
    world.zebraT[z.id] = RATES.people[world.people] * (0.5 + r())
    if (world.walkers.some((w) => w.zebra === z && !w.gone)) continue
    const side = r() < 0.5 ? -1 : 1
    world.walkers.push({
      id: world.nextId++, kind: 'person', r: 0.35, zebra: z, dir: -side,
      x: z.x + (r() - 0.5) * 1.2, y: z.y + side * (LANE + 1.4), vx: 0, vy: 0,
      speed: 1.1 + r() * 0.5, state: 'wait', wait: 0, distracted: r() < 0.08,
    })
  }
  world.dogT -= DT
  if (world.dogT <= 0) {
    world.dogT = RATES.dogs[world.dogs] * (0.5 + r())
    if (world.dogs === 'none') return
    const route = r() < 0.5 ? world.track.A : world.track.B
    const ds = r() * route.len
    const p = at(route, ds)
    if (p.ring) return // no dogs on the roundabout island
    const side = r() < 0.5 ? -1 : 1
    const nx = -Math.sin(p.h) * side, ny = Math.cos(p.h) * side
    world.walkers.push({
      id: world.nextId++, kind: 'dog', r: 0.5, route, s: ds,
      x: p.x + nx * (LANE + 2), y: p.y + ny * (LANE + 2), nx: -nx, ny: -ny, cx: p.x, cy: p.y,
      vx: 0, vy: 0, state: 'sit', timer: 2 + r() * 3, paused: false, turned: false,
    })
  }
}

/** Is any car on this loop within `m` metres upstream of s? */
function carComing(world, route, s, m, canStop) {
  return world.cars.some((c) => {
    if (c.route !== route) return false
    const d = (((s - c.s) % route.len) + route.len) % route.len
    if (d > m) return false
    return !canStop || !(c.v < 0.6 || d / Math.max(c.v, 0.1) > 3)
  })
}

function moveWalkers(world) {
  const r = world.rand
  for (const w of world.walkers) {
    if (w.gone) continue
    if (w.kind === 'person') movePerson(world, w)
    else moveDog(world, w, r)
  }
  world.walkers = world.walkers.filter((w) => !w.gone)
}

function movePerson(world, w) {
  if (w.state === 'wait') {
    w.wait += DT
    const routes = Object.values(world.track).filter((rt) => rt.zebras.some((z) => z.zebra === w.zebra))
    const safe = routes.every((rt) => {
      const zs = rt.zebras.find((z) => z.zebra === w.zebra).s
      return !carComing(world, rt, zs + 3, 38, true)
    })
    if (safe || (w.distracted && w.wait > 1)) {
      w.state = 'walk'
      w.vy = w.dir * w.speed
    }
    return
  }
  w.y += w.vy * DT
  if ((w.y - w.zebra.y) * w.dir > LANE + 1.6) w.gone = true
}

function moveDog(world, w, r) {
  w.timer -= DT
  if (w.state === 'sit') {
    if (w.timer > 0) return
    if (carComing(world, w.route, w.s, 16, false)) { if (w.timer < -10) w.gone = true; return }
    w.state = 'run'
    w.vx = w.nx * 3.2; w.vy = w.ny * 3.2
    return
  }
  if (w.state === 'pause') {
    if (w.timer > 0) return
    w.state = 'run'; w.vx = w.nx * 3.2; w.vy = w.ny * 3.2
    return
  }
  w.x += w.vx * DT; w.y += w.vy * DT
  const crossed = (w.x - w.cx) * w.nx + (w.y - w.cy) * w.ny // + once past the road's centre
  if (!w.paused && crossed > -0.5 && crossed < 0.5) {
    w.paused = true
    if (r() < 0.25) { w.state = 'pause'; w.timer = 1 + r(); w.vx = 0; w.vy = 0; return }
    if (r() < 0.15) { w.nx = -w.nx; w.ny = -w.ny; w.vx = -w.vx; w.vy = -w.vy; w.turned = true }
  }
  if (crossed > LANE + 2.5) w.gone = true
}

// ── Collisions: capsule circles per car, one per person or dog ──────────

function collide(world) {
  const cars = world.cars
  for (let i = 0; i < cars.length; i++) {
    const a = cars[i], ca = circles(a)
    for (let j = i + 1; j < cars.length; j++) {
      const b = cars[j]
      if (a.cooldown > 0 || b.cooldown > 0 || a.ghost.has(b.id)) continue
      const cb = circles(b)
      if (ca.some((p) => cb.some((q) => Math.hypot(p[0] - q[0], p[1] - q[1]) < p[2] + q[2]))) {
        // Fault lies with whoever drove into the other: the other car is in front of it.
        const facing = (c, o) => Math.cos(c.h) * (o.x - c.x) + Math.sin(c.h) * (o.y - c.y) > 0.5 * Math.hypot(o.x - c.x, o.y - c.y)
        const fa = facing(a, b), fb = facing(b, a)
        for (const [c, fault] of [[a, fa || !fb], [b, fb || !fa]]) {
          if (fault) c.crashes++; else c.wasHit++
          c.frozen = 3; c.cooldown = 7; c.crashReason = fault ? 'crashed' : 'was_hit'
        }
        a.ghost.add(b.id); b.ghost.add(a.id) // towed clear: they ignore each other until apart
        world.events.push({ t: world.t, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, kind: 'car', ids: [a.id, b.id] })
      }
    }
    for (const w of world.walkers) {
      if (w.gone || a.frozen > 0) continue
      if (ca.some((p) => Math.hypot(p[0] - w.x, p[1] - w.y) < p[2] + w.r)) {
        if (a.v < 1.5) { bounce(w); continue } // walked into a car that had all but stopped
        w.gone = true
        if (w.kind === 'person') a.hitPeople++; else a.hitDogs++
        a.frozen = 3; a.cooldown = 4; a.crashReason = w.kind === 'person' ? 'hit_person' : 'hit_dog'
        world.events.push({ t: world.t, x: w.x, y: w.y, kind: w.kind, ids: [a.id] })
      }
    }
  }
}

/** Someone who bumps a stopped car steps back the way they came. */
function bounce(w) {
  w.x -= w.vx * DT * 3; w.y -= w.vy * DT * 3
  w.vx = -w.vx; w.vy = -w.vy
  if (w.kind === 'person') w.dir = -w.dir
  else { w.nx = -w.nx; w.ny = -w.ny; w.cx = w.x - w.nx * (LANE + 2); w.cy = w.y - w.ny * (LANE + 2); w.paused = true }
}

/** Run n seconds without drawing — for tests and "fast-forward". */
export function run(world, seconds) {
  const n = Math.round(seconds / DT)
  for (let i = 0; i < n; i++) step(world)
  return world
}
