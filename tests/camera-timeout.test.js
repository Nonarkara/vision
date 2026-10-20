import { test } from 'node:test'
import assert from 'node:assert/strict'

// A camera that answers nothing: a <video> that never fires 'loadeddata'.
// window.Hls is present but says it cannot play, so the HLS branch is skipped
// and the timeout below is the only thing that can end the open.
globalThis.document = {
  documentElement: { dataset: { lang: 'en' } },
  createElement: () => ({
    style: {}, setAttribute() {}, append() {}, getContext: () => ({}),
    addEventListener() {}, removeEventListener() {}, remove() {},
    canPlayType: (type) => (type === 'application/vnd.apple.mpegurl' ? 'maybe' : ''),
  }),
  getElementById: () => null,
  body: { append() {} },
  head: { append() {} },
}
globalThis.window = { matchMedia: () => ({ matches: false }), Hls: { isSupported: () => false } }

const { openCamera } = await import('../public/js/core/source.js')

const cam = { id: 'dead', k: 'video' }

// The camera probe passes `videoTimeout`; the reader of that option used to be
// called `timeout`, so the option was dead and every cold open waited the
// default 20 seconds — twice, for two batches of probes. The name has to match
// at both ends, and this pins it.
test('a camera that sends no picture gives up when the caller says so, not at the default', async () => {
  const started = Date.now()
  await assert.rejects(openCamera(cam, { videoTimeout: 400 }), (err) => {
    assert.match(err.en, /sent no picture within \d+ seconds/)
    return true
  })
  const waited = Date.now() - started
  assert.ok(waited < 5000, `waited ${waited} ms — the option was ignored and the 20 s default was used`)
})

test('the message tells the visitor how long it waited', async () => {
  await assert.rejects(openCamera(cam, { videoTimeout: 1500 }), (err) => {
    assert.match(err.en, /within 2 seconds/)
    assert.match(err.th, /ภายใน 2 วินาที/)
    return true
  })
})
