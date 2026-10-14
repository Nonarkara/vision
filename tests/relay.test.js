import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRelay, RelayError, semaphore, FRAME_TTL_MS, BREAKER_FAILS, MAX_FRAME_BYTES, UPSTREAM_STATUS } from '../server/relay.js'

const JPEG = Buffer.alloc(2048, 1)

function fakeFetch(handler) {
  const calls = []
  const impl = async (url, opts) => {
    calls.push({ url, opts })
    return handler(url, opts)
  }
  impl.calls = calls
  return impl
}

const ok = (body = JPEG, type = 'image/jpeg') => new Response(body, { status: 200, headers: { 'content-type': type } })
const resolve = (map) => (id) => map[id] ?? null

test('serves a frame and caches it for the TTL', async () => {
  let t = 1_000
  const f = fakeFetch(() => ok())
  const relay = createRelay({ fetchImpl: f, now: () => t })
  const r = resolve({ a: 'https://cctv.maholan.net/a.jpg' })
  const first = await relay.frame('a', r)
  assert.equal(first.type, 'image/jpeg')
  assert.equal((await relay.frame('a', r)).cached, true)
  assert.equal(f.calls.length, 1)
  t += FRAME_TTL_MS + 1
  await relay.frame('a', r)
  assert.equal(f.calls.length, 2)
})

test('never follows redirects and refuses unknown ids', async () => {
  const f = fakeFetch(() => ok())
  const relay = createRelay({ fetchImpl: f })
  await assert.rejects(relay.frame('nope', resolve({})), (e) => e instanceof RelayError && e.status === 404)
  await relay.frame('a', resolve({ a: 'https://cctv.maholan.net/a.jpg' }))
  assert.equal(f.calls[0].opts.redirect, 'error')
})

test('rejects non-images, tiny and oversized bodies as 424, never 502 or 504', async () => {
  const timeout = () => { const err = new Error('slow'); err.name = 'TimeoutError'; throw err }
  const cases = [
    [() => ok('<html>', 'text/html'), /not an image/],
    [() => ok(Buffer.alloc(10), 'image/jpeg'), /too small/],
    [() => ok(Buffer.alloc(MAX_FRAME_BYTES + 1), 'image/jpeg'), /too large/],
    [() => new Response('x', { status: 502 }), /answered 502/],
    [timeout, /did not answer in time/],
    [async () => { throw new TypeError('network') }, /unreachable/],
  ]
  for (const [handler, msg] of cases) {
    const relay = createRelay({ fetchImpl: fakeFetch(handler) })
    await assert.rejects(
      relay.frame('a', resolve({ a: 'https://cctv.maholan.net/a.jpg' })),
      (e) => e instanceof RelayError && e.status === 424 && e.status !== 502 && e.status !== 504 && msg.test(e.message),
    )
    assert.equal(relay.revision, 1)
  }
})

test('coalesces concurrent requests for one camera into one upstream fetch', async () => {
  let release
  const gate = new Promise((r) => { release = r })
  const f = fakeFetch(async () => { await gate; return ok() })
  const relay = createRelay({ fetchImpl: f })
  const r = resolve({ a: 'https://cctv.maholan.net/a.jpg' })
  const all = Promise.all([relay.frame('a', r), relay.frame('a', r), relay.frame('a', r)])
  release()
  await all
  assert.equal(f.calls.length, 1)
})

test('opens the circuit breaker after repeated failures on a host', async () => {
  const f = fakeFetch(async () => { throw new TypeError('network') })
  const relay = createRelay({ fetchImpl: f })
  const map = {}
  for (let i = 0; i < BREAKER_FAILS + 1; i++) map[`c${i}`] = `https://cctv.maholan.net/${i}.jpg`
  for (let i = 0; i < BREAKER_FAILS; i++) await assert.rejects(relay.frame(`c${i}`, resolve(map)))
  await assert.rejects(relay.frame(`c${BREAKER_FAILS}`, resolve(map)), (e) => e.status === 503)
  assert.equal(f.calls.length, BREAKER_FAILS)
  assert.deepEqual(relay.stats().resting_hosts, ['cctv.maholan.net'])
})

