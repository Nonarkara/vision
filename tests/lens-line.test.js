// The home page's Objects lens, and the number helper it prints with.
//
//   node --test tests/lens-line.test.js
//
// The lens used to ask the network for exactly what it drew. On a quiet camera
// that meant zero candidates, and the page could only report an absence — which
// is honest and useless at the same time. These pin the arrangement that turned
// it into a lesson: the network is asked low, the visitor draws the line.

import { test } from 'node:test'
import assert from 'node:assert/strict'

globalThis.document = {
  documentElement: { dataset: { lang: 'en' } },
  // cv/draw.js builds one scratch canvas at import time; nothing here draws.
  createElement: () => ({ getContext: () => ({}) }),
}
const { DETECT_FLOOR, createLensState } = await import('../public/js/cv/lenses.js')
const { count } = await import('../public/js/core/i18n.js')

test('the network is asked below every line the two confidence sliders can reach', () => {
  // /learn chapter 07 goes down to 10%, / the home lens to 5%. If the network were
  // asked at or above either, dragging the slider down could never reveal
  // anything new — the exact dead end this replaced.
  assert.ok(DETECT_FLOOR <= 0.05, `floor ${DETECT_FLOOR} is above the home slider's 5%`)
  assert.ok(DETECT_FLOOR < 0.5, 'floor must be far below the 50% both pages open at')
})

test('the line opens where the page always said it did', () => {
  assert.equal(createLensState().minScore, 0.3)
})

test('a line at 90% still leaves candidates to argue about', () => {
  // The home slider tops out at 90; above that nothing could ever be drawn, which
  // would be a slider that promises a stricter test than the model can run.
  const state = createLensState()
  state.minScore = 0.9
  const candidates = [{ score: 0.12 }, { score: 0.44 }]
  assert.equal(candidates.filter((d) => d.score >= state.minScore).length, 0)
  assert.equal(candidates.filter((d) => d.score >= DETECT_FLOOR).length, candidates.length)
})

test('count reads as English, not as a template', () => {
  assert.equal(count(1, 'box'), '1 box')
  assert.equal(count(0, 'box'), '0 boxes')
  assert.equal(count(2, 'box'), '2 boxes')
  assert.equal(count(3, 'match'), '3 matches', 'English does not build every plural with an s')
  assert.equal(count(3, 'box', 'boxes the machine drew'), '3 boxes the machine drew')
  assert.equal(count(1200, 'grey box', 'grey boxes'), '1,200 grey boxes')
  assert.equal(count(1, 'moving region', 'moving regions'), '1 moving region')
})

test('count needs no plural form in Thai, and never prints one', () => {
  globalThis.document.documentElement.dataset.lang = 'th'
  try {
    assert.equal(count(1, 'กรอบ'), '1 กรอบ')
    assert.equal(count(9, 'กรอบ'), '9 กรอบ')
  } finally {
    globalThis.document.documentElement.dataset.lang = 'en'
  }
})