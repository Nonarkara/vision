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
  const cams = [{ id: 'slow' }, { id: 'fast' }, { id: 'other' }]
  const t0 = Date.now()
  const hit = await probeCameras(cams, (cam, signal) => new Promise((resolve, reject) => {
    inflight++
    max = Math.max(max, inflight)
    const timer = setTimeout(() => {
      inflight--
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
  assert.ok(Date.now() - t0 < 300, 'the slow cameras did not run out their timer')
})
