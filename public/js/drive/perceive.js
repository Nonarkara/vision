// What a car sees. This is a simulated camera, not a neural network: each
// object inside the car's field of view is "detected" with a probability
// that falls with distance, size, weather and the camera's quality — the
// same shape of failure a real detector has. A detection carries a label and
// a confidence; a dog far away is sometimes called a cat. A short memory
// (the tracker) keeps an object for a moment after the camera loses it.

import { wrap } from './track.js'

export const FOV = (150 * Math.PI) / 180   // front + side cameras together
export const MEMORY = 0.7                   // seconds a lost object is still believed in

export const WEATHER = {
  day: { range: 1, p: 1 },
  sun: { range: 0.85, p: 0.9 },
  rain: { range: 0.75, p: 0.88 },
  night: { range: 0.6, p: 0.8 },
}

const SIZE = { car: 1, person: 0.93, dog: 0.82 }    // smaller things are missed more often
const BASE = { car: 0.96, person: 0.93, dog: 0.88 } // best confidence, up close, in daylight
// A lorry fills more of the frame than a sedan: the simulated detector is
// more likely to see it, and more sure when it does. COCO really has
// separate truck and bus classes, so the big ones get their real names.
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
  return car.style.quality * WEATHER[weather].p * SIZE[kind] * BODY_SIZE[body] * (1 - 0.6 * (d / R) ** 2)
}

/** One look: update the car's tracks from everything in its field of view. */
export function perceive(car, world, rng) {
  const R = sightRange(car, world.weather)
  for (const obj of world.objects()) {
    if (obj === car || obj.gone) continue
    const dx = obj.x - car.x, dy = obj.y - car.y
    const d = Math.hypot(dx, dy)
    if (d > R || Math.abs(wrap(Math.atan2(dy, dx) - car.h)) > FOV / 2) continue
    if (rng() >= detectChance(car, obj.kind, d, world.weather, obj.body)) continue
    const far = d / R
    const label = obj.kind === 'dog' && far > 0.55 && rng() < 0.35 ? 'cat' : obj.kind === 'car' ? BODY_LABEL[obj.body ?? 'car'] : obj.kind
    const conf = Math.max(0.3, Math.min(0.99, (BASE[obj.kind] + (BODY_SIZE[obj.body ?? 'car'] - 1) * 0.35) * (1 - 0.3 * far) * WEATHER[world.weather].p + (rng() - 0.5) * 0.08))
    car.tracks.set(obj.id, { obj, last: world.t, label, conf: label === 'cat' ? conf * 0.55 : conf })
  }
  for (const [id, tr] of car.tracks) {
    if (tr.obj.gone || world.t - tr.last > MEMORY) car.tracks.delete(id)
  }
}
