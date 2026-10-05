// Drawing onto raw RGBA arrays — the Node twin of public/js/cv/draw.js.
// Peach Red marks a machine finding, as on the site.

import { grayToRgba } from '../../public/js/cv/ops.js'

export const SIGNAL = [241, 90, 48]
export const NAPLES = [251, 230, 160]
export const OLIVE = [37, 49, 34]
export const GRAY = [182, 191, 193]

export function copy(img) {
  return { data: new Uint8ClampedArray(img.data), width: img.width, height: img.height }
}

export function strokeRect(img, box, color = SIGNAL, thickness = 1, margin = 2) {
  const x = box.x - margin, y = box.y - margin, w = box.w + 2 * margin, h = box.h + 2 * margin
  const put = (px, py) => {
    if (px < 0 || py < 0 || px >= img.width || py >= img.height) return
    img.data.set([...color, 255], (py * img.width + px) * 4)
  }
  for (let t = 0; t < thickness; t++) {
    for (let px = x - t; px < x + w + t; px++) { put(px, y - t); put(px, y + h - 1 + t) }
    for (let py = y - t; py < y + h + t; py++) { put(x - t, py); put(x + w - 1 + t, py) }
  }
  return img
}

/** Paint mask pixels in a colour over a picture. */
export function tint(img, mask, color = SIGNAL) {
  const out = copy(img)
  for (let i = 0; i < mask.length; i++) if (mask[i]) out.data.set([...color, 255], i * 4)
  return out
}

/** A one-channel array → RGBA. Values are clamped to 0–255. */
export function grayImage(gray, width, height) {
  return grayToRgba(gray, width, height)
}

/** Absolute value, scaled so the biggest response is white — how edge maps are shown. */
export function magnitudeImage(values, width, height) {
  let max = 0
  for (const v of values) max = Math.max(max, Math.abs(v))
  return grayToRgba(Float32Array.from(values, (v) => (Math.abs(v) / (max || 1)) * 255), width, height)
}

/** Darken a picture (to make overlays readable). */
export function dim(img, k = 0.45) {
  const out = copy(img)
  for (let p = 0; p < out.data.length; p += 4) for (let c = 0; c < 3; c++) out.data[p + c] *= k
  return out
}

/** Place pictures side by side with a gap, on an olive ground. */
export function row(images, gap = 4) {
  const height = Math.max(...images.map((i) => i.height))
  const width = images.reduce((s, i) => s + i.width, 0) + gap * (images.length - 1)
  const out = { data: new Uint8ClampedArray(width * height * 4), width, height }
  for (let p = 0; p < out.data.length; p += 4) out.data.set([...OLIVE, 255], p)
  let ox = 0
  for (const im of images) {
    for (let y = 0; y < im.height; y++) out.data.set(im.data.subarray(y * im.width * 4, (y + 1) * im.width * 4), (y * width + ox) * 4)
    ox += im.width + gap
  }
  return out
}

/** Stack pictures top to bottom with a gap. */
export function column(images, gap = 4) {
  const width = Math.max(...images.map((i) => i.width))
  const height = images.reduce((s, i) => s + i.height, 0) + gap * (images.length - 1)
  const out = { data: new Uint8ClampedArray(width * height * 4), width, height }
  for (let p = 0; p < out.data.length; p += 4) out.data.set([...OLIVE, 255], p)
  let oy = 0
  for (const im of images) {
    for (let y = 0; y < im.height; y++) out.data.set(im.data.subarray(y * im.width * 4, (y + 1) * im.width * 4), ((oy + y) * width) * 4)
    oy += im.height + gap
  }
  return out
}
