import { test } from 'node:test'
import assert from 'node:assert/strict'
import { initFullscreen } from '../public/js/core/fullscreen.js'

function element(classes = []) {
  const names = new Set(classes)
  return {
    classList: { contains: (c) => names.has(c), add: (c) => names.add(c), remove: (c) => names.delete(c) },
    children: [], parentElement: null, inert: false, attrs: {}, events: {},
    addEventListener(type, fn) { this.events[type] = fn },
    setAttribute(key, value) { this.attrs[key] = value },
    focus() { this.focused = true },
    querySelector() { return null },
    closest(selector) { for (let p = this; p; p = p.parentElement) if (p.classList.contains(selector.slice(1))) return p; return null },
  }
}
function children(parent, ...items) {
  parent.children = items
  for (const child of items) child.parentElement = parent
}

for (const focusRoom of [false, true, 'lesson']) test(`phone viewport mode keeps ${focusRoom ? 'session consent and summary' : 'bench controls'}, isolates the page, and restores it on Escape`, async () => {
  const root = element(), body = element(), header = element(), main = element()
  const bench = element(['bench']), sibling = element(), button = element()
  sibling.inert = true // existing disabled content must remain disabled afterwards
  children(root, body)
  children(body, header, main)
  const panel = focusRoom ? element([focusRoom === 'lesson' ? 'video-lesson' : 'focus-room']) : bench
  const consent = element()
  if (focusRoom) children(panel, bench, consent)
  children(main, panel, sibling)
  bench.querySelector = (selector) => selector === 'canvas' ? {} : selector === '[data-fullscreen]' ? button : null
  const events = {}
  globalThis.document = {
    body, documentElement: { dataset: { lang: 'en' } },
    fullscreenEnabled: true,
    querySelectorAll: () => [bench],
    addEventListener: (type, fn) => { events[type] = fn },
  }
  globalThis.window = { matchMedia: () => ({ matches: false }), dispatchEvent() {} }
  let nativeCalls = 0
  bench.requestFullscreen = async () => { nativeCalls++ }
  initFullscreen()
  await button.events.click()
  assert.equal(nativeCalls, 0)
  assert.equal(panel.classList.contains('is-expanded'), true)
  assert.equal(body.classList.contains('instrument-open'), true)
  assert.equal(header.inert, true)
  assert.equal(consent.inert, false)
  assert.equal(button.attrs['aria-pressed'], 'true')
  assert.equal(button.focused, true)
  let prevented = false
  events.keydown({ key: 'Escape', preventDefault() { prevented = true } })
  assert.equal(prevented, true)
  assert.equal(panel.classList.contains('is-expanded'), false)
  assert.equal(body.classList.contains('instrument-open'), false)
  assert.equal(header.inert, false)
  assert.equal(sibling.inert, true)
  assert.equal(button.attrs['aria-pressed'], 'false')
})
