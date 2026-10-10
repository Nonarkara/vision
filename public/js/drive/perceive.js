// What a car sees. This is a simulated camera, not a neural network: each
// object inside the car's field of view is "detected" with a probability that
// falls with distance, size, weather and the camera's quality — the same shape
// of failure a real detector has. A detection carries a label and a confidence;
// a dog far away is sometimes called a cat. A short memory (the tracker) keeps
// an object for a moment after the camera loses it.
//
// The class table below is not invented. Every entry is a real COCO category
// (Lin et al., 2014) with the id the site's own detector was trained on, in
// ml/labels.js. Street lamps, poles, kerbs, buildings and pedestrian signals are
// absent because COCO has no category for them — so the simulated camera walks
// past an 8.5 m lamp post and never names it, which is the correct behaviour
// for a detector with a closed vocabulary.

import { wrap } from './track.js'

export const FOV = (150 * Math.PI) / 180   // front + side cameras together
export const MEMORY = 0.7                   // seconds a lost object is still believed in

export const WEATHER = {
  day: { range: 1, p: 1 },
  sun: { range: 0.85, p: 0.9 },
  rain: { range: 0.75, p: 0.88 },
  night: { range: 0.6, p: 0.8 },
}

/**
 * One row per class.
 *   size  — how much of the frame it fills, which is what decides whether it is
 *           found at all. A lorry fills more than a sedan; a fire hydrant less
 *           than a bicycle.
 *   conf  — the best score it reaches close up in daylight.
 *   far   — beyond this fraction of sight range, it may be called something else.
 */
const CLASSES = {
  car: { size: 1.0, conf: 0.96 },
  truck: { size: 1.25, conf: 0.97 },
  bus: { size: 1.3, conf: 0.97 },
  person: { size: 0.93, conf: 0.93 },
  dog: { size: 0.82, conf: 0.88, far: 0.55 },
  motorcycle: { size: 0.78, conf: 0.85, far: 0.5 },
  bicycle: { size: 0.7, conf: 0.79, far: 0.45 },
  light: { size: 0.64, conf: 0.83 },        // bright and high-contrast: found easily close up
  stopSign: { size: 0.6, conf: 0.8 },
  planter: { size: 0.58, conf: 0.74 },
  hydrant: { size: 0.55, conf: 0.68 },     // small, and often mistaken for a person
  bench: { size: 0.52, conf: 0.62 },       // flat, and the easiest thing here to miss
}

// Confusion pairs, with how often the wrong name is chosen once the object is
// far enough to be ambiguous, and how much confidence the mistake costs.
const CONFUSE = {
  dog: [['cat', 0.35, 0.55]],
  bicycle: [['motorcycle', 0.25, 0.6]],
  motorcycle: [['bicycle', 0.2, 0.6]],
  hydrant: [['person', 0.3, 0.45]],
  planter: [['potted plant', 0.1, 0.8]],
}

const BODY_SIZE = { car: 1, pickup: 1.05, truck: 1.25, bus: 1.3 }
const BODY_LABEL = { car: 'car', pickup: 'car', truck: 'truck', bus: 'bus' }

/** How far this car can see right now, in metres. */
export function sightRange(car, weather) {
  return car.style.range * WEATHER[weather].range
}

/** Chance of seeing an object at distance d this look (0–1). Exported for tests and the page. */
export function detectChance(car, kind, d, weather, body = 'car') {
  if (car.blind) return 0
  const R = sightRange(car, weather)
  if (d > R) return 0
  const cls = CLASSES[kind] ?? CLASSES.person
  return car.style.quality * WEATHER[weather].p * cls.size * BODY_SIZE[body] * (1 - 0.6 * (d / R) ** 2)
}

/** The confidence a class reaches at this distance, before any confusion. */
export function classConfidence(kind, far, weather, body = 'car') {
  const cls = CLASSES[kind] ?? CLASSES.person
  return Math.max(0.3, Math.min(0.99, (cls.conf + (BODY_SIZE[body] - 1) * 0.35) * (1 - 0.3 * far) * WEATHER[weather].p))
}

/** One look: update the car's tracks from everything in its field of view. */
export function perceive(car, world, rng) {
  const R = sightRange(car, world.weather)
  for (const obj of world.objects()) {
    if (obj === car || obj.gone) continue
    const dx = obj.x - car.x, dy = obj.y - car.y
    const d = Math.hypot(dx, dy)
    if (d > R || Math.abs(wrap(Math.atan2(dy, dx) - car.h)) > FOV / 2) continue
    const body = obj.kind === 'car' ? (obj.body ?? 'car') : 'car'
    if (rng() >= detectChance(car, obj.kind, d, world.weather, body)) continue
    const far = d / R
    let label = obj.kind === 'car' ? BODY_LABEL[obj.body ?? 'car'] : obj.kind
    let conf = classConfidence(obj.kind, far, world.weather, body)
    // Only classes with a listed confusion can be misnamed, and only once they
    // are small enough in frame to be ambiguous.
    const pairs = CONFUSE[label]
    if (pairs && far > (CLASSES[label]?.far ?? 1)) {
      for (const [wrong, chance, penalty] of pairs) {
        if (rng() < chance) { label = wrong; conf *= penalty; break }
      }
    }
    conf = Math.max(0.3, Math.min(0.99, conf + (rng() - 0.5) * 0.08))
    car.tracks.set(obj.id, { obj, last: world.t, label, conf })
  }
  for (const [id, tr] of car.tracks) {
    if (tr.obj.gone || world.t - tr.last > MEMORY) car.tracks.delete(id)
  }
}

/** Every class this camera can print, for the page's legend. */
export function knownClasses() {
  return Object.keys(CLASSES)
}