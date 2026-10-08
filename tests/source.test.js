import { test } from 'node:test'
import assert from 'node:assert/strict'

// Exercise actual source/specimen code with just the browser primitives it uses.
globalThis.document = {
  documentElement: { dataset: { lang: 'en' } },
  querySelectorAll: () => [],
  querySelector: () => null,
  addEventListener() {},
  dispatchEvent() {},
  createElement: () => ({ getContext: () => ({}) }),
}
globalThis.ImageBitmap = class {
  width = 640
  height = 480
  closed = false
  close() { this.closed = true }
}
globalThis.createImageBitmap = async () => new ImageBitmap()
const { createSpecimen } = await import('../public/js/core/specimen.js')
const { openCamera } = await import('../public/js/core/source.js')
const camera = { id: 'a', k: 'still' }
function deferred() {
  let resolve
  const promise = new Promise((r) => { resolve = r })
  return { promise, resolve }
}
const response = () => new Response(new Uint8Array(1024), { headers: { 'content-type': 'image/jpeg' } })

test('a late camera cannot replace a newer local photo', async () => {
  const pending = deferred()
  globalThis.fetch = () => pending.promise
  const specimen = createSpecimen({ refreshStills: false })
  const opening = specimen.useCamera(camera)
  const photo = await specimen.usePhoto({ type: 'image/png' })
  pending.resolve(response())
  assert.equal(await opening, null)
  assert.equal(specimen.source, photo)
  specimen.close()
  assert.equal(photo.el.closed, true)
})

test('closing a specimen releases a source that finishes opening later', async () => {
  const pending = deferred()
  globalThis.fetch = () => pending.promise
  let bitmap
  globalThis.createImageBitmap = async () => (bitmap = new ImageBitmap())
  const specimen = createSpecimen({ refreshStills: false })
  const opening = specimen.useCamera(camera)
  specimen.close()
  pending.resolve(response())
  assert.equal(await opening, null)
  assert.equal(specimen.source, null)
  assert.equal(bitmap.closed, true)
})

test('a late still refresh closes its bitmap after the source is closed', async () => {
  globalThis.fetch = async () => response()
  const src = await openCamera(camera)
  const pending = deferred()
  globalThis.fetch = () => pending.promise
  let bitmap
  globalThis.createImageBitmap = async () => (bitmap = new ImageBitmap())
  const refreshing = src.refresh()
  const old = src.el
  src.close()
  pending.resolve(response())
  await refreshing
  assert.equal(bitmap.closed, true)
  assert.equal(src.el, old)
  assert.equal(src.grab(), null)
})

test('overlapping webcam requests release the late stream and keep the newer camera', async () => {
  const { openWebcam } = await import('../public/js/core/source.js')
  const older = deferred(), newer = deferred()
  let calls = 0
  globalThis.window = { isSecureContext: true }
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {
    mediaDevices: { getUserMedia: () => (++calls === 1 ? older.promise : newer.promise) },
  } })
  document.getElementById = () => ({ append() {} })
  document.addEventListener = () => {}
  document.removeEventListener = () => {}
  document.createElement = () => ({
    videoWidth: 640, videoHeight: 480,
    play: async () => {}, remove() {}, getContext: () => ({}),
  })
  function stream() {
    const track = { stopped: false, stop() { this.stopped = true }, getSettings: () => ({}), addEventListener() {} }
    return { track, getTracks: () => [track], getVideoTracks: () => [track] }
  }
  const oldStream = stream(), newStream = stream()
  const first = openWebcam()
  const rejected = assert.rejects(first, /newer camera/)
  const second = openWebcam()
  newer.resolve(newStream)
  const source = await second
  older.resolve(oldStream)
  await rejected
  assert.equal(oldStream.track.stopped, true)
  assert.equal(newStream.track.stopped, false)
  source.close()
  assert.equal(newStream.track.stopped, true)
})

function mockWebcam(getUserMedia, play = async () => {}) {
  globalThis.window = { isSecureContext: true }
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {
    mediaDevices: { getUserMedia, enumerateDevices: () => new Promise(() => {}) },
  } })
  document.getElementById = () => ({ append() {} })
  document.createElement = () => ({
    videoWidth: 640, videoHeight: 480, play, remove() {}, getContext: () => ({}),
  })
  const track = { stopped: false, stop() { this.stopped = true }, getSettings: () => ({}), addEventListener() {} }
  return { track, getTracks: () => [track], getVideoTracks: () => [track] }
}

test('an unanswered camera request times out and releases a late permission grant', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const pending = deferred()
  const stream = mockWebcam(() => pending.promise)
  const { openWebcam } = await import('../public/js/core/source.js')
  const opening = openWebcam()
  const rejected = assert.rejects(opening, /not answered the camera request/)
  t.mock.timers.tick(15000)
  await rejected
  pending.resolve(stream)
  await Promise.resolve()
  assert.equal(stream.track.stopped, true)
})

test('pending video playback times out and releases the camera', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const stream = mockWebcam(() => Promise.resolve(stream), () => new Promise(() => {}))
  const { openWebcam } = await import('../public/js/core/source.js')
  const opening = openWebcam()
  const rejected = assert.rejects(opening, /playback did not start/)
  for (let i = 0; i < 8; i++) await Promise.resolve()
  t.mock.timers.tick(8000)
  await rejected
  assert.equal(stream.track.stopped, true)
})

test('a working webcam is installed even when device enumeration never answers', async () => {
  const stream = mockWebcam(() => Promise.resolve(stream))
  const specimen = createSpecimen({ refreshStills: false })
  const src = await specimen.useWebcam()
  assert.equal(src.kind, 'webcam')
  assert.equal(specimen.source, src)
  specimen.close()
  assert.equal(stream.track.stopped, true)
})

test('a late local clip is discarded after a newer source choice and releases its URL', async () => {
  const events = new Map()
  const video = {
    videoWidth:640, videoHeight:360, removed:false, paused:false,
    addEventListener(type,fn) { events.set(type,fn) },
    removeEventListener(type) { events.delete(type) },
    play:async()=>{}, pause() { this.paused=true },
    removeAttribute() {}, load() {}, remove() { this.removed=true },
  }
  document.getElementById=()=>({append(){}})
  document.createElement=(kind)=>kind==='video'?video:{getContext:()=>({})}
  const specimen=createSpecimen({refreshStills:false})
  const opening=specimen.useVideo(new Blob(['test'],{type:'video/webm'}))
  const newer={kind:'practice',close(){this.closed=true}}
  specimen.useLocal(newer)
  events.get('loadeddata')()
  assert.equal(await opening,null)
  assert.equal(specimen.source,newer)
  assert.equal(video.removed,true)
  assert.equal(video.paused,true)
  specimen.close()
  assert.equal(newer.closed,true)
})
