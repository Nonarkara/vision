// /learn became a path rather than a wall: every chapter ends with a button to
// the next one, the contents says which chapter you are reading, and progress
// is remembered. These are the arithmetic behind that, tested without a
// browser and without a camera.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ORDER, currentIndex, readSeen, rememberSeen, progressText, resumeAt } from '../public/js/learn/course.js'

const store = new Map()
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
}

test('the course is eight chapters, and the page says so in the same order', () => {
  assert.equal(ORDER.length, 8)
  assert.equal(new Set(ORDER).size, 8, 'a chapter listed twice would double-count progress')
})

test('above the first chapter, the first chapter is what you are reading', () => {
  // Read the page at the very top: nothing has passed the line yet, and a
  // reader must not be told they are nowhere.
  assert.equal(currentIndex([996, 1863, 2751, 3760, 4921, 5891, 6997, 9223], 900), 0)
})

test('a chapter becomes current when its top passes the reading line', () => {
  const tops = [996, 1863, 2751, 3760, 4921, 5891, 6997, 9223]
  // Scrolled so chapter 05 (edges) sits at the top of the screen: with a
  // reading line a third of the way down, chapter 05 is what is on it.
  const scrollY = 4747
  const line = scrollY + 720 * 0.35
  assert.equal(currentIndex(tops, line), 4)
})

test('the last chapter stays current all the way to the foot of the page', () => {
  const tops = [996, 1863, 2751, 3760, 4921, 5891, 6997, 9223]
  assert.equal(currentIndex(tops, 9223 + 4000), 7)
})

test('a chapter that starts below the reading line does not steal the marker', () => {
  // The reading line is a third of the way down the screen, not its top. A
  // chapter that begins below that line has only appeared at the bottom of the
  // view; it is not what anyone is reading yet, so the contents must keep
  // pointing at the chapter in front of them.
  const tops = [100, 900, 4000]
  assert.equal(currentIndex(tops, 320), 0, 'chapter 02 begins at 900, well below the line')
  assert.equal(currentIndex(tops, 1000), 1, 'once chapter 02 reaches the line it is the one being read')
})

test('a first-time visitor is told where to start, not congratulated on zero', () => {
  const [th, en] = progressText([], 8)
  assert.match(en, /Start at chapter 1/)
  assert.match(th, /บทที่ 1/)
})

test('progress is counted in chapters read, out of the chapters there are', () => {
  const [th, en] = progressText(['numbers', 'colour'], 8)
  assert.equal(en, '2 of 8 chapters read')
  assert.match(th, /2/)
})

test('a finished course points at the next room instead of the eighth chapter again', () => {
  const [th, en, zh] = progressText(ORDER, 8)
  assert.match(en, /All 8 chapters read/)
  assert.match(en, /next room/)
  assert.ok(th && zh)
})

test('returning is offered the chapter that was left, not the first one', () => {
  assert.equal(resumeAt(['numbers', 'colour']), 'threshold')
  assert.equal(resumeAt([]), null, 'a first visit has nothing to resume')
  assert.equal(resumeAt(ORDER), null, 'a finished course has nothing to resume either')
})

test('progress survives a reload', () => {
  rememberSeen(['numbers', 'colour'])
  assert.deepEqual(readSeen(), ['numbers', 'colour'])
})

test('the same chapter is never counted twice', () => {
  rememberSeen(['numbers', 'numbers', 'colour'])
  assert.deepEqual(readSeen(), ['numbers', 'colour'])
})

test('a chapter this page does not have cannot be counted as read', () => {
  // A stale entry from an older version of the page must not inflate progress.
  rememberSeen(['numbers', 'a-chapter-that-was-removed'])
  assert.deepEqual(readSeen(), ['numbers'])
})

test('a broken or hostile stored value is ignored rather than trusted', () => {
  store.set('vision_learn_seen_v1', '{not json')
  assert.deepEqual(readSeen(), [])
  store.set('vision_learn_seen_v1', '"a string, not a list"')
  assert.deepEqual(readSeen(), [])
})