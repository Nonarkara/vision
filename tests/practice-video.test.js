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
