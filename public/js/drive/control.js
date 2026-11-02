// Teaching signal controller. Timings are illustrative, not Bangkok control settings.
const phases = [
  { A: 'green', B: 'red', duration: 9 }, { A: 'amber', B: 'red', duration: 2.5 }, { A: 'red', B: 'red', duration: 1.5 },
  { A: 'red', B: 'green', duration: 9 }, { A: 'red', B: 'amber', duration: 2.5 }, { A: 'red', B: 'red', duration: 1.5 },
]
export function queues(world) {
  const q = { A: 0, B: 0 }
  for (const c of world.cars) {
    if (c.route.stopS == null || c.frozen > 0 || c.v > 2) continue
    const d = ((c.route.stopS - c.s) % c.route.len + c.route.len) % c.route.len
    if (d < 45) q[c.route.lightGroup ?? c.route.id]++
  }
  return q
}
export function tickSignals(world, dt) {
  const phase = phases[world.phase]
  const green = phase.A === 'green' ? 'A' : phase.B === 'green' ? 'B' : null
  const q = queues(world)
  let duration = phase.duration
  // Guarantee 9s green, never exceed18s; serve a waiting opposing queue first.
  // Amber and all-red clearance are never shortened by demand.
  if (world.control === 'responsive' && green) {
    const other = green === 'A' ? 'B' : 'A'
    if (q[green] > 0 && q[other] === 0) duration = 18
    else if (q[green] > q[other]) duration = Math.min(18, 9 + (q[green] - q[other]) * 1.5)
  }
  world.phaseT += dt
  if (world.phaseT >= duration) {
    world.phaseT -= duration
    world.phase = (world.phase + 1) % phases.length
  }
  world.light = { A: phases[world.phase].A, B: phases[world.phase].B }
  const current = phases[world.phase]
  const currentGreen = current.A === 'green' ? 'A' : current.B === 'green' ? 'B' : null
  world.controlState = { queues: q, green: currentGreen, elapsed: world.phaseT }
}
