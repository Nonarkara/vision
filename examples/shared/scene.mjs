// A synthetic road scene, drawn pixel by pixel.
//
// Why synthetic: the examples and the figures in docs/ must never contain a
// real camera frame. Real frames have real people in them, and this project
// keeps no camera imagery (see docs/08-limits-and-ethics.md). A drawn scene
// also has an answer key: we know exactly where every car is, which a real
// frame never tells you.
//
// scene({ t }) moves the cars, so two calls make a "before" and "after" for
// motion examples. Everything is deterministic: same input, same pixels.

export const W = 320
export const H = 180
export const HORIZON = 72

function rng(seed) {
  let s = seed >>> 0
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
}

/** Where the cars are at time t — the answer key for detection examples. */
export function carsAt(t = 0) {
  return [
    { label: 'car', x: Math.round(96 + 22 * t), y: 118, w: 52, h: 28, body: [176, 42, 38] },
    { label: 'car', x: Math.round(190 - 10 * t), y: 94, w: 30, h: 17, body: [222, 222, 214] },
    { label: 'motorcycle', x: Math.round(150 + 14 * t), y: 142, w: 12, h: 20, body: [32, 34, 40] },
  ]
}

export function scene({ t = 0, seed = 42 } = {}) {
  const data = new Uint8ClampedArray(W * H * 4)
  const noise = rng(seed + Math.round(t * 1000))
  const set = (x, y, [r, g, b]) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return
    const p = (y * W + x) * 4
    data[p] = r; data[p + 1] = g; data[p + 2] = b; data[p + 3] = 255
  }
  const rect = (x0, y0, w, h, c) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) set(x, y, c) }

  // Sky: brighter and bluer towards the top.
  for (let y = 0; y < HORIZON; y++) {
    const k = y / HORIZON
    for (let x = 0; x < W; x++) set(x, y, [150 + 55 * k, 180 + 35 * k, 215 + 10 * k])
  }
  // Ground either side of the road.
  for (let y = HORIZON; y < H; y++) for (let x = 0; x < W; x++) set(x, y, [92, 108, 78])
  // Buildings on the horizon.
  for (const [x, w, h] of [[8, 34, 22], [46, 20, 30], [230, 40, 18], [276, 30, 26]]) rect(x, HORIZON - h, w, h, [88, 94, 104])
  // Road: a trapezoid narrowing to the horizon (perspective).
  for (let y = HORIZON; y < H; y++) {
    const k = (y - HORIZON) / (H - HORIZON)
    const half = 18 + k * 170
    for (let x = Math.round(160 - half); x <= Math.round(160 + half); x++) set(x, y, [70, 72, 77])
    // Dashed centre line, dashes longer near the camera.
    if (Math.floor((y - HORIZON) / (3 + k * 9)) % 2 === 0) for (let dx = -Math.round(k * 2); dx <= Math.round(k * 2); dx++) set(160 + dx, y, [236, 232, 214])
  }
  // A standing-water patch: bright, smooth and bluish.
  for (let y = 146; y < 168; y++) for (let x = 214; x < 284; x++) {
    if (((x - 249) / 35) ** 2 + ((y - 157) / 11) ** 2 <= 1) set(x, y, [168, 188, 212])
  }
  // A lamp post.
  rect(58, 34, 3, 110, [40, 42, 46])
  rect(58, 34, 16, 3, [40, 42, 46])

  // Vehicles: body, darker windscreen, wheels.
  for (const c of carsAt(t)) {
    rect(c.x, c.y, c.w, c.h, c.body)
    if (c.label === 'car') {
      rect(c.x + Math.round(c.w * 0.18), c.y + 2, Math.round(c.w * 0.64), Math.round(c.h * 0.36), [42, 52, 64])
      rect(c.x + 3, c.y + c.h - 2, Math.round(c.w * 0.2), 3, [20, 20, 22])
      rect(c.x + c.w - 3 - Math.round(c.w * 0.2), c.y + c.h - 2, Math.round(c.w * 0.2), 3, [20, 20, 22])
    }
  }

  // Sensor noise: every real camera has it, and it is why thresholds exist.
  for (let p = 0; p < data.length; p += 4) {
    const n = (noise() - 0.5) * 8
    data[p] += n; data[p + 1] += n; data[p + 2] += n
  }
  return { data, width: W, height: H }
}

/** The same scene at night: little light, much noise. Detectors struggle here. */
export function night(img, seed = 7) {
  const noise = rng(seed)
  const data = new Uint8ClampedArray(img.data.length)
  for (let p = 0; p < data.length; p += 4) {
    const n = (noise() - 0.5) * 24
    for (let c = 0; c < 3; c++) data[p + c] = img.data[p + c] * 0.22 + 6 + n
    data[p + 3] = 255
  }
  return { data, width: img.width, height: img.height }
}

/** The same scene through fog or a wet lens: washed out, low contrast. */
export function fog(img, amount = 0.62) {
  const data = new Uint8ClampedArray(img.data.length)
  for (let p = 0; p < data.length; p += 4) {
    for (let c = 0; c < 3; c++) data[p + c] = img.data[p + c] * (1 - amount) + 205 * amount
    data[p + 3] = 255
  }
  return { data, width: img.width, height: img.height }
}
