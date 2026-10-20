export function iou(a, b) {
  const intersection = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y))
  const union = a.w * a.h + b.w * b.h - intersection
  return union > 0 ? intersection / union : 0
}
function validBox(b) {
  return Number.isInteger(b.cls) && [b.x, b.y, b.w, b.h].every(Number.isFinite) && b.x >= 0 && b.y >= 0 && b.w > 0 && b.h > 0 && b.x + b.w <= 1.000001 && b.y + b.h <= 1.000001
}
const ratio = (a, b) => b ? a / b : null
export function evaluate(frames, records, { threshold = 0.3, overlap = 0.5 } = {}) {
  const reference = new Map(frames.map(f => [f.id, f]))
  if (reference.size !== frames.length) throw Error('Duplicate reference frame')
  const seen = new Set(), classes = {}, times = []
  const bucket = cls => classes[cls] ??= { tp: 0, fp: 0, fn: 0 }
  for (const record of records) {
    const frame = reference.get(record.id)
    if (!frame || seen.has(record.id)) throw Error('Unknown or duplicate prediction frame')
    seen.add(record.id)
    if (!Number.isFinite(record.ms) || record.ms < 0 || !Array.isArray(record.detections)) throw Error('Invalid prediction record')
    times.push(record.ms)
    const used = new Set()
    for (const b of frame.boxes) { if (!validBox(b)) throw Error('Invalid reference box'); bucket(b.cls) }
    for (const d of record.detections) if (!validBox(d) || !Number.isFinite(d.score) || d.score < 0 || d.score > 1) throw Error('Invalid prediction box')
    for (const d of record.detections.filter(d => d.score >= threshold).sort((a, b) => b.score - a.score)) {
      let match = -1, best = overlap
      frame.boxes.forEach((b, i) => {
        const score = iou(d, b)
        if (!used.has(i) && b.cls === d.cls && score >= best) { match = i; best = score }
      })
      if (match < 0) bucket(d.cls).fp++
      else { used.add(match); bucket(d.cls).tp++ }
    }
    frame.boxes.forEach((b, i) => { if (!used.has(i)) bucket(b.cls).fn++ })
  }
  const totals = Object.values(classes).reduce((a, b) => ({ tp: a.tp + b.tp, fp: a.fp + b.fp, fn: a.fn + b.fn }), { tp: 0, fp: 0, fn: 0 })
  for (const b of Object.values(classes)) { b.precision = ratio(b.tp, b.tp + b.fp); b.recall = ratio(b.tp, b.tp + b.fn) }
  times.sort((a, b) => a - b)
  const quantile = p => times.length ? times[Math.max(0, Math.ceil(times.length * p) - 1)] : null
  return { completed: seen.size, expected: frames.length, complete: seen.size === frames.length, threshold, iou: overlap, ...totals, precision: ratio(totals.tp, totals.tp + totals.fp), recall: ratio(totals.tp, totals.tp + totals.fn), medianMs: quantile(0.5), p95Ms: quantile(0.95), classes }
}
