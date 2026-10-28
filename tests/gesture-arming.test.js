import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createActions } from '../public/js/gesture/actions.js'

function browser(t, { suspended = false } = {}) {
  let opened = 0
  let resume
  const waiting = new Promise(resolve => { resume = resolve })
  const previous = { window: globalThis.window, AudioContext: globalThis.AudioContext }
  t.after(() => {
    if (previous.window === undefined) delete globalThis.window
    else globalThis.window = previous.window
    if (previous.AudioContext === undefined) delete globalThis.AudioContext
    else globalThis.AudioContext = previous.AudioContext
  })
  globalThis.window = { open: () => { opened++; return { closed: false } } }
  globalThis.AudioContext = class {
    state = suspended ? 'suspended' : 'running'
    async resume() { await waiting; this.state = 'running' }
  }
  return { resume, opened: () => opened }
}

test('turning on ordinary actions does not open an unexplained blank window', async t => {
  const fake = browser(t)
  const actions = createActions()
  await actions.arm()
  assert.equal(fake.opened(), 0)
})
test('a chosen handbook action can prepare one window from the user click', async t => {
  const fake = browser(t)
  await createActions().arm({ openWindow: true })
  assert.equal(fake.opened(), 1)
})
test('turning off while audio permission is pending cannot re-enable actions or open a window', async t => {
  const fake = browser(t, { suspended: true })
  const actions = createActions()
  const pending = actions.arm({ openWindow: true })
  actions.disarm()
  fake.resume()
  assert.equal((await pending).ok, false)
  assert.equal(fake.opened(), 0)
  assert.equal((await actions.fire('beep')).ok, false)
})

test('an action cannot change the pretend lamp while actions are off', async () => {
  let changed = 0
  const actions = createActions({ lamps: [{ classList: { toggle() { changed++ } } }] })
  assert.equal((await actions.fire('lamp1')).ok, false)
  assert.equal(changed, 0)
})
