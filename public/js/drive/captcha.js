// A CAPTCHA, built out of the same street simulator the room teaches with.
//
// The point is not security. Nobody is being protected here; the server stores
// no score and there is nothing to attack. The point is that a visitor who
// passes this has just done, for thirty seconds and without being told, exactly
// the job that built the detectors: looking at pictures of streets and saying
// which ones contain a traffic light.
//
// That job has a name and a history. From 2007, Luis von Ahn's reCAPTCHA put
// scanned words into a security check, so that proving you were human also
// digitised books. From 2012 it put Street View photographs into a security
// check, so that proving you were human also produced human-labelled images of
// streets — sold on as machine-learning training data. Google's own description
// says so plainly: every solved CAPTCHA "helps digitize text, annotate images,
// and build machine learning datasets."
//
// Two honest limits, stated on the page rather than hidden:
//   1. The labels from those challenges trained Google's models, not this
//      site's. The detectors running in your browser here are SSDLite +
//      MobileNetV2 trained on COCO (Lin et al., 2014) and ImageNet — also
//      human-labelled, by people who were paid, over years.
//   2. The point at which the machine passed the test is documented: Goodfellow
//      et al. (2014) read the hardest distorted-text reCAPTCHAs at 99.8%, while
//      people managed 33%. That is why the challenges changed shape each time.

import { rng } from './rand.js?v=1.14.0'

export const GRID = 3
export const TILES = GRID * GRID

/** What a challenge can ask you to find. All real COCO categories. */
export const TARGETS = [
  { key: 'light', coco: 10, label: ['ไฟจราจร', 'traffic lights'] },
  { key: 'bicycle', coco: 2, label: ['จักรยาน', 'bicycles'] },
  { key: 'person', coco: 1, label: ['คน', 'people'] },
  { key: 'motorcycle', coco: 4, label: ['รถจักรยานยนต์', 'motorbikes'] },
]

/**
 * One challenge: which tiles contain the target, and how many.
 *
 * Deterministic for a seed, so a test can assert the answer and a visitor who
 * reloads sees the same grid rather than a new one each time.
 */
export function makeChallenge(seed = 1, targetIndex = 0) {
  const r = rng(seed * 7919 + 13)
  const target = TARGETS[((targetIndex % TARGETS.length) + TARGETS.length) % TARGETS.length]
  // Between two and six of the nine tiles must contain it: too few and there is
  // nothing to find, too many and the challenge is a formality.
  const count = 2 + Math.floor(r() * 5)
  const order = [...Array(TILES).keys()]
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  const hits = new Set(order.slice(0, count))
  const others = TARGETS.filter((t) => t.key !== target.key)
  const tiles = order.map((slot) => {
    const rr = rng(seed * 1000 + slot + 5)
    return {
      slot,
      has: hits.has(slot),
      // Distractors, so a tile is never empty and never trivially "no".
      also: others.filter(() => rr() < 0.5),
    }
  })
  return { seed, target, tiles, answer: [...hits].sort((a, b) => a - b) }
}

/** Did the visitor pick exactly the right tiles? No partial credit, no penalty. */
export function check(challenge, picked) {
  const want = challenge.answer
  const got = [...new Set(picked)].sort((a, b) => a - b)
  if (got.length !== want.length) return false
  return got.every((v, i) => v === want[i])
}

/** How many were right and how many were missed, for an honest explanation. */
export function score(challenge, picked) {
  const got = new Set(picked)
  const right = challenge.answer.filter((s) => got.has(s)).length
  return { right, missed: challenge.answer.length - right, extra: [...got].filter((s) => !challenge.answer.includes(s)).length }
}