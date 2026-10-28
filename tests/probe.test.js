import { test } from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'

register(new URL('./strip-import-version.mjs', import.meta.url))

globalThis.document = {
  documentElement: { dataset: { lang: 'en' }, style: { setProperty() {} } },
  body: { append() {}, classList: { add() {}, remove() {}, contains() { return false } } },
  querySelectorAll: () => [],
  querySelector: () => null,
  addEventListener() {},
  dispatchEvent() {},
  getElementById: () => null,
  createElement: () => ({ style: {}, setAttribute() {}, append() {}, classList: { contains() { return false } } }),
}
globalThis.window = { matchMedia: () => ({ matches: false }), dispatchEvent() {} }
globalThis.sessionStorage = { getItem: () => null, setItem() {} }

const { probeCameras, PROBE_PARALLEL } = await import('../public/js/core/specimen.js')

test('the first camera is probed three at a time, and a slow one is aborted', async () => {
  assert.equal(PROBE_PARALLEL, 3)
  let inflight = 0
  let max = 0
  let ranOut = 0 // cameras left to finish on their own timer instead of being aborted
  const cams = [{ id: 'slow' }, { id: 'fast' }, { id: 'other' }]
  const hit = await probeCameras(cams, (cam, signal) => new Promise((resolve, reject) => {
    inflight++
    max = Math.max(max, inflight)
    const timer = setTimeout(() => {
      inflight--
      ranOut++
      resolve({ id: cam.id, close() {} })
    }, cam.id === 'fast' ? 40 : 500)
    signal.addEventListener('abort', () => {
      clearTimeout(timer)
      inflight--
      const err = new Error('aborted')
      err.name = 'AbortError'
      reject(err)
    })
  }))
  assert.equal(hit.cam.id, 'fast')
  assert.ok(max >= 2, 'the batch was in flight together')
  // The slow cameras were aborted, not left to run out their own timer. This
  // is what a 300ms wall-clock bound was trying to say, and it failed under
  // load: the clock moved, not the behaviour. Only the camera that won may
  // have run its timer out.
  assert.equal(ranOut, 1, 'only the camera that won may run its timer out')
})

test('a specimen with no source asks for a picture instead of pretending to study', async () => {
  const { createSpecimen } = await import('../public/js/core/specimen.js')
  const nodes = {
    '[data-specimen-label]': {}, '[data-specimen-name]': {},
    '[data-specimen-meta]': {}, '[data-specimen-quality]': {},
  }
  const specimen = createSpecimen({ bar: {
    classList: { contains: () => false },
    querySelector: selector => nodes[selector] ?? null,
  } })
  assert.equal(nodes['[data-specimen-label]'].textContent, 'Picture')
  assert.equal(nodes['[data-specimen-name]'].textContent, 'Choose a picture')
  specimen.close()
})

test('a stopped picture notifies learners instead of only changing the bar', async () => {
  const { createSpecimen } = await import('../public/js/core/specimen.js')
  const specimen = createSpecimen()
  const seen = []
  const source = { closed: false, get ready() { return !this.closed }, close() { this.closed = true } }
  specimen.on(src => seen.push(src?.ready ?? false))
  specimen.useLocal(source)
  source.close()
  source.onended()
  assert.deepEqual(seen, [true, false])
  specimen.close()
})
