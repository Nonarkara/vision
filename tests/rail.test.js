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

const { roomClipDelta } = await import('../public/js/core/site.js')

test('a room that straddles the chevron is pushed fully past it', () => {
  assert.equal(roomClipDelta({ edge: 800, left: 760, right: 880, atEnd: false }), 40)
})

test('a room wholly inside the rail is left where it is', () => {
  assert.equal(roomClipDelta({ edge: 800, left: 400, right: 520, atEnd: false }), 0)
})

test('the last rooms stay visible once the rail is scrolled to the end', () => {
  assert.equal(roomClipDelta({ edge: 800, left: 760, right: 880, atEnd: true }), 0)
})
