// Cars spotted today. The only thing kept is a date and a count, on this
// device. No picture, no camera, no place, no identity — and nothing is sent.

const KEY = 'vision_cars_day_v1'
const VEHICLES = new Set([3, 4, 6, 8]) // car, motorcycle, bus, truck — COCO
const NEAR = 0.12
const HOLD_MS = 8000

export function dayKey(now) {
  const d = new Date(now)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Pure. A vehicle counts once until it leaves the neighbourhood or the day rolls. */
export function spot(memory, detections, now) {
  const day = dayKey(now)
  const sameDay = memory.day === day
  const seen = (sameDay ? memory.seen : []).filter((s) => now - s.t < HOLD_MS)
  let added = 0
  for (const d of detections ?? []) {
    if (!VEHICLES.has(d.cls) || d.score < 0.3) continue
    const x = d.x + d.w / 2
    const y = d.y + d.h / 2
    const hit = seen.find((s) => Math.hypot(s.x - x, s.y - y) < NEAR)
    if (hit) { hit.t = now; continue }
    seen.push({ x, y, t: now })
    added++
  }
  return { day, n: (sameDay ? memory.n : 0) + added, seen, added }
}

/** What may be written down. The neighbourhood of recent boxes stays in memory. */
export function spottedRecord(memory) {
  return { day: memory.day, n: memory.n }
}

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (!raw || typeof raw.n !== 'number' || typeof raw.day !== 'string') return { day: '', n: 0, seen: [] }
    return { day: raw.day, n: raw.n, seen: [] }
  } catch {
    return { day: '', n: 0, seen: [] }
  }
}

function save(memory) {
  try { localStorage.setItem(KEY, JSON.stringify(spottedRecord(memory))) } catch { /* private mode: the count lasts this page */ }
}

let memory = typeof localStorage === 'undefined' ? { day: '', n: 0, seen: [] } : load()
const listeners = new Set()

export function onSpotted(fn) {
  listeners.add(fn)
  fn(memory.n)
  return () => listeners.delete(fn)
}

export function noteVehicles(detections, now = Date.now()) {
  const prevDay = memory.day
  const next = spot(memory, detections, now)
  memory = next
  if (next.added || next.day !== prevDay) {
    save(memory)
    for (const fn of listeners) fn(memory.n)
  }
  return memory.n
}
