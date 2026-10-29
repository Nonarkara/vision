// What a finger count does to the screen.
//
// Everything here is pure arithmetic on the count, so a test can pin the
// curve instead of the pixels: the fade, the brush, the rhythm of the notes,
// the fall of a sheet of paper. The page draws what these say.

import { saturation } from './fingers.js?v=1.24.2'

/**
 * The picture's colour at a given count.
 *
 * One finger is the camera as it is; ten is black and white. As the colour
 * leaves, the picture gains a little contrast and loses a little brightness —
 * the way a photograph behaves when it is drained of colour, rather than a
 * slider being dragged across a CSS filter.
 */
export function fade(count) {
  const s = saturation(count || 1)
  return {
    saturate: s,
    contrast: 1 + (1 - s) * 0.16,
    brightness: 1 - (1 - s) * 0.07,
  }
}

/** The same curve as a CSS filter, for the canvas that holds the camera picture. */
export function fadeCss(count) {
  const f = fade(count)
  const n = (v) => v.toFixed(3)
  return `saturate(${n(f.saturate)}) contrast(${n(f.contrast)}) brightness(${n(f.brightness)})`
}

/**
 * The brush a fingertip draws with: one finger is a fine line, ten is a broad
 * sweep across the picture.
 */
export function brush(count) {
  const n = Math.min(10, Math.max(1, count || 1))
  return 2 + (n - 1) * 2.6
}

/**
 * The notes just played, each carrying the silence that came before it, so
 * the strip shows the rhythm and not only the tune.
 */
export function noteStrip(events, { keep = 12 } = {}) {
  const recent = events.slice(-keep)
  return recent.map((event, i) => ({
    name: event.name,
    gap: i === 0 ? 0 : Math.min(1, Math.max(0, (event.at - recent[i - 1].at) / 1500)),
  }))
}

/**
 * One step of paper falling. The sheet flutters as it turns, so it is narrow
 * at the edge-on moments and broad face-on, and it drifts as it goes.
 */
export function fall(piece, age) {
  const spin = piece.spin * age
  return {
    x: piece.x + piece.vx * age + Math.sin(age * 2.2 + piece.phase) * 10,
    y: piece.y + piece.vy * age + age * age * 24,
    w: piece.w * Math.abs(Math.cos(spin)),
    h: piece.h,
    angle: spin,
  }
}

/**
 * The ring a struck note sends out from the finger that played it. It opens
 * and fades; it never grows forever.
 */
export function pulse(age, { life = 0.9 } = {}) {
  const t = Math.min(1, Math.max(0, age / life))
  return { t, radius: 10 + t * 84, alpha: (1 - t) * 0.85 }
}
