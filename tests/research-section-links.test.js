import { test } from 'node:test'
import assert from 'node:assert/strict'
import { revealSection } from '../public/js/research/section-links.js'

test('deep links reveal the optional catalogue before aligning its target', () => {
  const disclosure = { open: false, parentElement: { closest: () => null } }
  let aligned = false
  const target = { closest: () => disclosure, scrollIntoView() { assert.equal(disclosure.open, true); aligned = true } }
  revealSection({ getElementById: id => id === 'about' ? target : null }, '#about')
  assert.equal(aligned, true)
})
test('section links realign even when the target is not a history or learning panel', () => {
  let aligned = false
  revealSection({ getElementById: () => ({ closest: () => null, scrollIntoView() { aligned = true } }) }, '#learning-kinds')
  assert.equal(aligned, true)
  revealSection({ getElementById: () => null }, '#missing')
})
