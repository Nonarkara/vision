// The Drive gate is a real check on labelled camera crops, and the Teach
// clip is two real public-camera sequences. These tests hold that contract
// without a browser.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { TEACH, GATE_TILES, CAMERAS, FOOTAGE_OWNER } from '../public/js/footage/library.js'
import { makeChallenge, retryChallenge, check, TARGETS, readGate, writeGate, TILES } from '../public/js/drive/captcha.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const publicFile = (url) => path.join(root, 'public', url.replace(/^\//, ''))

test('teach scenes are real, distinct public-camera sequences', () => {
  assert.equal(FOOTAGE_OWNER.id, 'itic')
  assert.ok(TEACH.busy.frames.length >= 6)
  assert.ok(TEACH.quiet.frames.length >= 6)
  assert.equal(TEACH.busy.camera.owner, 'itic')
  assert.equal(TEACH.quiet.camera.owner, 'itic')
  assert.notEqual(TEACH.busy.camera.id, TEACH.quiet.camera.id)
  const busy = new Set(TEACH.busy.frames)
  for (const file of TEACH.quiet.frames) assert.equal(busy.has(file), false)
  for (const file of [...TEACH.busy.frames, ...TEACH.quiet.frames]) {
    const bytes = fs.statSync(publicFile(file)).size
    assert.ok(bytes > 8000, `${file} is too small to be a camera frame`)
  }
})

test('every gate tile is a real crop with a known label', () => {
  const allowed = new Set(['car', 'motorcycle', 'person'])
  const ids = new Set()
  for (const tile of GATE_TILES) {
    assert.equal(ids.has(tile.id), false, `duplicate tile ${tile.id}`)
    ids.add(tile.id)
    assert.ok(CAMERAS[tile.camera], `${tile.id} names an unknown camera`)
    assert.equal(CAMERAS[tile.camera].owner, 'itic')
    for (const label of tile.labels) assert.ok(allowed.has(label), tile.id)
    const bytes = fs.statSync(publicFile(tile.src)).size
    assert.ok(bytes > 2000, `${tile.src} is too small to be a crop`)
  }
  for (const key of allowed) {
    const n = GATE_TILES.filter((t) => t.labels.includes(key)).length
    const negatives = GATE_TILES.filter((t) => !t.labels.includes(key)).length
    assert.ok(n >= 2, `${key} needs at least two tiles, has ${n}`)
    assert.ok(negatives >= TILES - 2, `${key} needs negatives for a nine-tile grid, has ${negatives}`)
  }
})

test('a wrong answer is not a pass, and the retry is a new grid of the same class', () => {
  for (let index = 0; index < TARGETS.length; index++) {
    const first = makeChallenge(11 + index, index)
    assert.equal(check(first, first.answer), true)
    const wrong = first.answer.slice(0, Math.max(0, first.answer.length - 1))
    if (wrong.length !== first.answer.length) assert.equal(check(first, wrong), false)
    const spare = [...Array(TILES).keys()].find((n) => !first.answer.includes(n))
    assert.equal(check(first, [...first.answer, spare]), false)
    const again = retryChallenge(first)
    assert.equal(again.target.key, first.target.key)
    assert.notEqual(again.tiles.map((t) => t.id).join('|'), first.tiles.map((t) => t.id).join('|'))
    assert.equal(check(again, again.answer), true)
    const marked = again.tiles.filter((t) => t.has).map((t) => t.id)
    for (const id of marked) {
      const tile = GATE_TILES.find((t) => t.id === id)
      assert.ok(tile.labels.includes(again.target.key))
    }
  }
})

test('passing is remembered in the session store and is not remembered before that', () => {
  const mem = new Map()
  const storage = {
    getItem: (key) => (mem.has(key) ? mem.get(key) : null),
    setItem: (key, value) => mem.set(key, value),
  }
  assert.equal(readGate(storage), '')
  writeGate(storage, 'passed')
  assert.equal(readGate(storage), 'passed')
  writeGate(storage, 'entered')
  assert.equal(readGate(storage), 'entered')
  assert.equal(readGate({ getItem() { throw new Error('blocked') } }), '')
})
