import { test } from 'node:test'
import assert from 'node:assert/strict'

test('catalogue consumers share pending work and reuse the resolved answer', async (t) => {
  const original = globalThis.fetch
  t.after(() => { globalThis.fetch = original })
  let calls = 0, finish
  globalThis.fetch = () => { calls++; return new Promise(resolve => { finish = resolve }) }
  const { loadCatalog } = await import('../public/js/core/catalog.js?test=shared')
  const first = loadCatalog(), second = loadCatalog()
  assert.equal(first, second)
  assert.equal(calls, 1)
  const payload = { cameras: [] }
  finish({ ok: true, json: async () => payload })
  assert.equal(await first, payload)
  assert.equal(await loadCatalog(), payload)
  assert.equal(calls, 1)
})

test('a failed catalogue response can be retried without accepting an error as data', async (t) => {
  const original = globalThis.fetch
  t.after(() => { globalThis.fetch = original })
  let calls = 0
  globalThis.fetch = async () => ++calls === 1
    ? { ok: false, status: 503 }
    : { ok: true, json: async () => ({ cameras: [] }) }
  const { loadCatalog } = await import('../public/js/core/catalog.js?test=retry')
  await assert.rejects(loadCatalog(), /catalogue 503/)
  assert.deepEqual(await loadCatalog(), { cameras: [] })
  assert.equal(calls, 2)
})
