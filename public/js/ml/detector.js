// Object detection with SSDLite + MobileNetV2, trained on COCO.
//
// The network (Sandler et al. 2018 backbone, Liu et al. 2016 SSD head, the
// "lite" depthwise variant) looks at the whole picture once and returns a
// few thousand candidate boxes, each with 90 class scores. We keep each box's
// best class, then non-maximum suppression removes boxes that mostly overlap a
// better one. What remains is "what the machine sees".
//
// Weights: TensorFlow.js model zoo (Apache-2.0), self-hosted under /models.
// Post-processing follows @tensorflow-models/coco-ssd 2.2.3 (Apache-2.0),
// rewritten here so NMS stays on the GPU backend instead of switching to CPU.

import { loadModel, getTf } from './tf.js'
import { COCO } from './labels.js'

const URL = '/models/ssdlite_mobilenet_v2/model.json'
export const DETECTOR_INPUT_WIDTH = 640
const IOU = 0.5

let warmed = null

export function loadDetector() {
  warmed ??= (async () => {
    const tf = await getTf()
    const model = await loadModel(URL, 'detector')
    const zero = tf.zeros([1, 300, 300, 3], 'int32')
    const out = await model.executeAsync(zero)
    tf.dispose([zero, out])
    return model
  })().catch((err) => { warmed = null; throw err })
  return warmed
}

/**
 * Detect objects in a canvas / image / video. Boxes come back in 0–1 frame
 * coordinates so any overlay can scale them. Nothing below `minScore` is
 * returned — and nothing returned is a fact about the world, only a guess
 * about the picture with its confidence attached.
 */
export async function detect(input, { minScore = 0.3, maxBoxes = 50 } = {}) {
  const tf = await getTf()
  const model = await loadDetector()
  const t0 = performance.now()
  const batched = tf.tidy(() => tf.expandDims(tf.browser.fromPixels(input)))
  let result
  try {
    result = await model.executeAsync(batched)
  } finally {
    batched.dispose()
  }
  const [scoresT, boxesT] = result[0].shape.length === 3 ? [result[0], result[1]] : [result[1], result[0]]
  const [, n, classes] = scoresT.shape
  const scores = await scoresT.data()
  const boxes = await boxesT.data()
  tf.dispose(result)

  const best = new Float32Array(n)
  const cls = new Int32Array(n)
  for (let i = 0; i < n; i++) {
    let max = -1, arg = -1
    for (let j = 0; j < classes; j++) {
      const s = scores[i * classes + j]
      if (s > max) { max = s; arg = j }
    }
    best[i] = max
    cls[i] = arg + 1
  }
  const boxT = tf.tensor2d(boxes, [n, 4])
  const scoreT = tf.tensor1d(best)
  const keepT = await tf.image.nonMaxSuppressionAsync(boxT, scoreT, maxBoxes, IOU, minScore)
  const keep = await keepT.data()
  tf.dispose([boxT, scoreT, keepT])

  const detections = []
  for (const i of keep) {
    if (!COCO[cls[i]]) continue
    const y0 = boxes[i * 4], x0 = boxes[i * 4 + 1], y1 = boxes[i * 4 + 2], x1 = boxes[i * 4 + 3]
    detections.push({ cls: cls[i], score: best[i], x: Math.max(0, x0), y: Math.max(0, y0), w: Math.min(1, x1) - Math.max(0, x0), h: Math.min(1, y1) - Math.max(0, y0) })
  }
  return { detections, ms: performance.now() - t0, candidates: n }
}

/** Count detections by class: { 3: 4, 1: 2 } */
export function tally(detections) {
  const out = {}
  for (const d of detections) out[d.cls] = (out[d.cls] ?? 0) + 1
  return out
}
