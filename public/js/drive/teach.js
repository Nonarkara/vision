// The loop the CAPTCHA has always described, closed — here, in the tab.
//
// von Ahn's reCAPTCHA made a promise it kept: the work you did proving you
// were human became training data. The gate in front of this room tells that
// story, and then admits the site's own limits: the labels from those
// challenges trained Google's models, not this site's. This module is the
// honest remainder. When a visitor passes the gate, their nine labels are
// handed to the smallest learner that can honestly be called one — a
// logistic regression over 67 numbers — trained in the visitor's own
// browser, tested on a grid it has never seen. No upload, no server, no
// dataset: the visitor watches exactly what nine labels teach, which is
// very little, and that is the lesson. reCAPTCHA worked because millions
// of people solved one every day.
//
// What the learner sees is deliberately pre-deep-learning:
//   - an 8×8 grid of mean brightness (64 numbers) — where the light and the
//     dark things are, and nothing else;
//   - three colour filters (3 numbers) — the fraction of pixels close to a
//     traffic light's red, amber and green. A human chose those three. That
//     hand is the one deep learning removed; chapters 03 and 05 of the
//     handbook teach both ways of seeing.
//
// Pure functions on pixel arrays: the page supplies the pixels (from a
// canvas), the tests supply synthetic ones, and neither needs the other.

export const VIEW = 8 // the learner's whole world: an 8×8 grid of brightness

// The three colours a traffic light actually emits, as the gate draws them.
// A person picked these, and the page says so.
const FILTERS = [
  [232, 65, 43],   // red
  [244, 196, 48],  // amber
  [95, 196, 107],  // green
]

/**
 * One tile, as the learner sees it: 64 brightness cells plus 3 colour
 * fractions. `data` is RGBA pixels of width `w`, height `h`.
 */
export function features(data, w, h) {
  const cells = new Float64Array(VIEW * VIEW)
  const counted = new Float64Array(VIEW * VIEW)
  const filterHits = new Float64Array(FILTERS.length)
  for (let y = 0; y < h; y++) {
    const row = Math.min(VIEW - 1, Math.floor((y / h) * VIEW))
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      const r = data[i], g = data[i + 1], b = data[i + 2]
      const cell = row * VIEW + Math.min(VIEW - 1, Math.floor((x / w) * VIEW))
      cells[cell] += 0.299 * r + 0.587 * g + 0.114 * b
      counted[cell]++
      for (let f = 0; f < FILTERS.length; f++) {
        const [fr, fg, fb] = FILTERS[f]
        if (Math.abs(r - fr) + Math.abs(g - fg) + Math.abs(b - fb) < 90) filterHits[f]++
      }
    }
  }
  const out = new Array(VIEW * VIEW)
  for (let i = 0; i < out.length; i++) out[i] = cells[i] / (counted[i] * 255)
  const total = Math.max(1, w * h)
  for (const hits of filterHits) out.push(hits / total)
  return out
}

/**
 * Logistic regression by plain gradient descent. Fixed sample order, fixed
 * schedule: the same nine labels always teach the same machine, which is
 * the only honesty a toy this size can offer.
 */
export function train(samples, { steps = 300, lr = 1, l2 = 0.001 } = {}) {
  const dim = samples[0]?.x.length ?? 0
  const w = new Float64Array(dim)
  let b = 0
  if (!samples.length) return { w, b }
  for (let t = 0; t < steps; t++) {
    const s = samples[t % samples.length]
    const err = predict({ w, b }, s.x) - (s.y ? 1 : 0)
    const step = lr * (1 - t / steps)
    for (let j = 0; j < dim; j++) w[j] -= step * (err * s.x[j] + l2 * w[j])
    b -= step * err
  }
  return { w, b }
}

/** Probability that this tile contains the target, 0–1. */
export function predict(model, x) {
  let z = model.b
  for (let j = 0; j < model.w.length; j++) z += model.w[j] * (x[j] ?? 0)
  return 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, z))))
}

/** Which of these tiles the learner calls positive, with its confidence. */
export function pick(model, tiles) {
  return tiles
    .map((x, i) => ({ i, p: predict(model, x) }))
    .filter((t) => t.p >= 0.5)
}
