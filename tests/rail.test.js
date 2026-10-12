import { test } from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'

register(new URL('./strip-import-version.mjs', import.meta.url))

globalThis.document = {
  documentElement: { dataset: { lang: 'th' }, style: { setProperty() {} } },
  querySelectorAll: () => [],
  querySelector: () => null,
  addEventListener() {},
  dispatchEvent() {},
  body: {},
}
globalThis.window = { matchMedia: () => ({ matches: false }), dispatchEvent() {} }

const { roomIsClipped } = await import('../public/js/core/site.js')

test('a room that straddles the chevron is not shown as a half glyph', () => {
  assert.equal(roomIsClipped({ edge: 800, left: 760, right: 880, atEnd: false }), true)
})

test('a room wholly inside the rail is left where it is', () => {
  assert.equal(roomIsClipped({ edge: 800, left: 400, right: 520, atEnd: false }), false)
})

test('the last rooms stay visible once the rail is scrolled to the end', () => {
  assert.equal(roomIsClipped({ edge: 800, left: 760, right: 880, atEnd: true }), false)
})

test('a few pixels of padding past the chevron is not a cut word', () => {
  assert.equal(roomIsClipped({ edge: 800, left: 720, right: 803, atEnd: false }), false)
})

test('a room cut off the left edge is hidden as well', () => {
  assert.equal(roomIsClipped({ edge: 800, left: 40, right: 120, atEnd: true, start: 80 }), true)
})
