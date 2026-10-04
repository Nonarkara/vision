// Classical computer vision: everything a machine can do to a picture before
// any learning is involved. Pure functions over ImageData-shaped objects
// ({ data, width, height }), so the same code runs in the browser and in the
// Node tests. No canvas, no DOM, no model.
//
// These are the lenses on /learn. Each one is small enough to read, because
// the point is that a child can be told exactly what the machine did.

/** Luma from RGB — the same weights (ITU-R BT.601) ffmpeg uses for "gray". */
export const luma = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b

export function toGray(img) {
  const { data, width, height } = img
  const out = new Float32Array(width * height)
  for (let i = 0, p = 0; i < out.length; i++, p += 4) out[i] = luma(data[p], data[p + 1], data[p + 2])
  return out
}

/** Paint a one-channel array (0–255) into RGBA. `into` is reused when given. */
export function grayToRgba(gray, width, height, into = null) {
  const out = into ?? { data: new Uint8ClampedArray(width * height * 4), width, height }
  const d = out.data
  for (let i = 0, p = 0; i < gray.length; i++, p += 4) {
    const v = gray[i] < 0 ? 0 : gray[i] > 255 ? 255 : gray[i]
    d[p] = d[p + 1] = d[p + 2] = v
    d[p + 3] = 255
  }
  return out
}

/** Keep one colour channel; the others go dark. */
export function channel(img, which) {
  const k = { r: 0, g: 1, b: 2 }[which]
  const out = new Uint8ClampedArray(img.data.length)
  for (let p = 0; p < out.length; p += 4) {
    out[p + k] = img.data[p + k]
    out[p + 3] = 255
  }
  return { data: out, width: img.width, height: img.height }
}

/** Light-or-dark with one number. Returns a 0/1 mask. */
export function threshold(gray, t) {
  const out = new Uint8Array(gray.length)
  for (let i = 0; i < gray.length; i++) out[i] = gray[i] >= t ? 1 : 0
  return out
}

/**
 * Otsu's method: the threshold that best separates dark from light by
 * maximising between-class variance. The "automatic" button on /learn.
 */
export function otsu(gray) {
  const hist = histogram(gray)
  const total = gray.length
  let sum = 0
  for (let i = 0; i < 256; i++) sum += i * hist[i]
  let sumB = 0, wB = 0, best = 0, bestT = 127
  for (let t = 0; t < 256; t++) {
    wB += hist[t]
    if (wB === 0) continue
    const wF = total - wB
    if (wF === 0) break
    sumB += t * hist[t]
    const mB = sumB / wB, mF = (sum - sumB) / wF
    const between = wB * wF * (mB - mF) ** 2
    if (between > best) { best = between; bestT = t }
  }
  return bestT
}

export function histogram(gray) {
  const h = new Uint32Array(256)
  for (let i = 0; i < gray.length; i++) h[Math.max(0, Math.min(255, gray[i] | 0))]++
  return h
}

/**
 * Slide a 3×3 kernel over the picture: every output pixel is the weighted sum
 * of its neighbours. This one operation is the seed of every convolutional
 * neural network. Edges are clamped (the border pixel repeats).
 */
export function convolve3(gray, width, height, k) {
  const out = new Float32Array(gray.length)
  for (let y = 0; y < height; y++) {
    const y0 = y > 0 ? y - 1 : 0, y2 = y < height - 1 ? y + 1 : y
    for (let x = 0; x < width; x++) {
      const x0 = x > 0 ? x - 1 : 0, x2 = x < width - 1 ? x + 1 : x
      out[y * width + x] =
        k[0] * gray[y0 * width + x0] + k[1] * gray[y0 * width + x] + k[2] * gray[y0 * width + x2] +
        k[3] * gray[y * width + x0] + k[4] * gray[y * width + x] + k[5] * gray[y * width + x2] +
        k[6] * gray[y2 * width + x0] + k[7] * gray[y2 * width + x] + k[8] * gray[y2 * width + x2]
    }
  }
  return out
}

export const KERNELS = {
  identity: [0, 0, 0, 0, 1, 0, 0, 0, 0],
  blur: [1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9],
  sharpen: [0, -1, 0, -1, 5, -1, 0, -1, 0],
  edges: [-1, -1, -1, -1, 8, -1, -1, -1, -1],
  vertical: [-1, 0, 1, -2, 0, 2, -1, 0, 1],
  horizontal: [-1, -2, -1, 0, 0, 0, 1, 2, 1],
  emboss: [-2, -1, 0, -1, 1, 1, 0, 1, 2],
}

