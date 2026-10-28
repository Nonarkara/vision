// Count extensions, not identities. World coordinates avoid image-aspect bias.
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, (a.z || 0) - (b.z || 0))
function straight(a, b, c) {
  const ab = distance(a, b), bc = distance(b, c), ac = distance(a, c)
  return ab > 0 && bc > 0 && (ab * ab + bc * bc - ac * ac) / (2 * ab * bc) < -0.65
}
export function countHand(p) {
  if (!Array.isArray(p) || p.length !== 21 || p.some(v => !Number.isFinite(v.x) || !Number.isFinite(v.y))) return 0
  let count = 0
  for (const base of [5, 9, 13, 17]) {
    if (straight(p[base], p[base + 1], p[base + 3]) && distance(p[0], p[base + 3]) > distance(p[0], p[base + 1]) * 1.12) count++
  }
  // Thumb must be straight AND away from the index knuckle (a tucked thumb
  // can be straight too). No left/right or screen-up assumption.
  if (straight(p[1], p[2], p[4]) && straight(p[2], p[3], p[4]) && distance(p[4], p[5]) > distance(p[2], p[5]) * 1.25) count++
  return count
}
export const NOTES = [261.6256, 293.6648, 329.6276, 349.2282, 391.9954, 440, 493.8833, 523.2511]
export const SOLFEGE = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Ti', 'Do ↑']
export const saturation = count => (10 - Math.min(10, Math.max(1, count))) / 9
export function createCountTrigger(hold = 120) {
  let candidate = -1, since = 0, fired = 0
  return {
    update(count, now) {
      if (count !== candidate) { candidate = count; since = now; return null }
      if (now - since < hold) return null
      if (!count) { fired = 0; return null }
      if (fired === count) return null
      fired = count
      return count
    },
    reset() { candidate = -1; since = 0; fired = 0 },
  }
}
