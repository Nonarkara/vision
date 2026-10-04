// MobileNetV2 (Sandler et al., 2018), trained on ImageNet: two answers from
// one look at a picture.
//
//   embedding · 1,280 numbers from the last layer before the decision — a
//               fingerprint of what the picture "looks like" to the network.
//               Pictures that look alike get fingerprints that point the same
//               way. This is what /train learns from.
//   guesses   · the network's own top guesses among ImageNet's 1,000 classes.
//               English only: ImageNet's labels are English, and we would
//               rather show that honestly than machine-translate 1,000 nouns.
//
// Weights: TensorFlow.js model zoo (Apache-2.0), self-hosted under /models.
// Input in [0, 1], 224×224 — as in @tensorflow-models/mobilenet 2.1.1.

import { loadModel, getTf } from './tf.js'

const URL = '/models/mobilenet_v2_1.0_224/model.json'
const EMBED_NODE = 'module_apply_default/MobilenetV2/Logits/AvgPool'
const LOGITS_NODE = 'module_apply_default/MobilenetV2/Logits/output'
export const EMBED_SIZE = 1280

let classes = null
async function imagenet() {
  classes ??= fetch('/data/imagenet-classes.json').then((r) => r.json())
  return classes
}

export async function loadEmbedder() {
  return loadModel(URL, 'mobilenet')
}

/**
 * Look at one picture. Returns { embedding: Float32Array(1280), guesses: [{label, p}] }.
 * `guesses` is empty unless asked for — training only needs the fingerprint.
 */
export async function look(input, { topk = 0 } = {}) {
  const tf = await getTf()
  const model = await loadEmbedder()
  const [embT, logitsT] = tf.tidy(() => {
    const x = tf.expandDims(tf.image.resizeBilinear(tf.div(tf.cast(tf.browser.fromPixels(input), 'float32'), 255), [224, 224], true))
    const [e, l] = model.execute(x, [EMBED_NODE, LOGITS_NODE])
    return [tf.reshape(e, [EMBED_SIZE]), tf.softmax(tf.slice(l, [0, 1], [1, 1000]))]
  })
  const embedding = await embT.data()
  embT.dispose()
  let guesses = []
  if (!topk) logitsT.dispose()
  else {
    const probs = await logitsT.data()
    logitsT.dispose()
    const names = await imagenet()
    guesses = [...probs].map((p, i) => ({ label: names[i], p })).sort((a, b) => b.p - a.p).slice(0, topk)
  }
  return { embedding: Float32Array.from(embedding), guesses }
}