/** Sobel: how fast brightness changes, and in which direction. */
export function sobel(gray, width, height) {
  const gx = convolve3(gray, width, height, KERNELS.vertical)
  const gy = convolve3(gray, width, height, KERNELS.horizontal)
  const mag = new Float32Array(gray.length)
  for (let i = 0; i < mag.length; i++) mag[i] = Math.hypot(gx[i], gy[i])
  return { gx, gy, mag }
}

/** Blocky picture: average each `block`×`block` square. What a machine sees at low resolution. */
export function pixelate(img, block) {
  const { data, width, height } = img
  const out = new Uint8ClampedArray(data.length)
  const b = Math.max(1, block | 0)
  for (let by = 0; by < height; by += b) {
    for (let bx = 0; bx < width; bx += b) {
      let r = 0, g = 0, bl = 0, n = 0
      const yEnd = Math.min(by + b, height), xEnd = Math.min(bx + b, width)
      for (let y = by; y < yEnd; y++) for (let x = bx; x < xEnd; x++) {
        const p = (y * width + x) * 4
        r += data[p]; g += data[p + 1]; bl += data[p + 2]; n++
      }
      r /= n; g /= n; bl /= n
      for (let y = by; y < yEnd; y++) for (let x = bx; x < xEnd; x++) {
        const p = (y * width + x) * 4
        out[p] = r; out[p + 1] = g; out[p + 2] = bl; out[p + 3] = 255
      }
    }
  }
  return { data: out, width, height }
}

/** Per-pixel change between two gray frames; 1 where it moved more than `delta`. */
export function diffMask(a, b, delta = 18) {
  const n = Math.min(a.length, b.length)
  const out = new Uint8Array(n)
  for (let i = 0; i < n; i++) out[i] = Math.abs(a[i] - b[i]) >= delta ? 1 : 0
  return out
}

/** Grow a mask by one pixel (3×3), so a car's broken outline becomes one shape. */
export function dilate(mask, width, height) {
  const out = new Uint8Array(mask.length)
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    let on = 0
    for (let dy = -1; dy <= 1 && !on; dy++) {
      const yy = y + dy
      if (yy < 0 || yy >= height) continue
      for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx
        if (xx >= 0 && xx < width && mask[yy * width + xx]) { on = 1; break }
      }
    }
    out[y * width + x] = on
  }
  return out
}

/**
 * Connected regions of a mask (4-neighbour flood fill). Each blob is a box
 * and an area. Blobs smaller than `minArea` pixels are noise and dropped.
 */
export function blobs(mask, width, height, minArea = 12) {
  const seen = new Uint8Array(mask.length)
  const stack = new Int32Array(mask.length)
  const out = []
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || seen[start]) continue
    let top = 0, area = 0
    let minX = width, minY = height, maxX = 0, maxY = 0
    stack[top++] = start
    seen[start] = 1
    while (top) {
      const i = stack[--top]
      const x = i % width, y = (i / width) | 0
      area++
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
      if (x > 0 && mask[i - 1] && !seen[i - 1]) { seen[i - 1] = 1; stack[top++] = i - 1 }
      if (x < width - 1 && mask[i + 1] && !seen[i + 1]) { seen[i + 1] = 1; stack[top++] = i + 1 }
      if (y > 0 && mask[i - width] && !seen[i - width]) { seen[i - width] = 1; stack[top++] = i - width }
      if (y < height - 1 && mask[i + width] && !seen[i + width]) { seen[i + width] = 1; stack[top++] = i + width }
    }
    if (area >= minArea) out.push({ x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1, area })
  }
  return out.sort((a, b) => b.area - a.area)
}

/** Mean and spread of brightness, plus mean saturation — the "how does this frame look" numbers. */
export function frameStats(img) {
  const { data } = img
  const n = data.length / 4
  let sum = 0, sum2 = 0, sat = 0
  for (let p = 0; p < data.length; p += 4) {
    const r = data[p], g = data[p + 1], b = data[p + 2]
    const y = luma(r, g, b)
    sum += y; sum2 += y * y
    sat += Math.max(r, g, b) - Math.min(r, g, b)
  }
  const mean = sum / n
  return { mean, std: Math.sqrt(Math.max(0, sum2 / n - mean * mean)), saturation: sat / n }
}

/**
 * A plain reading of the frame, deliberately conservative. These are image
 * statistics, not facts about the world: "dark" means the pixels are dark, not
 * that it is night; "washed out" might be fog, rain on the lens or a bright sky.
 * Thresholds follow FloodDash's public/js/cv/detect.js haze test.
 */
export function readFrame(img) {
  const s = frameStats(img)
  return {
    ...s,
    dark: s.mean < 55,
    washedOut: s.mean >= 120 && s.std <= 34 && s.saturation <= 26,
    flat: s.std < 18,
  }
}
