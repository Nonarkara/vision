import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRelay, RelayError, semaphore, FRAME_TTL_MS, BREAKER_FAILS, MAX_FRAME_BYTES } from '../server/relay.js'

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

test('rejects non-images, tiny and oversized bodies', async () => {
  const cases = [
    [() => ok('<html>', 'text/html'), /not an image/],
    [() => ok(Buffer.alloc(10), 'image/jpeg'), /too small/],
    [() => ok(Buffer.alloc(MAX_FRAME_BYTES + 1), 'image/jpeg'), /too large/],
    [() => new Response('x', { status: 500 }), /answered 500/],
  ]
  for (const [handler, msg] of cases) {
    const relay = createRelay({ fetchImpl: fakeFetch(handler) })
    await assert.rejects(relay.frame('a', resolve({ a: 'https://cctv.maholan.net/a.jpg' })), (e) => e instanceof RelayError && msg.test(e.message))
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
