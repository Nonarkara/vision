// The street around the road.
//
// The test track gave cars a lane and nothing else. A camera on a real Thai
// street sees far more than that: kerbs, pavements, shophouses set back behind
// them, street lamps, utility poles with their cables, hydrants, benches,
// planters, and — parked at the kerb, exactly where they always are — bicycles
// and motorcycles.
//
// The distinction this file exists to make:
//
//   SOME of it is something the detector can name. Every detectable item below
//   carries a real COCO class id and the same Thai name the site's own model
//   prints (ml/labels.js). The simulation never invents a class.
//
//   SOME of it is not. A street lamp is right there, 8.5 m tall, and COCO has no
//   class for it — so the simulated camera draws it and never puts a box on it.
//   That is not an omission in the model. It is the lesson: a detector knows a
//   closed list of names, and most of a street is not on the list.
//
// Everything is measured off the track's own centreline at real metres, so a
// kerb is always 3.2 m from the middle of the road and a sedan really is 4.4 m
// long beside it.

import { LANE, STEP, at } from './track.js?v=1.16.0'
import { rng } from './rand.js?v=1.16.0'

/** Everything a Thai urban street puts next to the carriageway, in metres. */
export const STREET = {
  pavement: 2.6,        // footway width beyond the kerb face
  kerbHeight: 0.15,     // kerb upstand
  buildingSetback: 1.2, // shophouses sit this far behind the footway
  lampHeight: 8.5,
  lampArm: 1.8,
  poleHeight: 9.0,
  lampEvery: 30,        // metres between street lamps
  poleEvery: 45,
  hydrant: { L: 0.35, W: 0.35, H: 0.9 },
  bench: { L: 1.8, W: 0.6, H: 0.85 },
  planter: { L: 0.9, W: 0.9, H: 1.1 },
  bicycle: { L: 1.7, W: 0.55, H: 1.1 },
  motorcycle: { L: 1.95, W: 0.75, H: 1.15 },
  person: { L: 0.5, W: 0.5, H: 1.7 },
  dog: { L: 0.8, W: 0.35, H: 0.6 },
  stopSign: { L: 0.75, W: 0.08, H: 2.2 },
  pedSignal: { L: 0.35, W: 0.3, H: 2.4 },
}

// Lateral offsets from the road centreline. Positive is the +(-sin h, cos h)
// side, which is the same side draw.js and perspective.js already call left.
const AT = {
  kerb: LANE,
  // Parked against the kerb, not in the lane. A bicycle stood at the edge of
  // the carriageway is 3.65 m from the centreline — outside the 3.2 m half-width
  // the driver treats as "my lane". Putting it at 2.3 m would park it in the
  // middle of the running lane, where every car would brake for it forever.
  parked: LANE + 0.45,
  lamp: LANE + 0.5,
  pole: LANE + 1.6,
  hydrant: LANE + 1.9,
  bench: LANE + 1.9,
  planter: LANE + 1.2,
  stopSign: LANE + 2.0,
  pedSignal: LANE + 1.9,
  standing: LANE + 1.7,
  building: LANE + STREET.pavement + STREET.buildingSetback,
}

// Street objects are identified from here up. Cars are 1…32 and crossing walkers
// start at 100 (world.nextId), so nothing can collide across the three.
export const STREET_ID_BASE = 50000

/** Every item that a detector may or may not be able to name.
 *
 * `coco` is the COCO id, or null when the class simply does not exist — which is
 * the interesting case. `dims` is metres, shared with the collision maths so the
 * drawing and the physics cannot drift apart.
 */
export const ITEMS = {
  lamp: { label: ['เสาไฟ', 'street lamp'], coco: null, dims: { L: 0.3, W: 0.3, H: STREET.lampHeight }, detectable: false },
  pole: { label: ['เสาไฟฟ้า', 'utility pole'], coco: null, dims: { L: 0.24, W: 0.24, H: STREET.poleHeight }, detectable: false },
  building: { label: ['อาคาร', 'building'], coco: null, dims: { L: 12, W: 9, H: 8 }, detectable: false },
  car: { label: ['รถยนต์', 'car'], coco: 3, dims: { L: 4.4, W: 1.8, H: 1.5 }, detectable: true },
  truck: { label: ['รถบรรทุก', 'truck'], coco: 8, dims: { L: 9.6, W: 2.5, H: 3.2 }, detectable: true },
  bus: { label: ['รถบัส', 'bus'], coco: 6, dims: { L: 11.95, W: 2.5, H: 3.3 }, detectable: true },
  person: { label: ['คน', 'person'], coco: 1, dims: STREET.person, detectable: true },
  dog: { label: ['สุนัข', 'dog'], coco: 18, dims: STREET.dog, detectable: true },
  bicycle: { label: ['จักรยาน', 'bicycle'], coco: 2, dims: STREET.bicycle, detectable: true },
  motorcycle: { label: ['รถจักรยานยนต์', 'motorcycle'], coco: 4, dims: STREET.motorcycle, detectable: true },
  hydrant: { label: ['หัวดับเพลิง', 'fire hydrant'], coco: 11, dims: STREET.hydrant, detectable: true },
  bench: { label: ['ม้านั่ง', 'bench'], coco: 15, dims: STREET.bench, detectable: true },
  planter: { label: ['ต้นไม้ในกระถาง', 'potted plant'], coco: 64, dims: STREET.planter, detectable: true },
  stopSign: { label: ['ป้ายหยุด', 'stop sign'], coco: 13, dims: STREET.stopSign, detectable: true },
  light: { label: ['ไฟจราจร', 'traffic light'], coco: 10, dims: { L: 0.4, W: 0.4, H: 3.3 }, detectable: true },
  pedSignal: { label: ['ไฟคนข้าม', 'pedestrian signal'], coco: null, dims: STREET.pedSignal, detectable: false },
  // Never placed, never detected — only ever the wrong name for a dog. The
  // question mark is the camera's own uncertainty, not part of the class name,
  // so it is the one label here that is not byte-identical to labels.js.
  cat: { label: ['แมว?', 'cat?'], coco: 17, dims: STREET.dog, detectable: false },
}

