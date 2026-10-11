import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { handler } from '../server/index.js'
import { evidence, isReadable } from '../public/js/core/catalog.js'

// The About chapter prints these six figures directly above the line "they are
// the camera list this site is reading right now". So the only two acceptable
// states are: a real number, or a dash meaning "not known yet". A zero is a
// claim about the world, and it is never the right thing to print for a figure
// we have not measured.

const KEYS = ['total', 'readable', 'video', 'still', 'off', 'sources']

// Run the real request handler on an ephemeral port, exactly as check-site does,
// so this exercises the payload the chapter is actually handed.
const server = http.createServer(handler)
before(() => new Promise((r) => server.listen(0, '127.0.0.1', r)))
after(() => new Promise((r) => server.close(r)))

test('evidence refuses a payload with no camera list rather than inventing figures', () => {
  assert.equal(evidence(null), null)
  assert.equal(evidence({}), null)
  assert.equal(evidence({ counts: { total: 9 } }), null)
})

test('a catalogue that has not loaded yet prints dashes, never zeros', () => {
  // Exactly what a freshly booted server sends: nothing upstream has answered.
  const notYet = { cameras: [], counts: { video: 0, still: 0, view: 0, off: 0, total: 0 }, sources: [], loadedAt: null, origin: 'empty' }
  const fig = evidence(notYet)
  for (const k of KEYS) {
    assert.equal(fig[k], null, `${k} must be a dash before the catalogue loads — 0 would claim Thailand has no cameras`)
  }
})

test('every figure is a real count or null — never a defaulted zero', () => {
  const cams = [{ k: 'video' }, { k: 'still' }, { k: 'still' }, { k: 'view' }, { k: 'off' }]
  const fig = evidence({ cameras: cams, loadedAt: '2026-01-01T00:00:00Z' })
  assert.equal(fig.total, 5)
  assert.equal(fig.readable, 3)
  // video/still/off come from counts, which this payload does not carry.
  assert.equal(fig.video, null)
  assert.equal(fig.still, null)
  assert.equal(fig.off, null)
  for (const v of Object.values(fig)) assert.ok(v === null || v > 0)
})

test('readable is counted with the same isReadable every other page uses', () => {
  const cams = [
    { k: 'video' },
    { k: 'still' },
    { k: 'still', h: 1 },
    { k: 'still', h: 0 }, // a still known to yield no pixels
    { k: 'view' },
    { k: 'off' },
  ]
  const fig = evidence({ cameras: cams, loadedAt: '2026-01-01T00:00:00Z' })
  assert.equal(fig.readable, cams.filter(isReadable).length)
  assert.equal(fig.readable, 3) // video + two stills; h:0 is excluded
})

test('a real zero is still printed as a zero once the catalogue has loaded', () => {
  // A day with no live video is a fact, and must not be softened into a dash.
  const fig = evidence({
    cameras: [{ k: 'still' }, { k: 'still' }],
    counts: { video: 0, still: 2, view: 0, off: 0, total: 2 },
    sources: [{ id: 'dwr' }],
    loadedAt: '2026-01-01T00:00:00Z',
  })
  assert.equal(fig.video, 0)
  assert.equal(fig.off, 0)
})

test('sources prefers the server list and falls back to distinct owners', () => {
  const cams = [{ src: 'a' }, { src: 'a' }, { src: 'b' }]
  const loaded = { cameras: cams, loadedAt: '2026-01-01T00:00:00Z' }
  assert.equal(evidence({ ...loaded, sources: [{ id: 'a' }, { id: 'b' }] }).sources, 2)
  assert.equal(evidence(loaded).sources, 2)
})

test('what the strip prints for the catalogue this server is actually serving', async () => {
  const res = await fetch(`http://127.0.0.1:${server.address().port}/api/cameras`)
  assert.equal(res.status, 200, 'the About chapter fetches this endpoint; if it 404s the strip stays blank')
  const payload = await res.json()
  const fig = evidence(payload)
  assert.ok(fig, 'the About chapter would print nothing at all')

  const loaded = Boolean(payload.loadedAt)
  for (const k of KEYS) {
    if (loaded) assert.equal(typeof fig[k], 'number', `${k} must be a number on a loaded catalogue`)
    else assert.equal(fig[k], null, `${k} must be a dash while the catalogue is empty, never 0`)
  }
  if (!loaded) return

  // Loaded: the figures have to agree with each other and with the payload.
  const { video, still, view, off, total } = payload.counts
  assert.equal(video + still + view + off, total, 'the kinds the server counted must add up to the total it reports')
  assert.equal(fig.total, total)
  assert.equal(fig.readable, payload.cameras.filter(isReadable).length)
  assert.ok(fig.readable <= total)
  assert.equal(fig.sources, payload.sources.length)
})