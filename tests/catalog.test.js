import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { classify, relaySource, buildCatalog, countKinds } from '../server/catalog.js'

const FD = 'http://127.0.0.1:8340'

test('live HLS from an allow-listed CORS host is video', () => {
  const r = classify({ hls_url: 'https://camerai1.iticfoundation.org/x.m3u8', stream_status: 'live' }, FD)
  assert.deepEqual(r, { kind: 'video', video: 'https://camerai1.iticfoundation.org/x.m3u8' })
})

test('HLS from an unknown host is not treated as readable video', () => {
  const r = classify({ hls_url: 'https://evil.example/x.m3u8', stream_status: 'live', viewer_url: 'https://owner.example' }, FD)
  assert.equal(r.kind, 'view')
})

test('plain-http HLS is never video', () => {
  const r = classify({ hls_url: 'http://camerai1.iticfoundation.org/x.m3u8', stream_status: 'live' }, FD)
  assert.notEqual(r.kind, 'video')
})

test('relaySource refuses hosts off the allow-list and non-https', () => {
  assert.equal(relaySource('https://evil.example/a.jpg', FD), null)
  assert.equal(relaySource('http://cctv.maholan.net/a.jpg', FD), null)
  assert.equal(relaySource('file:///etc/passwd', FD), null)
  assert.equal(relaySource(42, FD), null)
  assert.equal(relaySource('https://cctv.maholan.net/a.jpg', FD), 'https://cctv.maholan.net/a.jpg')
})

test('relaySource rewrites DWR stills to the local FloodDash', () => {
  const id = '0123abcd-0000-4000-8000-0123456789ab'
  assert.equal(relaySource(`https://flood.nonarkara.org/api/cctv/dwr?id=${id}`, FD), `${FD}/api/cctv/dwr?id=${id}`)
  assert.equal(relaySource('https://flood.nonarkara.org/api/cctv/dwr?id=../../x', FD), null)
})

test('down camera with no viewer is off', () => {
  assert.equal(classify({ stream_status: 'down' }, FD).kind, 'off')
})

test('buildCatalog drops out-of-Thailand and duplicate cameras, keeps relay URLs server-side', () => {
  const payload = {
    fetched_at: '2026-10-04T00:00:00Z',
    sources: [{ id: 'maholan', label_th: 'ม', label_en: 'M', count: 3, status: 'ok' }],
    cameras: [
      { id: '1', source: 'maholan', name_en: 'A', lat: 13.7, lng: 100.5, snapshot_url: 'https://cctv.maholan.net/1.jpg' },
      { id: '1', source: 'maholan', name_en: 'A again', lat: 13.7, lng: 100.5 },
      { id: '2', source: 'maholan', name_en: 'Paris', lat: 48.8, lng: 2.3 },
      { id: '3', source: 'maholan', name_en: 'No coords' },
      null,
    ],
  }
  const { cameras, relayMap, sources } = buildCatalog(payload, { floodDashBase: FD })
  assert.equal(cameras.length, 1)
  assert.equal(cameras[0].id, 'maholan:1')
  assert.equal(cameras[0].k, 'still')
  assert.equal('relay' in cameras[0], false, 'relay URL must not be published')
  assert.equal(relayMap.get('maholan:1'), 'https://cctv.maholan.net/1.jpg')
  assert.equal(sources[0].en, 'M')
})

test('buildCatalog sorts video before still before view before off', () => {
  const cams = [
    { id: 'o', source: 's', lat: 13, lng: 100, stream_status: 'down' },
    { id: 'v', source: 's', lat: 13, lng: 100, hls_url: 'https://x.ipcamlive.com/a.m3u8', stream_status: 'live' },
    { id: 's', source: 's', lat: 13, lng: 100, snapshot_url: 'https://cctv.maholan.net/s.jpg' },
  ]
  const { cameras } = buildCatalog({ cameras: cams }, { floodDashBase: FD })
  assert.deepEqual(cameras.map((c) => c.k), ['video', 'still', 'off'])
  assert.deepEqual(countKinds(cameras), { video: 1, still: 1, view: 0, off: 1, total: 3 })
})

test('buildCatalog tolerates garbage payloads', () => {
  assert.equal(buildCatalog(null).cameras.length, 0)
  assert.equal(buildCatalog({ cameras: 'nope' }).cameras.length, 0)
})

test('readCapped refuses a catalogue body past the cap instead of buffering it', async () => {
  const { readCapped } = await import('../server/catalog.js')
  // Declared length over the cap is refused before a single byte is read.
  const declared = new Response('{}', { headers: { 'content-length': String(50 * 1024 * 1024) } })
  await assert.rejects(() => readCapped(declared, 1024), /over the 1024 cap/)

  // No content-length (chunked): the cap is enforced while streaming, and the
  // reader is cancelled rather than drained.
  const body = new ReadableStream({
    start(c) { c.enqueue(new TextEncoder().encode('x'.repeat(600))); c.enqueue(new TextEncoder().encode('y'.repeat(600))); c.close() },
  })
  await assert.rejects(() => readCapped(new Response(body), 1024), /exceeded the 1024 byte cap/)

  // Under the cap, it parses normally.
  const small = new Response(JSON.stringify({ cameras: [1, 2] }), { headers: { 'content-type': 'application/json' } })
  assert.deepEqual(await readCapped(small, 1024 * 1024), { cameras: [1, 2] })
})

