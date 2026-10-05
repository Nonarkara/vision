// The disk-fallback path documented in docs/system/architecture.md — the
// reason a reboot with FloodDash down still serves a list of cameras rather
// than an empty page.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import http from 'node:http'
import { createCatalogStore } from '../server/catalog.js'

const FD = 'http://127.0.0.1:8340'

function payload(names) {
  return {
    fetched_at: '2026-10-05T00:00:00Z',
    sources: [{ id: 's', label_th: 'S', label_en: 'S', count: names.length, status: 'ok' }],
    cameras: names.map((name, i) => ({ id: String(i), source: 's', name_en: name, lat: 13.7, lng: 100.5 })),
  }
}

function tmpCache(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vision-catalog-'))
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }))
  return path.join(dir, 'cameras.json')
}

/** A FloodDash stand-in on an ephemeral port. `next` swaps what it serves. */
async function fakeFloodDash(t, handler) {
  const server = http.createServer(handler)
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  t.after(() => new Promise((resolve) => server.close(resolve)))
  return `http://127.0.0.1:${server.address().port}`
}

test('a cold start with FloodDash down reads the catalogue saved on disk', async (t) => {
  const cacheFile = tmpCache(t)
  fs.writeFileSync(cacheFile, JSON.stringify(payload(['kept from disk'])))
  const store = createCatalogStore({ floodDashBase: FD, cacheFile })
  store.loadFromDisk()
  assert.equal(store.get().origin, 'disk')
  assert.equal(store.get().cameras.length, 1)
  assert.equal(store.get().cameras[0].en, 'kept from disk')
  assert.ok(store.get().loadedAt, 'loadedAt must be stamped so /api/health can report a date')
})

test('a cold start with no usable file on disk stays empty rather than crashing', (t) => {
  const store = createCatalogStore({ floodDashBase: FD, cacheFile: tmpCache(t) })
  store.loadFromDisk()
  assert.equal(store.get().origin, 'empty')
  assert.equal(store.get().cameras.length, 0)

  const broken = tmpCache(t)
  fs.writeFileSync(broken, 'not json at all')
  const store2 = createCatalogStore({ floodDashBase: FD, cacheFile: broken })
  store2.loadFromDisk()
  assert.equal(store2.get().origin, 'empty')
})

test('a successful refresh adopts the payload and writes the cache file', async (t) => {
  const cacheFile = tmpCache(t)
  const base = await fakeFloodDash(t, (_req, res) => {
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify(payload(['fresh from flooddash'])))
  })
  const store = createCatalogStore({ floodDashBase: base, cacheFile })
  const state = await store.refresh()
  assert.equal(state.origin, 'flooddash')
  assert.equal(state.cameras[0].en, 'fresh from flooddash')
  const written = JSON.parse(fs.readFileSync(cacheFile, 'utf8'))
  assert.equal(written.cameras.length, 1, 'the next cold start has something to read')
})

test('a failing refresh keeps the last good copy instead of emptying the catalogue', async (t) => {
  const cacheFile = tmpCache(t)
  let serving = 'good'
  const base = await fakeFloodDash(t, (req, res) => {
    if (serving === 'empty') {
      res.setHeader('content-type', 'application/json')
      return res.end(JSON.stringify({ cameras: [], sources: [] }))
    }
    res.destroy()
  })
  const store = createCatalogStore({ floodDashBase: base, cacheFile })

  // Seed it through a working first answer, then break the upstream.
  const first = http.createServer((_req, res) => {
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify(payload(['first good copy'])))
  })
  await new Promise((resolve) => first.listen(0, '127.0.0.1', resolve))
  t.after(() => new Promise((resolve) => first.close(resolve)))
  const seeded = createCatalogStore({ floodDashBase: `http://127.0.0.1:${first.address().port}`, cacheFile })
  await seeded.refresh()

  store.loadFromDisk()
  assert.equal(store.get().cameras[0].en, 'first good copy')

  await store.refresh()              // connection refused / reset
  assert.equal(store.get().origin, 'disk', 'the old list survives an unreachable FloodDash')
  assert.equal(store.get().cameras[0].en, 'first good copy')

  serving = 'empty'                  // reachable, but answers with nothing
  await store.refresh()
  assert.equal(store.get().cameras.length, 1, 'an empty payload is rejected, not adopted')
  assert.equal(store.get().origin, 'disk')
})

test('the published catalogue never contains a relay URL', async (t) => {
  const base = await fakeFloodDash(t, (_req, res) => {
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({
      cameras: [{ id: '1', source: 's', lat: 13.7, lng: 100.5, snapshot_url: 'https://cctv.maholan.net/1.jpg' }],
      sources: [],
    }))
  })
  const store = createCatalogStore({ floodDashBase: base, cacheFile: tmpCache(t) })
  const state = await store.refresh()
  assert.equal('relay' in state.cameras[0], false)
  assert.equal(state.relayMap.get('s:1'), 'https://cctv.maholan.net/1.jpg')
})