test('sweep empties expired frames so idle memory returns to zero', async () => {
  let t = 0
  const relay = createRelay({ fetchImpl: fakeFetch(() => ok()), now: () => t })
  await relay.frame('a', resolve({ a: 'https://cctv.maholan.net/a.jpg' }))
  assert.equal(relay.stats().cached_frames, 1)
  t += FRAME_TTL_MS + 1
  relay.sweep()
  assert.equal(relay.stats().cached_frames, 0)
})

test('refuses new frames once the wait queue is full — the relay is not a socket warehouse', async () => {
  // Six cameras across three hosts fill the four upstream slots and the
  // two wait slots; a seventh frame must be turned away with 503 rather
  // than parked on the queue holding its socket open.
  let release
  const gate = new Promise((r) => { release = r })
  const f = fakeFetch(async () => { await gate; return ok() })
  const relay = createRelay({ fetchImpl: f, maxQueue: 2 })
  const map = {}
  const spread = [['a1', 'one.test'], ['a2', 'one.test'], ['b1', 'two.test'], ['b2', 'two.test'], ['c1', 'three.test'], ['c2', 'three.test']]
  for (const [id, host] of spread) map[id] = `https://${host}/x.jpg`
  const r = resolve(map)
  const busy = spread.map(([id]) => relay.frame(id, r).catch((e) => e))
  await new Promise((settled) => setTimeout(settled, 0))
  const refused = await relay.frame('d1', resolve({ d1: 'https://four.test/x.jpg' })).catch((e) => e)
  release()
  const served = await Promise.all(busy)
  assert.ok(served.every((entry) => !(entry instanceof Error)), 'the six admitted frames all complete')
  assert.ok(refused instanceof RelayError && refused.status === 503, 'the seventh frame is turned away')
  assert.match(refused.message, /busy/)
  assert.equal(f.calls.length, 6, 'only the six admitted frames were ever fetched')
})

test('semaphore limits concurrency and serves waiters in order', async () => {
  const sem = semaphore(2)
  const order = []
  const r1 = await sem.acquire()
  const r2 = await sem.acquire()
  const p3 = sem.acquire().then((r) => { order.push(3); return r })
  const p4 = sem.acquire().then((r) => { order.push(4); return r })
  assert.equal(sem.waiting, 2)
  r1(); r2()
  ;(await p3)(); (await p4)()
  assert.deepEqual(order, [3, 4])
  assert.equal(sem.active, 0)
})

test('stops reading an oversized chunked response and cancels upstream', async () => {
  let cancelled = false
  let reads = 0
  const relay = createRelay({ fetchImpl: async () => new Response(new ReadableStream({
    pull(controller) { reads++; controller.enqueue(new Uint8Array(1024 * 1024)) },
    cancel() { cancelled = true },
  }), { headers: { 'content-type': 'image/jpeg' } }) })
  await assert.rejects(relay.frame('a', resolve({ a: 'https://cctv.maholan.net/a.jpg' })), /frame too large/)
  assert.equal(cancelled, true)
  assert.ok(reads <= 6)
  assert.equal(relay.stats().cached_frames, 0)
})

test('queued requests respect a breaker opened while waiting', async () => {
  const f = fakeFetch(async () => { throw new TypeError('network') })
  const relay = createRelay({ fetchImpl: f })
  const results = await Promise.allSettled(Array.from({ length: 30 }, (_, i) =>
    relay.frame(String(i), () => `https://cctv.maholan.net/${i}.jpg`)))
  assert.ok(results.some((r) => r.reason?.status === 503))
  assert.ok(f.calls.length <= BREAKER_FAILS + 1)
  assert.equal(relay.stats().inflight, 0)
})

