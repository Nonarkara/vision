// When a gesture fires. Three rules, all pure so a test can drive them with
// a fake clock: the leader must be confident, it must hold its lead for a
// couple of looks (a flicker is noise, not a gesture), and one global
// cooldown keeps a held pose from machine-gunning the action.

export function createTrigger({ sure = 0.55, stable = 2, cooldown = 2500 } = {}) {
  let lead = -1
  let streak = 0
  let lastFire = Number.NEGATIVE_INFINITY

  /**
   * probs: one score per class, or null when there is no answer yet.
   * now: milliseconds (performance.now()).
   * enabled: only true while the actions are armed and no example is being captured.
   * → { index, p } on the tick a gesture fires, else null.
   */
  return function tick(probs, now, { enabled = true } = {}) {
    if (!enabled || !probs || !probs.length) {
      lead = -1
      streak = 0
      return null
    }
    const top = probs.indexOf(Math.max(...probs))
    if (top !== lead) { lead = top; streak = 0 }
    if (probs[top] < sure) { streak = 0; return null }
    streak += 1
    if (streak < stable) return null
    // Inside the cooldown the streak is kept: the gesture is still standing,
    // so it fires the moment the cooldown lifts, then re-confirms from zero.
    if (now - lastFire < cooldown) return null
    lastFire = now
    streak = 0
    return { index: top, p: probs[top] }
  }
}
