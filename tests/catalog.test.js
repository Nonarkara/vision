import { test } from 'node:test'
import assert from 'node:assert/strict'
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
