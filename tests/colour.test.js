import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { createColourStore, validateAnswer, readBody, FEELINGS } from '../server/colour.js'
import { handler } from '../server/index.js'
import { assignments } from '../public/js/core/palette.js'

const tmp = (name) => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'colour-')), name)
const plates = assignments()
const LEGAL = plates.filter((p) => p.legible).map((p) => p.id)
const ILLEGAL = plates.filter((p) => !p.legible).map((p) => p.id)

test('a fresh store is empty, not broken', () => {
  const s = createColourStore({ file: tmp('a.json') })
  assert.equal(s.total, 0)
  assert.deepEqual(s.board(), [])
})

test('an answer is refused unless both values are on the list', () => {
  const good = validateAnswer({ assignment: LEGAL[0], feeling: 'calm' })
  assert.equal(good.ok, true)
  assert.equal(validateAnswer({ assignment: 'made-up', feeling: 'calm' }).ok, false)
  assert.equal(validateAnswer({ assignment: LEGAL[0], feeling: 'excellent' }).ok, false)
  assert.equal(validateAnswer({ assignment: 42, feeling: 'calm' }).ok, false)
  assert.equal(validateAnswer(null).ok, false)
})

test('extra fields are ignored, not stored — there is nowhere to put them', () => {
  const file = tmp('b.json')
  const s = createColourStore({ file })
  const verdict = validateAnswer({
    assignment: LEGAL[0], feeling: 'calm', name: 'Ada', email: 'a@b.c', ip: '1.2.3.4', note: 'free text',
  })
  s.record(verdict)
  const stored = JSON.parse(fs.readFileSync(file, 'utf8'))
  assert.deepEqual(Object.keys(stored).sort(), ['counts', 'shared', 'total'])
  assert.deepEqual(Object.keys(stored.counts[LEGAL[0]]), ['calm'])
  assert.ok(!JSON.stringify(stored).includes('Ada'))
  assert.ok(!JSON.stringify(stored).includes('1.2.3.4'))
})

test('an unknown value cannot create a new cell', () => {
  const s = createColourStore({ file: tmp('c.json') })
  assert.equal(s.record({ assignment: 'nope', feeling: 'calm' }), null)
  assert.equal(s.record({ assignment: LEGAL[0], feeling: 'nope' }), null)
  assert.equal(s.total, 0)
})

test('an illegible plate is still counted — refusing would lose the lesson', () => {
  const s = createColourStore({ file: tmp('d.json') })
  assert.ok(ILLEGAL.length > 0)
  assert.ok(s.record({ assignment: ILLEGAL[0], feeling: 'anxious' }))
  assert.equal(s.total, 1)
})

test('the summary counts up and sorts by count, ties in the fixed order', () => {
  const s = createColourStore({ file: tmp('e.json') })
  const id = LEGAL[0]
  s.record({ assignment: id, feeling: 'urgent' })
  s.record({ assignment: id, feeling: 'urgent' })
  s.record({ assignment: id, feeling: 'calm' })
  const sum = s.summary(id)
  assert.equal(sum.n, 3)
  assert.equal(sum.rows[0].id, 'urgent')
  assert.equal(sum.rows[0].count, 2)
  // A feeling with no answers must not appear at all.
  assert.equal(sum.rows.length, 2)
  assert.ok(!sum.rows.some((r) => r.count === 0))
})

test('counts survive a restart', () => {
  const file = tmp('f.json')
  const first = createColourStore({ file })
  first.record({ assignment: LEGAL[0], feeling: 'warm' })
  const second = createColourStore({ file })
  assert.equal(second.total, 1)
  assert.equal(second.summary(LEGAL[0]).rows[0].id, 'warm')
})

test('a hand-edited file cannot inject a key a request could not', () => {
  const file = tmp('g.json')
  const first = createColourStore({ file })
  first.record({ assignment: LEGAL[0], feeling: 'calm' })
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'))
  raw.counts['injected-plate'] = { calm: 99 }
  raw.counts[LEGAL[0]].hacked = 50
  fs.writeFileSync(file, JSON.stringify(raw))
  const second = createColourStore({ file })
  assert.equal(second.board().some((b) => b.assignment === 'injected-plate'), false)
  assert.equal(second.summary(LEGAL[0]).rows.some((r) => r.id === 'hacked'), false)
  assert.equal(second.total, 1)
})

