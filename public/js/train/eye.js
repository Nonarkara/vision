// The frozen half of transfer learning: MobileNetV2 turning a frame into
// 1,280 numbers. Every look goes through one queue, so a click, a held
// "record" button, the live preview and a country-wide judge run never fight
// over the graphics card — and nothing loads until the first look is asked for.

import { look } from '../ml/embedder.js'
import { normalize } from '../ml/learner.js'

export const EMBED_WIDTH = 224

let chain = Promise.resolve()
let pending = 0
let loaded = false

/** True while a look is queued or running. Repeating callers (hold, live) skip a beat instead of piling up. */
export const isBusy = () => pending > 0
export const isLoaded = () => loaded

/**
 * Copy the current frame into a canvas of its own, at the network's width.
 * The copy matters: the embedding is computed a moment later, and by then
 * the source may have moved on to the next frame.
 */
export function snapshot(source, width = EMBED_WIDTH) {
  if (!source?.ready) return null
  const height = Math.max(1, Math.round((width * source.height) / source.width))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  source.drawTo(canvas.getContext('2d'), width, height)
  return canvas
}

/** A small copy for a thumbnail strip. */
export function shrink(canvas, width = 96) {
  const out = document.createElement('canvas')
  out.width = width
  out.height = Math.max(1, Math.round((width * canvas.height) / canvas.width))
  out.getContext('2d').drawImage(canvas, 0, 0, out.width, out.height)
  return out
}

/**
 * Look at a canvas; resolves to a unit-length Float32Array(1280). Unit length,
 * because both learners compare directions, not magnitudes.
 */
export function embed(canvas) {
  pending++
  const job = chain
    .then(() => look(canvas))
    .then(({ embedding }) => { loaded = true; return normalize(embedding) })
    .finally(() => { pending-- })
  chain = job.catch(() => { /* one failed look must not block the queue */ })
  return job
}
