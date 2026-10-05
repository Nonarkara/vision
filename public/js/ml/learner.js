// Teaching a machine from a handful of examples — in plain JavaScript, so the
// whole of "training" fits on one screen and runs instantly.
//
// THE IDEA (transfer learning). MobileNetV2 already turns any picture into
// 1,280 numbers that capture how it looks. We do not retrain that network; we
// learn a small decision on top of its numbers. Two ways, both shown on /train:
//
//   nearest neighbours · remember every example; a new picture gets the label
//                        of the examples it looks most like. No training at
//                        all — which is the point the page makes.
//   a trained layer    · one layer of weights (softmax regression) adjusted by
//                        gradient descent until it separates the classes. The
//                        loss curve on the page is this function's output.
//
// And a map: principal component analysis squeezes 1,280 numbers into 2 so a
// person can see the examples cluster.

export function normalize(v) {
  let s = 0
  for (let i = 0; i < v.length; i++) s += v[i] * v[i]
  const inv = s > 0 ? 1 / Math.sqrt(s) : 0
  const out = new Float32Array(v.length)
  for (let i = 0; i < v.length; i++) out[i] = v[i] * inv
  return out
}

export function dot(a, b) {
  let s = 0
  for (let i = 0; i < a.length; i++) s += a[i] * b[i]
  return s
}

/**
 * k-nearest neighbours on cosine similarity. Votes are weighted by similarity
 * so a very close example counts more than a vague one.
 * samples: [{ x: Float32Array (normalised), y: classIndex }]
 */
export function knnPredict(samples, x, classes, k = 5) {
  if (!samples.length) return { probs: new Array(classes).fill(1 / classes), neighbours: [] }
  const sims = samples.map((s, i) => ({ i, sim: dot(s.x, x), y: s.y }))
  sims.sort((a, b) => b.sim - a.sim)
  const top = sims.slice(0, Math.min(k, sims.length))
  const votes = new Array(classes).fill(0)
  for (const n of top) votes[n.y] += Math.max(0, n.sim) + 1e-6
  const total = votes.reduce((a, b) => a + b, 0)
  return { probs: votes.map((v) => v / total), neighbours: top }
}

/**
 * Softmax regression — one layer, trained by full-batch gradient descent
 * with Adam. Small enough to step once per animation frame and watch.
 */
export function createLayer(dim, classes, { lr = 0.01, l2 = 1e-4, seed = 7 } = {}) {
  let rng = seed
  const rand = () => { rng = (rng * 1103515245 + 12345) % 2147483648; return rng / 2147483648 - 0.5 }
  const W = new Float32Array(dim * classes).map(() => rand() * 0.01)
  const b = new Float32Array(classes)
  const mW = new Float32Array(W.length), vW = new Float32Array(W.length)
  const mb = new Float32Array(classes), vb = new Float32Array(classes)
  const beta1 = 0.9, beta2 = 0.999, eps = 1e-8
  let t = 0

  function logits(x) {
    const z = new Float32Array(classes)
    for (let c = 0; c < classes; c++) {
      let s = b[c]
      const off = c * dim
      for (let i = 0; i < dim; i++) s += W[off + i] * x[i]
      z[c] = s
    }
    return z
  }

  function predict(x) {
    const z = logits(x)
    const max = Math.max(...z)
    let sum = 0
    const p = new Array(classes)
    for (let c = 0; c < classes; c++) { p[c] = Math.exp(z[c] - max); sum += p[c] }
    return p.map((v) => v / sum)
  }

  /** One pass over every example. Returns mean cross-entropy and accuracy. */
  function step(samples) {
    if (!samples.length) return { loss: 0, acc: 0 }
    const gW = new Float32Array(W.length)
    const gb = new Float32Array(classes)
    let loss = 0, correct = 0
    for (const s of samples) {
      const p = predict(s.x)
      loss -= Math.log(Math.max(p[s.y], 1e-9))
      if (p.indexOf(Math.max(...p)) === s.y) correct++
      for (let c = 0; c < classes; c++) {
        const g = p[c] - (c === s.y ? 1 : 0)
        gb[c] += g
        const off = c * dim
        for (let i = 0; i < dim; i++) gW[off + i] += g * s.x[i]
      }
    }
    const n = samples.length
    t++
    const c1 = 1 - beta1 ** t, c2 = 1 - beta2 ** t
    for (let i = 0; i < W.length; i++) {
      const g = gW[i] / n + l2 * W[i]
      mW[i] = beta1 * mW[i] + (1 - beta1) * g
      vW[i] = beta2 * vW[i] + (1 - beta2) * g * g
      W[i] -= (lr * (mW[i] / c1)) / (Math.sqrt(vW[i] / c2) + eps)
    }
    for (let c = 0; c < classes; c++) {
      const g = gb[c] / n
      mb[c] = beta1 * mb[c] + (1 - beta1) * g
      vb[c] = beta2 * vb[c] + (1 - beta2) * g * g
      b[c] -= (lr * (mb[c] / c1)) / (Math.sqrt(vb[c] / c2) + eps)
    }
    return { loss: loss / n, acc: correct / n }
  }

  return { predict, step, get epochs() { return t }, export: () => ({ dim, classes, W: Array.from(W), b: Array.from(b) }) }
}