test('the board is sorted by how many answers, and only answered plates appear', () => {
  const s = createColourStore({ file: tmp('h.json') })
  s.record({ assignment: LEGAL[1], feeling: 'calm' })
  s.record({ assignment: LEGAL[1], feeling: 'calm' })
  s.record({ assignment: LEGAL[2], feeling: 'cold' })
  const board = s.board()
  assert.equal(board.length, 2)
  assert.equal(board[0].assignment, LEGAL[1])
  assert.equal(board[0].n, 2)
})

test('the shared plate can be rolled, and a legible one is the default', () => {
  const s = createColourStore({ file: tmp('i.json') })
  const first = s.dealShared(false)
  assert.ok(s.legal.has(first.id))
  const any = s.dealShared(true)
  assert.ok(s.plates.some((p) => p.id === any.id))
})

test('the plate the server rolls is one the machine can read', async () => {
  // The page says the six plates the machine refuses are reachable only behind
  // an explicit button — never as a surprise. But the shared roll landed on a
  // visitor's screen on arrival, and it was rolling from all twenty-four, so
  // one visit in four put an unreadable plate in front of someone who never
  // asked for one. This rolls it eighteen times, which is under the write
  // limiter's burst and still enough to fail almost every time if the pool is
  // wrong.
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'colour-route-')), 'colour.json')
  const before = fs.existsSync(file) ? fs.readFileSync(file) : null
  const server = http.createServer(handler)
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  try {
    const base = `http://127.0.0.1:${server.address().port}`
    for (let i = 0; i < 18; i++) {
      const res = await fetch(base + '/api/colour/share', { method: 'POST' })
      assert.equal(res.status, 200)
      const data = await res.json()
      assert.ok(data.shared?.id, 'the server rolled no plate at all')
      assert.ok(LEGAL.includes(data.shared.id), `the server dealt ${data.shared.id}, which the machine cannot read`)
    }
  } finally {
    server.close()
    if (before) fs.writeFileSync(file, before)
  }
})

test('every feeling has Thai and English, and no two share an id', () => {
  const ids = new Set()
  for (const f of FEELINGS) {
    assert.ok(f.th && f.en, `feeling ${f.id} is missing a language`)
    assert.equal(ids.has(f.id), false)
    ids.add(f.id)
  }
})

/**
 * The two columns must actually be two languages. `anxious` shipped with
 * `en: 'กังวล'` — the English word was Thai — and nothing else noticed, because a
 * missing translation and a mistyped one look identical from the outside. These two
 * assertions fail differently for the two mistakes.
 */
test('the English column is Latin and the Thai column is Thai', () => {
  for (const f of FEELINGS) {
    assert.match(f.en, /^[a-z]+$/, `feeling ${f.id} has a non-Latin English word: ${f.en}`)
    assert.match(f.th, /[฀-๿]/, `feeling ${f.id} has no Thai in its Thai word: ${f.th}`)
  }
})

test('an over-large body is refused rather than buffered', async () => {
  const big = 'x'.repeat(5000)
  const req = (() => {
    const listeners = {}
    return {
      on(ev, fn) { listeners[ev] = fn },
      destroy() {},
      _fire: (ev) => listeners[ev]?.(),
      _data: (c) => listeners.data?.(c),
    }
  })()
  const promise = readBody(req, 512)
  req._data(Buffer.from(big))
  await assert.rejects(promise, /body too large/)
})

test('malformed JSON is a 400, not a crash', async () => {
  const req = (() => {
    const listeners = {}
    return {
      on(ev, fn) { listeners[ev] = fn },
      destroy() {},
      _fire: (ev) => listeners[ev]?.(),
      _data: (c) => listeners.data?.(c),
    }
  })()
  const promise = readBody(req, 512)
  req._data(Buffer.from('{not json'))
  req._fire('end')
  await assert.rejects(promise, /bad json/)
})