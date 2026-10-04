// TensorFlow.js, loaded only when a page actually needs a neural network.
// 1.4 MB of library plus 14–18 MB of weights is a real cost on a phone, so
// nothing here runs until someone presses a button or scrolls to a bench.

let loading = null

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = src
    s.onload = resolve
    s.onerror = () => reject(new Error(`could not load ${src}`))
    document.head.append(s)
  })
}

export function getTf() {
  loading ??= (async () => {
    // tf.min.js bundles regenerator-runtime, which assigns a bare global and,
    // when strict mode refuses, falls back to Function() — which our CSP
    // (rightly) blocks. Declaring the global first makes the plain assignment
    // succeed, so the eval path is never reached and no 'unsafe-eval' is needed.
    if (!('regeneratorRuntime' in window)) window.regeneratorRuntime = undefined
    if (!window.tf) await loadScript('/vendor/tf.min.js')
    const tf = window.tf
    tf.enableProdMode()
    for (const backend of ['webgl', 'cpu']) {
      try { if (await tf.setBackend(backend)) break } catch { /* try the next one */ }
    }
    await tf.ready()
    return tf
  })().catch((err) => { loading = null; throw err })
  return loading
}

/** Which engine is doing the arithmetic — shown on /system and in readouts. */
export function backend() {
  return window.tf?.getBackend?.() ?? 'not loaded'
}

/**
 * Load a graph model with progress events, once per URL. Progress is
 * published on document so any bench on the page can show it.
 */
const models = new Map()
export function loadModel(url, name) {
  if (!models.has(url)) {
    models.set(url, (async () => {
      const tf = await getTf()
      const model = await tf.loadGraphModel(url, {
        onProgress: (p) => document.dispatchEvent(new CustomEvent('modelprogress', { detail: { name, p } })),
      })
      document.dispatchEvent(new CustomEvent('modelprogress', { detail: { name, p: 1, done: true } }))
      return model
    })().catch((err) => { models.delete(url); throw err }))
  }
  return models.get(url)
}