/**
 * The two directions along which the examples differ most (PCA), found with
 * the Gram-matrix trick: with N examples of D numbers and N ≪ D, the N×N
 * matrix is cheaper to work with than the D×D one, and has the same
 * leading directions. Returns a projector for new points too.
 */
export function pca2(vectors) {
  const n = vectors.length
  if (n < 3) return null
  const d = vectors[0].length
  const mean = new Float32Array(d)
  for (const v of vectors) for (let i = 0; i < d; i++) mean[i] += v[i] / n
  const X = vectors.map((v) => v.map((x, i) => x - mean[i]))
  const G = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => dot(X[i], X[j])))
  const axes = []
  for (let comp = 0; comp < 2; comp++) {
    let u = Array.from({ length: n }, (_, i) => Math.sin(i * 12.9898 + comp * 78.233) + 1.01)
    for (let iter = 0; iter < 60; iter++) {
      const next = G.map((row) => row.reduce((s, g, j) => s + g * u[j], 0))
      const norm = Math.hypot(...next) || 1
      u = next.map((x) => x / norm)
    }
    const lambda = u.reduce((s, ui, i) => s + ui * G[i].reduce((t, g, j) => t + g * u[j], 0), 0)
    // Deflate so the next pass finds the second direction.
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) G[i][j] -= lambda * u[i] * u[j]
    // Axis in feature space: v = Xᵀu, normalised.
    const v = new Float32Array(d)
    for (let i = 0; i < n; i++) for (let k = 0; k < d; k++) v[k] += X[i][k] * u[i]
    const vn = Math.hypot(...v) || 1
    for (let k = 0; k < d; k++) v[k] /= vn
    axes.push(v)
  }
  const project = (x) => {
    let a = 0, b = 0
    for (let k = 0; k < d; k++) { const c = x[k] - mean[k]; a += c * axes[0][k]; b += c * axes[1][k] }
    return [a, b]
  }
  return { project, points: vectors.map(project) }
}

/** Fraction of examples that would be labelled correctly if each were left out (kNN). */
export function leaveOneOut(samples, classes, k = 5) {
  if (samples.length < 2) return null
  let ok = 0
  for (let i = 0; i < samples.length; i++) {
    const rest = samples.filter((_, j) => j !== i)
    const { probs } = knnPredict(rest, samples[i].x, classes, k)
    if (probs.indexOf(Math.max(...probs)) === samples[i].y) ok++
  }
  return ok / samples.length
}

/**
 * The same number, computed a chunk at a time. Four classes of a hundred
 * examples is ~200 million multiply-adds; run in one go that is a visible
 * half-second freeze right after you let go of "hold to record". Yielding
 * every `chunk` examples keeps each slice under a frame.
 *
 * Resolves null when `token.cancelled` became true — a newer set of examples
 * arrived and this answer is no longer wanted.
 */
export async function leaveOneOutAsync(samples, classes, k = 5, { chunk = 24, token = {} } = {}) {
  if (samples.length < 2) return null
  let ok = 0
  for (let i = 0; i < samples.length; i++) {
    const rest = samples.filter((_, j) => j !== i)
    const { probs } = knnPredict(rest, samples[i].x, classes, k)
    if (probs.indexOf(Math.max(...probs)) === samples[i].y) ok++
    if (i % chunk === chunk - 1) {
      await new Promise((r) => setTimeout(r, 0))
      if (token.cancelled) return null
    }
  }
  return ok / samples.length
}