/** A point `lat` metres to the left of the centreline sample `p`. */
export function offset(p, lat) {
  return { x: p.x - Math.sin(p.h) * lat, y: p.y + Math.cos(p.h) * lat }
}

/**
 * Everything standing beside the road, for one track.
 *
 * Deterministic for a given seed, so a layout looks the same every time a
 * visitor picks it and the tests can assert on it.
 */
export function buildStreet(track, { seed = 1, layout = 'practice' } = {}) {
  const r = rng(seed + 977)
  const items = []
  const footways = []
  const routes = Object.entries(track).filter(([id]) => track[id] && typeof track[id] === 'object')

  for (const [id, route] of routes) {
    if (!route.pts) continue

    // Which side of this road gets a footway: the one facing away from the
    // middle of the track. On the two-lane layout the two carriageways are only
    // 3.6 m apart, so a footway on the inside would land in the oncoming lane.
    let cx = 0, cy = 0
    for (const p of route.pts) { cx += p.x; cy += p.y }
    cx /= route.pts.length; cy /= route.pts.length
    const first = at(route, 0)
    const out = offset(first, 1)
    const outer = Math.hypot(out.x - cx, out.y - cy) > Math.hypot(first.x - cx, first.y - cy) ? 1 : -1

    // Pavement as a ribbon: the kerb line and the back-of-footway line, so the
    // top view can fill between them and the windshield can draw a raised kerb.
    {
      const side = outer
      const kerb = []
      const back = []
      for (let s = 0; s < route.len; s += STEP) {
        const p = at(route, s)
        if (p.ring) continue
        kerb.push(offset(p, AT.kerb * side))
        back.push(offset(p, (AT.kerb + STREET.pavement) * side))
      }
      if (kerb.length > 2) footways.push({ id, side, kerb, back })
    }

    // Street furniture at fixed spacing, alternating sides. Never on the ring:
    // a roundabout's furniture belongs in the middle, and the island is a tree.
    let lampSide = 1
    for (let s = 14; s < route.len; s += STREET.lampEvery) {
      const p = at(route, s)
      if (p.ring) continue
      const o = offset(p, AT.lamp * lampSide)
      items.push({ kind: 'lamp', x: o.x, y: o.y, h: p.h, side: lampSide, route: id, s, arm: STREET.lampArm })
      if (r() < 0.55) {
        const q = offset(p, AT.pole * -lampSide)
        items.push({ kind: 'pole', x: q.x, y: q.y, h: p.h, side: -lampSide, route: id, s: s + 18 })
      }
      lampSide = -lampSide
    }

    // Detectable clutter on the footway. Dense enough to be a real kerb, sparse
    // enough that a car still has somewhere to look.
    for (let s = 8; s < route.len; s += 7) {
      const p = at(route, s)
      if (p.ring) continue
      const side = r() < 0.5 ? -1 : 1
      const roll = r()
      const place = (kind, lat, extra = {}) => {
        const o = offset(p, lat * side)
        items.push({ kind, x: o.x, y: o.y, h: p.h, side, route: id, s, ...extra })
      }
      if (roll < 0.16) place('hydrant', AT.hydrant)
      else if (roll < 0.3) place('bench', AT.bench, { h: p.h + Math.PI / 2 })
      else if (roll < 0.44) place('planter', AT.planter)
      // Bicycles and motorcycles stand in the road against the kerb, not on the
      // footway — which is why they are the first thing a car at a junction sees.
      else if (roll < 0.62) place(r() < 0.45 ? 'bicycle' : 'motorcycle', AT.parked)
    }

    // People and dogs on the footway, walking the length of it.
    for (let s = 20; s < route.len; s += 34) {
      const p = at(route, s)
      if (p.ring) continue
      const side = r() < 0.5 ? -1 : 1
      const o = offset(p, AT.standing * side)
      items.push({
        kind: r() < 0.22 ? 'dog' : 'person', x: o.x, y: o.y, h: p.h + (side > 0 ? 0 : Math.PI),
        side, route: id, s, walker: true, phase: r() * Math.PI * 2, speed: 0.8 + r() * 0.5,
        dir: r() < 0.5 ? 1 : -1,
      })
    }

    // Signs and pedestrian signals stand at the crossings, where the geometry
    // already knows there is one.
    for (const { s } of route.zebras ?? []) {
      const p = at(route, s)
      if (p.ring) continue
      const a = offset(p, AT.stopSign)
      items.push({ kind: 'stopSign', x: a.x, y: a.y, h: p.h, side: 1, route: id, s })
      const b = offset(p, AT.pedSignal * -1)
      items.push({ kind: 'pedSignal', x: b.x, y: b.y, h: p.h, side: -1, route: id, s })
    }
  }

  // Buildings sit behind the footway as a continuous terrace, the way a row of
  // shophouses does. They are the backdrop a camera sees over the top of parked
  // motorcycles, and they are never named — COCO has no class for a building.
  for (const fw of footways) {
    if (fw.kerb.length < 24) continue
    const stride = 28                    // samples; STEP is 0.5 m, so 14 m of frontage
    for (let i = 6; i < fw.kerb.length - 6; i += stride) {
      const k = fw.kerb[i], b = fw.back[i]
      let nx = b.x - k.x, ny = b.y - k.y
      const nl = Math.hypot(nx, ny) || 1
      nx /= nl; ny /= nl
      const depth = 10
      const width = stride * STEP - 0.8 // a gap, so the terrace reads as buildings
      items.push({
        kind: 'building',
        x: b.x + (nx * depth) / 2,
        y: b.y + (ny * depth) / 2,
        h: Math.atan2(ny, nx),
        side: fw.side,
        depth,
        width,
        height: 5 + ((i * 7) % 12),
      })
    }
  }

  // The tracker keys its map on object id (car.tracks is a Map), so every street
  // object needs a real unique id of its own. Cars are 1…32 and walkers start at
  // 100, so street furniture starts well clear of both. Without this every kerb
  // object collides on one undefined key and the camera can only ever believe in
  // a single piece of street at a time.
  // Where two roads cross, one road's footway lands inside the other road's
  // carriageway. A bench or a pedestrian standing there would sit squarely in
  // oncoming traffic, and a driver that sees it would brake for it forever — so
  // nothing is placed near a crossing at all. Real junctions are kept clear for
  // the same reason: sight lines.
  const CROSSING_CLEAR = LANE + STREET.pavement + 3.5

  /** Shortest distance from (x, y) to any route's centreline, ignoring one route. */
  function nearestRoad(track, x, y, except) {
    let best = Infinity
    for (const [id, route] of Object.entries(track)) {
      if (id === except || !route.pts) continue
      for (const p of route.pts) {
        const d = Math.hypot(p.x - x, p.y - y)
        if (d < best) best = d
      }
    }
    return best
  }

  items.forEach((it, i) => {
    it.id = STREET_ID_BASE + i
    // The exclusion radius every tracked object needs, so the driver model's
    // lane test has a number to work with instead of undefined.
    const dims = ITEMS[it.kind]?.dims
    it.r = it.kind === 'person' ? 0.35 : it.kind === 'dog' ? 0.5 : dims ? Math.max(dims.L, dims.W) / 2 : 0.5
    // A dog on a footway is somebody's pet; a dog in the road is a stray. Only
    // the stray is the hazard the cautious driver slows for.
    if (it.kind === 'dog') it.pet = true
  })

  const kept = items.filter((it) => {
    if (it.kind === 'building') return true
    return nearestRoad(track, it.x, it.y, it.route) > CROSSING_CLEAR
  })

  return { items: kept, footways }
}

/** Items a detector could in principle put a box on. */
export function detectable(street) {
  return street.items.filter((it) => ITEMS[it.kind]?.detectable)
}

/** Items the camera can see but has no name for. */
export function unnameable(street) {
  return street.items.filter((it) => !ITEMS[it.kind]?.detectable)
}

const LIGHT_STATES = ['red', 'amber', 'green']

/**
 * Move the living things. Lamp posts and shophouses never move, so the only
 * per-frame work is people and dogs walking their footway.
 */
export function stepStreet(street, world) {
  for (const it of street.items) {
    if (!it.walker) continue
    it.phase += world.t * it.speed * 2
    const s = it.s + Math.sin(world.t * 0.12 * it.speed + it.phase) * 2.5 * it.dir
    const route = world.track[it.route]
    if (!route) continue
    const p = at(route, s)
    const lat = (AT.standing + Math.sin(world.t * 0.4 + it.phase) * 0.35) * it.side
    it.x = p.x - Math.sin(p.h) * lat
    it.y = p.y + Math.cos(p.h) * lat
    it.h = p.h + (it.side > 0 ? 0 : Math.PI)
  }
}