import { test } from 'node:test'
import assert from 'node:assert/strict'
import { practiceVideo } from '../public/js/train/practice-video.js'

function fixture(t) {
  const oldDoc = globalThis.document, oldPerf = globalThis.performance
  let now = 0
  const events = new Map()
  const g = { fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, drawImage() {} }
  globalThis.document = {
    hidden: false,
    createElement: () => ({ getContext: () => g }),
    addEventListener: (name, fn) => events.set(name, fn),
    removeEventListener: name => events.delete(name),
  }
  globalThis.performance = { now: () => now }
  t.after(() => { globalThis.document = oldDoc; globalThis.performance = oldPerf })
  const source = practiceVideo()
  return { source, events, draw: () => source.drawTo(g, 640, 360), time: value => { now = value } }
}

test('practice traffic advances through visible time even when no preview was drawn', t => {
  const f = fixture(t)
  assert.equal(f.source.scene, 'busy')
  f.time(9000)
  f.draw()
  assert.equal(f.source.scene, 'quiet', 'waiting away from the preview must not freeze the busy scene')
  f.time(17000)
  f.draw()
  assert.equal(f.source.scene, 'busy')
})

test('practice scene controls hold the traffic type while frames keep moving', t => {
  const f = fixture(t)
  f.source.setScene('quiet')
  f.time(17000)
  f.draw()
  assert.equal(f.source.sceneMode, 'quiet')
  assert.equal(f.source.scene, 'quiet')
  assert.equal(f.source.frameAt, 17)
  f.source.setScene('busy')
  assert.equal(f.source.scene, 'busy')
  f.source.setScene('auto')
  assert.equal(f.source.sceneMode, 'auto')
})

test('hidden-tab time is excluded and closing removes the visibility listener', t => {
  const f = fixture(t)
  f.time(1000); f.draw()
  document.hidden = true; f.events.get('visibilitychange')()
  f.time(61000)
  document.hidden = false; f.events.get('visibilitychange')()
  f.time(62000); f.draw()
  assert.equal(f.source.frameAt, 2)
  f.source.close()
  assert.equal(f.source.ready, false)
  assert.equal(f.events.size, 0)
})

test('practice is ready only when the actual selected frame has decoded', t => {
  const old = globalThis.Image, images = []
  globalThis.Image = class { constructor() { this.complete = false; this.naturalWidth = 0; images.push(this) } }
  t.after(() => { globalThis.Image = old })
  const f = fixture(t)
  assert.equal(f.source.ready, false, 'a blank placeholder must not be saved as a training example')
  images[0].complete = true; images[0].naturalWidth = 480
  assert.equal(f.source.ready, true)
  f.time(600); f.draw()
  assert.equal(f.source.ready, false, 'another decoded frame does not make the current one readable')
  images[1].complete = true; images[1].naturalWidth = 480
  assert.equal(f.source.ready, true)
})
