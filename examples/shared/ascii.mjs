// Seeing in the terminal. Every example prints what it computed, so you can
// learn from these files without opening a single picture.

const RAMP = ' .:-=+*#%@'

/** Gray values (0–255) → lines of characters, `cols` wide. Terminal cells are ~2× taller than wide. */
export function asciiImage(gray, width, height, cols = 80) {
  const rows = Math.round((cols * height) / width / 2)
  const lines = []
  for (let r = 0; r < rows; r++) {
    let line = ''
    for (let c = 0; c < cols; c++) {
      const x = Math.floor((c + 0.5) * (width / cols))
      const y = Math.floor((r + 0.5) * (height / rows))
      const v = Math.max(0, Math.min(255, gray[y * width + x]))
      line += RAMP[Math.min(RAMP.length - 1, Math.floor((v / 256) * RAMP.length))]
    }
    lines.push(line)
  }
  return lines.join('\n')
}

/** A 0/1 mask → '#' and '.' */
export function asciiMask(mask, width, height, cols = 80) {
  const gray = Float32Array.from(mask, (m) => (m ? 255 : 0))
  return asciiImage(gray, width, height, cols)
}

/** The numbers themselves: a small window of the gray array, right-aligned. */
export function numberGrid(gray, width, x0, y0, w, h) {
  const out = []
  for (let y = y0; y < y0 + h; y++) {
    const row = []
    for (let x = x0; x < x0 + w; x++) row.push(String(Math.round(gray[y * width + x])).padStart(4))
    out.push(row.join(''))
  }
  return out.join('\n')
}

/** A horizontal bar chart of a histogram, grouped into `bins`. */
export function histogramChart(hist, bins = 16, width = 50, mark = null) {
  const per = 256 / bins
  const groups = Array.from({ length: bins }, (_, i) => {
    let s = 0
    for (let v = i * per; v < (i + 1) * per; v++) s += hist[v]
    return s
  })
  const max = Math.max(...groups) || 1
  return groups.map((g, i) => {
    const lo = i * per, hi = (i + 1) * per - 1
    const flag = mark != null && mark >= lo && mark <= hi ? ' ◀ threshold' : ''
    return `${String(lo).padStart(3)}–${String(hi).padStart(3)} ${'█'.repeat(Math.round((g / max) * width))}${flag}`
  }).join('\n')
}

/** A line chart of a series (e.g. training loss), `height` rows tall. */
export function lineChart(values, { height = 10, width = 60, label = '' } = {}) {
  const n = values.length
  const pts = Array.from({ length: width }, (_, i) => values[Math.min(n - 1, Math.floor((i / (width - 1)) * (n - 1)))])
  const max = Math.max(...pts), min = Math.min(...pts)
  const span = max - min || 1
  const grid = Array.from({ length: height }, () => Array(width).fill(' '))
  pts.forEach((v, i) => {
    const r = height - 1 - Math.round(((v - min) / span) * (height - 1))
    grid[r][i] = '•'
  })
  const rows = grid.map((row, r) => {
    const v = max - (r / (height - 1)) * span
    return `${v.toFixed(3).padStart(7)} │${row.join('')}`
  })
  return `${label}\n${rows.join('\n')}\n        └${'─'.repeat(width)}`
}

/** A scatter plot of 2-D points with a glyph per class. */
export function scatter(points, glyphs, { width = 60, height = 20 } = {}) {
  const xs = points.map((p) => p[0]), ys = points.map((p) => p[1])
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
  const grid = Array.from({ length: height }, () => Array(width).fill('·'))
  points.forEach(([x, y], i) => {
    const c = Math.round(((x - x0) / (x1 - x0 || 1)) * (width - 1))
    const r = height - 1 - Math.round(((y - y0) / (y1 - y0 || 1)) * (height - 1))
    grid[r][c] = glyphs[i]
  })
  return grid.map((row) => '  ' + row.join('')).join('\n')
}

export const rule = (title) => `\n── ${title} ${'─'.repeat(Math.max(0, 72 - title.length))}\n`