test('the wait queue is bounded per host, not only in the global queue', async () => {
  // The one shape the bound exists for: many ids on a SINGLE allow-listed host.
  // Per-host concurrency (2) is below the global limit (4), so every one of these
  // parks on the host semaphore and global.waiting never moves — the old guard
  // saw zero waiters and admitted all twelve.
  let open
  const gate = new Promise((r) => { open = r })
  const f = fakeFetch(async () => { await gate; return ok() })
  const relay = createRelay({ fetchImpl: f, maxQueue: 3 })
  const url = (id) => `https://cctv.maholan.net/${id}.jpg`

  // Handlers attached on the spot, so the ones the bound refuses are not
  // reported as unhandled while the rest are still queued.
  const pending = Array.from({ length: 12 }, (_, i) => relay.frame(`cam${i}`, url).then(() => 'served', (e) => `refused ${e.status}`))
  await new Promise((r) => setImmediate(r))   // let the queue form before the gate opens
  open()

  const settled = await Promise.all(pending)
  const refused = settled.filter((x) => x !== 'served')
  assert.ok(refused.length >= 5, `the queue bound refused ${refused.length} of 12; it should refuse most of them`)
  for (const x of refused) assert.match(x, /^refused 503$/)
})

test('the breaker counts one host, not one port', async () => {
  // STILL_HOSTS allow-lists hostnames. Keying the breaker on URL.host gave
  // :8443 its own failure budget, so a broken host could be fetched on two ports
  // with 2 × BREAKER_FAILS attempts before anything rested.
  const f = fakeFetch(() => new Response('nope', { status: 500 }))
  const relay = createRelay({ fetchImpl: f })
  const plain = (id) => `https://cctv.maholan.net/${id}.jpg`
  const ported = (id) => `https://cctv.maholan.net:8443/${id}.jpg`

  for (let i = 0; i < BREAKER_FAILS; i++) await relay.frame(`p${i}`, plain).catch(() => {})
  const last = await relay.frame('x', ported).then(() => 'served', (e) => e.status)
  assert.equal(last, 503, 'the same host on another port must share the breaker')
})

test('dead cameras cannot be used to rest a whole host', async () => {
  // /api/cameras is public and the catalogue is built from snapshot_url EXISTING,
  // not from a successful fetch, so ids whose upstream stills are gone are
  // enumerable. Eight 404s used to open the host breaker and make every still on
  // cctv.maholan.net answer "resting" for three minutes.
  const f = fakeFetch(() => new Response('gone', { status: 404 }))
  const relay = createRelay({ fetchImpl: f })
  const url = (id) => `https://cctv.maholan.net/${id}.jpg`
  for (let i = 0; i < BREAKER_FAILS + 4; i++) await relay.frame(`dead${i}`, url).catch(() => {})

  // Every one of those ids still reports its OWN failure — 424 Failed Dependency,
  // not the 503 a resting host gives. That distinction is the whole point: the
  // visitor is told this camera cannot be read, not that the whole host is down.
  const after = await relay.frame('dead0', url).then(() => 'served', (e) => e.status)
  assert.equal(after, UPSTREAM_STATUS, 'a dead camera reports its own upstream refusal')

  // And a camera that IS alive still works — the host is not resting.
  const good = fakeFetch(() => ok())
  const relay2 = createRelay({ fetchImpl: good })
  const frame = await relay2.frame('alive', url)
  assert.equal(frame.type, 'image/jpeg', 'the host must not be resting because of dead ids')
})

test('a host that really is broken still opens the breaker', async () => {
  // The other side of the same distinction: a 5xx says something about the host,
  // so it must still be able to rest it.
  const failing = fakeFetch(() => new Response('boom', { status: 502 }))
  const relay = createRelay({ fetchImpl: failing })
  const url = (id) => `https://cctv.maholan.net/${id}.jpg`
  for (let i = 0; i < BREAKER_FAILS; i++) await relay.frame(`b${i}`, url).catch(() => {})
  const last = await relay.frame('x', url).then(() => 'served', (e) => e.status)
  assert.equal(last, 503, 'repeated host-level failures must still rest the host')
})
