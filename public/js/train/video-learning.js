// Small real learners over the same frozen MobileNet frame descriptions.
// Labels, similarity groups and rewarded actions have separate stores.
export function distance(a, b) {
  let d = 0
  for (let i = 0; i < a.length; i++) d += (a[i] - b[i]) ** 2
  return d
}
export function classify(samples, x) {
  const nearest = samples
    .map((s) => ({ ...s, d: distance(s.x, x) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 5)
  const votes = [0, 0]
  for (const s of nearest) votes[s.y] += 1 / (s.d + 0.001)
  const total = votes[0] + votes[1]
  return total
    ? { y: votes[1] > votes[0] ? 1 : 0, score: Math.max(...votes) / total }
    : null
}
export function cluster(samples, iterations = 20) {
  if (samples.length < 2) return null
  const first = samples[0],
    second = samples.reduce(
      (best, x) => (distance(first, x) > distance(first, best) ? x : best),
      first,
    )
  if (distance(first, second) < 1e-8) return null
  let centres = [Array.from(first), Array.from(second)],
    groups = []
  for (let pass = 0; pass < iterations; pass++) {
    groups = samples.map((x) =>
      distance(x, centres[1]) < distance(x, centres[0]) ? 1 : 0,
    )
    centres = centres.map((old, y) => {
      const members = samples.filter((_, i) => groups[i] === y)
      if (!members.length) return old
      return old.map(
        (_, j) => members.reduce((sum, x) => sum + x[j], 0) / members.length,
      )
    })
  }
  return { centres, groups }
}
export function groupOf(centres, x) {
  return distance(x, centres[1]) < distance(x, centres[0]) ? 1 : 0
}
export function policy(feedback, x, round = 0) {
  const neighbours = feedback
    .map((s) => ({ ...s, d: distance(s.x, x) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 12)
  const q = [0, 0],
    n = [0, 0]
  for (const s of neighbours) {
    const weight = 1 / (s.d + 0.05)
    q[s.action] += weight * s.reward
    n[s.action] += weight
  }
  for (let a = 0; a < 2; a++) if (n[a]) q[a] /= n[a]
  const exploring = !n[0] || !n[1] || round % 5 === 4
  const action = !n[0]
    ? 0
    : !n[1]
      ? 1
      : exploring
        ? round % 2
        : q[1] > q[0]
          ? 1
          : 0
  return { action, q, exploring }
}
