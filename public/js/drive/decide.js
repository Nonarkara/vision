// How a car decides. Every tenth of a second it lists the things that could
// make it slow down — the curve ahead, the light, each object it believes in —
// and asks one question of each: "if this were the only thing on the road,
// how hard should I speed up or brake?" (the Intelligent Driver Model,
// Treiber, Hennecke & Helbing 2000). It obeys the most cautious answer, and
// that answer's cause is what the car tells you.
//
// Objects outside the lane still matter if they are about to enter it: each
// is moved forward up to 3.2 s along its own path (people and dogs in a
// straight line, cars along their loop) and checked against my lane — the
// predict-then-check idea behind sampling planners such as TUM's Frenetix.

import { at, alongMyLane, LANE } from './track.js'
import { sightRange } from './perceive.js?v=1.11.1'

export const CAR_LEN = 4.6
export const MAX_BRAKE = 9            // m/s², an emergency stop on dry tarmac
const SIGHT_BRAKE = 4                 // m/s², the firm stop a sensible driver plans for
const HORIZON = [0.4, 0.8, 1.2, 1.6, 2.0, 2.4, 2.8, 3.2]

/** A vehicle's real length — cars keep the original 4.6 m arithmetic, so
 *  lorry-free worlds behave exactly as before. */
const len = (v) => v?.dims?.L ?? CAR_LEN
/** Gap between two vehicles' centres, from both real lengths (never shorter than the legacy car-car 4.6). */
const both = (me, lead) => Math.max(CAR_LEN, (len(me) + len(lead)) / 2)

/** Intelligent Driver Model: acceleration for speed v, gap to what is ahead, closing speed dv. */
export function idm(v, v0, gap, dv, st) {
  const free = 1 - (v / Math.max(v0, 0.1)) ** 4
  if (gap === Infinity) return st.a * free
  const want = st.s0 + Math.max(0, v * st.T + (v * dv) / (2 * Math.sqrt(st.a * st.b)))
  return st.a * (free - (want / Math.max(gap, 0.1)) ** 2)
}

/** Metres from s to target s along a loop of length len, always ≥ 0. */
const ahead = (from, to, len) => (((to - from) % len) + len) % len

/** The fastest this car may go now so it can still slow for every curve within 40 m. */
function curveLimit(car) {
  let lim = Infinity
  for (let d = 0; d <= 40; d += 1) {
    const vmax = at(car.route, car.s + d).vmax
    if (vmax < Infinity) lim = Math.min(lim, Math.sqrt(vmax ** 2 + 2 * car.style.b * d))
  }
  return lim
}

/** Where an object will be after t seconds, assuming it keeps doing what it does. */
function future(obj, t) {
  if (obj.kind === 'car') {
    if (obj.frozen > 0) return { x: obj.x, y: obj.y }
    const p = at(obj.route, obj.s + obj.v * t)
    return { x: p.x, y: p.y }
  }
  // Street furniture is nailed to the pavement: it has no velocity, and treating
  // that as zero rather than as NaN is what keeps it out of the lane test.
  if (obj.vx == null) return { x: obj.x, y: obj.y }
  return { x: obj.x + obj.vx * t, y: obj.y + obj.vy * t }
}

/** Who gives way when a car's path and mine meet: true means I wait. */
function iYield(car, other, mine, theirs) {
  const meOnRing = at(car.route, car.s).ring, themOnRing = at(other.route, other.s).ring
  if (themOnRing && !meOnRing) return true            // a roundabout belongs to those already in it
  if (meOnRing && !themOnRing) return false
  if (mine < theirs - 0.3) return false               // I clearly get there first
  if (Math.abs(mine - theirs) <= 0.3) return car.id > other.id
  return true
}

