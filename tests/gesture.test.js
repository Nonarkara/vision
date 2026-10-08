import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createTrigger } from '../public/js/gesture/fire.js'
import { ACTIONS, DEFAULT_ACTIONS, toneWav } from '../public/js/gesture/actions.js'

const high = [0.8, 0.2]
const weak = [0.5, 0.5]

test('a gesture fires only after it holds the lead for two looks', () => {
  const tick = createTrigger({ sure: 0.55, stable: 2, cooldown: 2500 })
  assert.equal(tick(high, 0), null)      // first look only
  assert.deepEqual(tick(high, 250), { index: 0, p: 0.8 })
})

test('a leader below the confidence line never fires', () => {
  const tick = createTrigger()
  for (let now = 0; now < 5000; now += 250) assert.equal(tick(weak, now), null)
})

test('a flickering leader never fires', () => {
  const tick = createTrigger()
  assert.equal(tick([0.8, 0.2], 0), null)
  assert.equal(tick([0.2, 0.8], 250), null)  // lead changed: streak restarts
  assert.equal(tick([0.8, 0.2], 500), null)
  assert.equal(tick([0.2, 0.8], 750), null)
  assert.equal(tick([0.8, 0.2], 1000), null)
})

test('one global cooldown spaces consecutive fires', () => {
  const tick = createTrigger({ sure: 0.55, stable: 2, cooldown: 2500 })
  assert.equal(tick(high, 0), null)
  assert.deepEqual(tick(high, 250), { index: 0, p: 0.8 })
  assert.equal(tick(high, 500), null)     // streak restarting
  assert.equal(tick(high, 750), null)     // stable again, but inside cooldown
  assert.equal(tick(high, 1000), null)
  assert.equal(tick(high, 2749), null)
  assert.deepEqual(tick(high, 3000), { index: 0, p: 0.8 })  // past 2500ms since 250
})

test('disarmed ticks never fire and forget a half-built lead', () => {
  const tick = createTrigger()
  assert.equal(tick(high, 0, { enabled: false }), null)
  assert.equal(tick(high, 250, { enabled: false }), null)
  assert.equal(tick(high, 500), null)     // streak restarted after the disabled beat
  assert.deepEqual(tick(high, 750), { index: 0, p: 0.8 })
  assert.equal(tick(null, 1000, { enabled: true }), null)
})

test('every action has both languages, and defaults are real actions', () => {
  const ids = ACTIONS.map((a) => a.id)
  assert.equal(new Set(ids).size, ids.length, 'action ids must be unique')
  for (const a of ACTIONS) {
    assert.ok(a.th.trim() && a.en.trim(), `${a.id} needs Thai and English labels`)
  }
  for (const id of DEFAULT_ACTIONS) assert.ok(ids.includes(id), `${id} is not an action`)
})

test('the tone the page builds is a valid mono 16-bit WAV of the right size', () => {
  const wav = toneWav({ hz: 8000, seconds: 1.6 })
  const dv = new DataView(wav.buffer)
  const at = (o) => String.fromCharCode(...wav.slice(o, o + 4))
  assert.equal(at(0), 'RIFF')
  assert.equal(at(8), 'WAVE')
  assert.equal(at(12), 'fmt ')
  assert.equal(dv.getUint16(20, true), 1, 'PCM')
  assert.equal(dv.getUint16(22, true), 1, 'mono')
  assert.equal(dv.getUint32(24, true), 8000, 'sample rate')
  assert.equal(dv.getUint16(34, true), 16, 'bits')
  assert.equal(at(36), 'data')
  const samples = 8000 * 1.6
  assert.equal(dv.getUint32(40, true), samples * 2, 'data size')
  assert.equal(wav.length, 44 + samples * 2, 'header + payload')
  assert.equal(dv.getUint32(4, true) + 8, wav.length, 'RIFF size')
})

test('the gesture room starts with one finger, a palm and a resting pose, each bound to a real action', async () => {
  const { PRESETS } = await import('../public/js/train/store.js')
  const { PRESET_ACTIONS } = await import('../public/js/gesture/actions.js')
  const fingers = PRESETS.find((p) => p.id === 'fingers')
  assert.deepEqual(fingers.names.map(([, en]) => en), ['One finger', 'Palm', 'Nothing'])
  const ids = ACTIONS.map((a) => a.id)
  assert.equal(PRESET_ACTIONS.fingers.length, fingers.names.length)
  for (const id of PRESET_ACTIONS.fingers) assert.ok(ids.includes(id), `${id} is not an action`)
  assert.equal(PRESET_ACTIONS.fingers.at(-1), 'none', 'the resting pose does nothing')
})