test('two catalogue refreshes cannot interleave on one temp file', async () => {
  const { createCatalogStore } = await import('../server/catalog.js')
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cat-race-'))
  const cacheFile = path.join(dir, 'cameras.json')
  let inFlight = 0
  let overlapped = 0
  const store = createCatalogStore({
    floodDashBase: 'http://x',
    cacheFile,
    refreshMs: 1e9,
    log: () => {},
  })
  const slowFetch = async () => {
    inFlight++
    if (inFlight > 1) overlapped++
    await new Promise((r) => setTimeout(r, 40))
    inFlight--
    // A camera that actually classifies: an allow-listed still URL, not a stub.
    // adopt() refuses an empty catalogue on purpose, so a shape that classifies
    // to nothing would test nothing at all.
    return new Response(JSON.stringify({ fetched_at: 'now', sources: [], cameras: [{ id: 'maholan:1', src: 'maholan', snapshot_url: 'https://cctv.maholan.net/a.jpg', lat: 13.7, lng: 100.5, loc: 'x', th: 'ก', en: 'c' }] }), { headers: { 'content-type': 'application/json' } })
  }
  // Drive refresh() twice concurrently against the same store. Restore fetch and
  // clean up AFTER asserting — an earlier version tidied in `finally`, which ran
  // before the assertions and deleted the very file they were checking for.
  const realFetch = globalThis.fetch
  globalThis.fetch = slowFetch
  try {
    await Promise.all([store.refresh(), store.refresh()])
    assert.equal(overlapped, 0, 'the second refresh must not enter while one is running')
    assert.ok(fs.existsSync(cacheFile), 'the catalogue was still written')
    assert.equal(fs.readdirSync(dir).filter((f) => f.endsWith('.tmp')).length, 0, 'no temp file left behind')
  } finally {
    globalThis.fetch = realFetch
    store.stop()
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('a catalogue that collapses implausibly is refused, keeping the last good copy', async () => {
  // The real incident, at the real numbers: FloodDash returned 131 cameras with
  // five of seven sources failed, against 3,425 good ones. 131 is not empty, so
  // the empty guard waved it through and visitors saw 4% of the site for 29
  // minutes. The bound is relative to what we already believe, so it needs no
  // world knowledge and cannot go stale as the catalogue grows.
  const { createCatalogStore } = await import('../server/catalog.js')
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cat-collapse-'))
  const cam = (i) => ({ id: `maholan:${i}`, src: 'maholan', snapshot_url: `https://cctv.maholan.net/${i}.jpg`, lat: 13.7, lng: 100.5, loc: 'x', th: 'ก', en: 'c' })
  const payload = (n, sources) => JSON.stringify({
    fetched_at: 'now',
    sources: sources ?? Array.from({ length: 7 }, (_, i) => ({ id: `s${i}`, label: `S${i}`, url: 'https://x', kind: 'still', status: 'live', count: n })),
    cameras: Array.from({ length: n }, (_, i) => cam(i)),
  })

  let current = payload(3425)
  const realFetch = globalThis.fetch
  globalThis.fetch = async () => new Response(current, { headers: { 'content-type': 'application/json' } })
  const logs = []
  const store = createCatalogStore({ floodDashBase: 'http://x', cacheFile: path.join(dir, 'c.json'), refreshMs: 1e9, log: (l, m, meta) => logs.push(meta) })
  try {
    await store.refresh()
    assert.equal(store.get().cameras.length, 3425, 'baseline')

    // A 6% dip is REAL: the log shows 3,425 → 3,211 while sources re-probed.
    // Refusing that would leave the site lying about itself in the other direction.
    current = payload(3211)
    await store.refresh()
    assert.equal(store.get().cameras.length, 3211, 'a 6% dip is plausible and must be adopted')

    // The 29-minute outage is not real and must not be published.
    current = payload(131, [
      { id: 'maholan', label: 'Maholan', url: 'https://x', kind: 'still', status: 'failed', count: 0 },
      { id: 'gistda', label: 'GISTDA', url: 'https://x', kind: 'still', status: 'failed', count: 0 },
      { id: 'dwr', label: 'DWR', url: 'https://x', kind: 'still', status: 'live', count: 130 },
    ])
    await store.refresh()
    assert.equal(store.get().cameras.length, 3211, 'the last good catalogue must survive a collapse')
    assert.match(JSON.stringify(logs), /collapsed from 3211 to 131/, 'and the refusal must say why')
    assert.match(JSON.stringify(logs), /maholan/, 'naming the sources that were not live')
  } finally {
    globalThis.fetch = realFetch
    store.stop()
    fs.rmSync(dir, { recursive: true, force: true })
  }
})