/** Every constraint on this car right now, each as { gap, dv, reason, track }. */
function constraints(car, world) {
  const out = []
  const R = sightRange(car, world.weather)
  const { route, v } = car

  // The light, read by the same camera — a covered camera cannot see it either.
  if (route.stopS != null && !car.blind) {
    const d = ahead(car.s, route.stopS, route.len) - Math.max(CAR_LEN / 2, len(car) / 2)
    const state = world.light[route.lightGroup ?? route.id]
    if (d > -1 && d < R) {
      if (state === 'red') out.push({ gap: d, dv: v, reason: 'light_red' })
      else if (state === 'amber' && d > v * v / (2 * 4)) out.push({ gap: d, dv: v, reason: 'light_amber' })
    }
  }

  for (const tr of car.tracks.values()) {
    const o = tr.obj
    if (car.ghost.has(o.id)) continue
    const slack = o.kind === 'car' ? 1.1 : o.r

    // Someone waiting at a zebra on my road: careful drivers stop and let them cross.
    if (o.kind === 'person' && o.state === 'wait' && car.style.yieldWaiting) {
      const z = route.zebras.find((zz) => zz.zebra.id === o.zebra.id)
      if (z) {
        const d = ahead(car.s, z.s, route.len) - Math.max(CAR_LEN / 2, len(car) / 2) - 2.5
        if (d > 0 && d < R && (d > v * v / (2 * car.style.b) * 0.7 || v < 2)) out.push({ gap: d, dv: v, reason: 'person_waiting', track: tr })
      }
    }

    // A stray at the roadside may run; the wary slow down before it does.
    // A dog on the footway is not a stray — it is somebody walking past.
    if (o.kind === 'dog' && !o.pet && car.style.wary && o.state !== 'run') {
      const near = alongMyLane(route, car.s, R, o.x, o.y, 3.5)
      if (near && near.lateral > LANE * 0.62) out.push({ gap: Infinity, dv: 0, reason: 'dog_roadside', track: tr, v0: 7 })
    }

    const now = alongMyLane(route, car.s + 1, R, o.x, o.y, slack)
    if (now) {
      const along = now.along + 1
      if (o.kind === 'car') {
        const lane = at(route, car.s + along).h
        const lead = o.frozen > 0 ? 0 : Math.max(0, o.v * Math.cos(o.h - lane))
        out.push({ gap: along - both(car, o), dv: v - lead, reason: lead < 1 && Math.cos(o.h - lane) < 0.5 ? 'car_crossing' : 'car_ahead', track: tr })
      } else {
        out.push({ gap: along - Math.max(CAR_LEN / 2, len(car) / 2) - o.r - 0.5, dv: v, reason: `${o.kind}_in_lane`, track: tr })
      }
      continue
    }

    for (const t of HORIZON) {
      const f = future(o, t)
      const hit = alongMyLane(route, car.s + 1, R, f.x, f.y, slack)
      if (!hit) continue
      const mine = hit.along / Math.max(v, 1)
      if (mine + 1 < t) break                                      // I'll be through before it arrives
      if (o.kind === 'car') {
        if (Math.cos(o.h - at(route, car.s + hit.along).h) > 0.85 && at(o.route, o.s).ring) break // same way round: just follow
        if (!iYield(car, o, mine, t)) break
        out.push({ gap: hit.along - Math.max(3.5, (len(car) + len(o)) / 2), dv: v, reason: at(route, car.s + hit.along).ring ? 'yield_ring' : 'yield_car', track: tr })
      } else {
        out.push({ gap: hit.along - Math.max(CAR_LEN / 2, len(car) / 2) - 2, dv: v, reason: `${o.kind}_will_cross`, track: tr })
      }
      break
    }
  }
  return out
}

/** Decide: the acceleration to apply and the reason, in words a person would use. */
export function decide(car, world) {
  const st = car.style
  let v0 = st.v0, reason = 'clear', binding = null
  const curve = curveLimit(car)
  if (curve < v0) { v0 = curve; reason = 'curve' }
  // Never faster than it can stop within what it can see. The hasty skip this rule.
  const sight = Math.sqrt(2 * SIGHT_BRAKE * Math.max(0, sightRange(car, world.weather) - st.s0 - Math.max(CAR_LEN, len(car))))
  if (st.sightLimit && sight < v0) { v0 = sight; reason = 'short_sight' }

  const list = constraints(car, world)
  for (const c of list) if (c.v0 != null && c.v0 < v0) { v0 = c.v0; reason = c.reason; binding = c }

  let acc = idm(car.v, v0, Infinity, 0, st)
  for (const c of list) {
    if (c.gap === Infinity) continue
    const a = idm(car.v, v0, c.gap, c.dv, st)
    if (a < acc) { acc = a; reason = c.reason; binding = c }
  }
  acc = Math.max(-MAX_BRAKE, Math.min(st.a, acc))

  const action = car.v < 0.3 && acc <= 0.05 ? 'waiting'
    : acc <= -3 ? 'braking_hard'
    : acc < -0.3 ? 'slowing'
    : acc > 0.3 ? 'speeding_up' : 'cruising'
  return {
    acc,
    targetId: binding?.track?.obj?.id ?? null,
    targetSpeed: v0,
    desiredGap: st.s0 + Math.max(0, car.v * st.T + car.v * (binding?.dv ?? 0) / (2 * Math.sqrt(st.a * st.b))),
    action,
    reason,
    label: binding?.track?.label ?? null,
    conf: binding?.track?.conf ?? null,
    dist: binding && binding.gap !== Infinity ? Math.max(0, binding.gap) : null,
  }
}
