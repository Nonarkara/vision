// The Drive gate is a real check on labelled camera crops, and the Teach
// clip is two real public-camera sequences. These tests hold that contract
// without a browser.

import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { TEACH, GATE_TILES, LIBRARY_TILES, GATE_PLAIN_CAR, GATE_PLAIN_NONE, CAMERAS, FOOTAGE_OWNER } from '../public/js/footage/library.js'
import { makeChallenge, retryChallenge, check, SLIPS, TARGETS, readGate, writeGate, TILES, phrase, GATE_TEXT, taughtSentence } from '../public/js/drive/captcha.js'
import { nextLang } from '../public/js/core/i18n.js'

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
  for (const tile of LIBRARY_TILES) {
    assert.equal(ids.has(tile.id), false, `duplicate tile ${tile.id}`)
    ids.add(tile.id)
    assert.ok(CAMERAS[tile.camera], `${tile.id} names an unknown camera`)
    assert.equal(CAMERAS[tile.camera].owner, 'itic')
    for (const label of tile.labels) assert.ok(allowed.has(label), tile.id)
    const bytes = fs.statSync(publicFile(tile.src)).size
    assert.ok(bytes > 2000, `${tile.src} is too small to be a crop`)
  }
  for (const tile of GATE_TILES) assert.ok(ids.has(tile.id), tile.id)
  for (const { key } of TARGETS) {
    const n = GATE_TILES.filter((t) => t.labels.includes(key)).length
    const negatives = GATE_TILES.filter((t) => !t.labels.includes(key)).length
    assert.ok(n >= 3, `${key} needs at least three clear tiles, has ${n}`)
    assert.ok(negatives >= TILES - 2, `${key} needs negatives for a nine-tile grid, has ${negatives}`)
  }
})

test('the gate only asks for what a person can see in a night crop', () => {
  assert.deepEqual(TARGETS.map((t) => t.key), ['car'])
})

test('the hand-picked grouping and the labels agree', () => {
  // A tile was once grouped by eye as "plainly no car" while its label still
  // said car — and the label is the answer key, so the gate demanded a click a
  // person could not see a reason for. The grouping is a human judgement about
  // a photograph; this test is the part a machine can hold: whichever way the
  // eye groups a tile, the label must agree, or the tile belongs in neither
  // list until someone looks again.
  const byId = new Map(LIBRARY_TILES.map((t) => [t.id, t]))
  assert.equal(GATE_PLAIN_CAR.length + GATE_PLAIN_NONE.length, GATE_TILES.length, 'a gate tile outside both lists would be dealt without anyone vouching for it')
  for (const id of GATE_PLAIN_CAR) {
    assert.ok(byId.has(id), `${id} is grouped as plainly-a-car but is not in the library`)
    assert.ok(byId.get(id).labels.includes('car'), `${id} is grouped as plainly-a-car but its label does not say car`)
  }
  for (const id of GATE_PLAIN_NONE) {
    assert.ok(byId.has(id), `${id} is grouped as plainly-no-car but is not in the library`)
    assert.equal(byId.get(id).labels.includes('car'), false, `${id} is grouped as plainly-no-car but its label says car — the gate would demand a click nobody can see a reason for`)
  }
  assert.equal(new Set([...GATE_PLAIN_CAR, ...GATE_PLAIN_NONE]).size, GATE_PLAIN_CAR.length + GATE_PLAIN_NONE.length, 'a tile listed in both groups would be both answer and decoy')
})

test('one slip passes, two do not, and a blank or random guess does not', () => {
  assert.equal(SLIPS, 1)
  for (let seed = 1; seed < 400; seed++) {
    const c = makeChallenge(seed, 0)
    assert.ok(c.answer.length >= 2 && c.answer.length <= 6)
    assert.equal(check(c, c.answer), true)
    assert.equal(check(c, []), false)
    const spares = [...Array(TILES).keys()].filter((n) => !c.answer.includes(n))
    assert.equal(check(c, c.answer.slice(1)), true, 'one missed car still passes')
    assert.equal(check(c, [...c.answer, spares[0]]), true, 'one extra square still passes')
    assert.equal(check(c, c.answer.slice(2)), false, 'two missed cars do not pass')
    assert.equal(check(c, [...c.answer, spares[0], spares[1]]), false, 'two extra squares do not pass')
    assert.equal(check(c, [...Array(TILES).keys()]), false, 'select-all does not pass')
    for (const t of c.tiles) assert.equal(t.has, GATE_TILES.find((g) => g.id === t.id).labels.includes('car'))
  }
  const first = makeChallenge(11, 0)
  const again = retryChallenge(first)
  assert.notEqual(again.tiles.map((t) => t.id).join('|'), first.tiles.map((t) => t.id).join('|'))
})

const HAN = /\p{Script=Han}/u

function classes(html, name) {
  return (html.match(new RegExp(`class="${name}"`, 'g')) ?? []).length
}

test('new Teach, Drive-gate, reveal and credit lines are Thai, English and Simplified Chinese', () => {
  const drive = fs.readFileSync(path.join(root, 'public/drive.html'), 'utf8')
  const train = fs.readFileSync(path.join(root, 'public/train.html'), 'utf8')
  const system = fs.readFileSync(path.join(root, 'public/system.html'), 'utf8')
  const lesson = fs.readFileSync(path.join(root, 'public/js/train/video-lesson.js'), 'utf8')
  const gate = drive.slice(drive.indexOf('<section class="gate"'), drive.indexOf('<section class="drive"'))
  assert.ok(classes(gate, 'th') > 0)
  assert.equal(classes(gate, 'th'), classes(gate, 'en'))
  assert.equal(classes(gate, 'en'), classes(gate, 'zh'))
  for (const span of gate.matchAll(/<span class="zh"[^>]*>([\s\S]*?)<\/span>/g)) {
    assert.match(span[1], HAN, span[1])
  }
  assert.match(drive, /无障碍/)
  assert.match(train, /拉玛四路/)
  assert.match(train, /练习视频是真实的公共摄像头画面/)
  assert.match(system, /泰国智能交通信息中心基金会/)
  assert.match(lesson, /公共摄像头画面/)
  for (const target of TARGETS) {
    assert.equal(target.label.length, 3)
    assert.match(phrase('zh', target.label), HAN)
    assert.notEqual(phrase('zh', target.label), phrase('en', target.label))
  }
  assert.match(phrase('zh', GATE_TEXT.miss), /还不对/)
  assert.match(phrase('th', GATE_TEXT.miss), /ยังไม่ตรง/)
  assert.match(phrase('en', GATE_TEXT.ask), /Select every tile/)
  assert.match(taughtSentence('zh', { picks: 2, right: 1, missed: 1, extra: 0 }), /你的 9 个标签/)
  assert.equal(nextLang('th'), 'en')
  assert.equal(nextLang('en'), 'zh')
  assert.equal(nextLang('zh'), 'th')
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

// ── The way out ────────────────────────────────────────────────────────────
// A gate that cannot be opened is a wall. This one asks a question a person
// might simply not be able to answer — small dark crops, a crowded phone, eyes
// that are not what they were — and locking a CLASSROOM behind that would be
// the exact opposite of what this site argues.

test('the gate offers a way past it, and the way out is reachable while shut', () => {
  const html = readFileSync(new URL('../public/drive.html', import.meta.url), 'utf8')
  // Outside .gate-replay, which is display:none until the gate has been passed.
  // Inside it, the skip would be invisible precisely when someone needs it.
  const gateOut = html.indexOf('class="gate-out"')
  assert.ok(gateOut > -1, 'there is no .gate-out block on the page')
  const replay = html.indexOf('class="gate-replay"')
  assert.ok(replay > -1 && replay < gateOut, 'the way out must come after, not inside, .gate-replay')
  assert.ok(html.includes('data-gate-skip'), 'there is no control that opens the room without the question')

  const css = readFileSync(new URL('../public/css/pages/drive.css', import.meta.url), 'utf8')
  // Matched loosely on purpose: the way out is hidden by a keyed rule, and the
  // key may be either the collapse or the permanent state. What this must not
  // allow is the way out surviving entry.
  assert.match(
    css,
    /\.gate\[data-(open|through)="true"\][^{]*\.gate-out\s*\{[^}]*display:\s*none/,
    'the way out should disappear once you are through',
  )
  // The BASE rule must not hide it. Matching a bare `.gate-out { … display:none }`
  // would also match inside the data-open rule above, which hides it only after
  // you are through — so look at the base rule on its own.
  const baseRule = /\.gate-out\s*\{([^}]*)\}/.exec(css)
  assert.ok(baseRule, '.gate-out has no rule of its own')
  assert.doesNotMatch(baseRule[1], /display:\s*none/, '.gate-out is hidden while the gate is shut')
})

test('the way out is offered in all three languages, and says it is not a lock', () => {
  const html = readFileSync(new URL('../public/drive.html', import.meta.url), 'utf8')
  for (const lang of ['th', 'en', 'zh-Hans']) {
    const i = html.indexOf('data-gate-skip')
    const block = html.slice(i, i + 400)
    assert.ok(block.includes(`lang="${lang}"`), `the skip button has no ${lang} label`)
  }
  const note = html.slice(html.indexOf('gate-skip-note'), html.indexOf('gate-skip-note') + 900)
  assert.match(note, /not a lock/, 'the page does not say plainly that this is not a lock')
  // It writes one flag to sessionStorage when you get through, so "it stores
  // nothing" was false. The claim now names the one thing that is kept.
  assert.doesNotMatch(note, /stores nothing|保存任何东西/, 'the note claims nothing is stored, but a session flag is written')
  assert.match(note, /keeps no record of the squares/, 'the note does not say that the picks are not kept')
  assert.match(note, /this tab&rsquo;s note that you have been through/, 'the note does not say what IS kept, only what is not')
})

test('the way out stays gone once you are through, even after asking for another challenge', () => {
  // "Try a new challenge" deliberately removes data-open so the grid can come
  // back. The way out answered to data-open alone, so it came back too — as a
  // button that opens a room which is already open, and therefore does nothing
  // when pressed. data-through is the state that cannot be undone.
  const css = readFileSync(new URL('../public/css/pages/drive.css', import.meta.url), 'utf8')
  assert.match(
    css,
    /\.gate\[data-through="true"\]\s*\.gate-out\s*\{\s*display:\s*none/,
    'the way out must be hidden by the permanent state, not only by the collapse',
  )
  const drive = readFileSync(new URL('../public/js/pages/drive.js', import.meta.url), 'utf8')
  const openRoom = /function openRoom\(\)[\s\S]*?\n}/.exec(drive)?.[0] ?? ''
  assert.match(openRoom, /setAttribute\('data-through', 'true'\)/, 'nothing sets the permanent state, so the way out returns after a replay')
  // …and the replay must not clear it.
  const replay = /replay\?\.addEventListener\('click'[\s\S]*?\n\}\)/.exec(drive)?.[0] ?? ''
  assert.doesNotMatch(replay, /removeAttribute\('data-through'\)/, 'replay must not take back the permanent state')
})

test('the skip button names the note that explains it', () => {
  // A screen reader that lands on the button has to be able to hear why it is
  // there, without hunting for the paragraph under it.
  const html = readFileSync(new URL('../public/drive.html', import.meta.url), 'utf8')
  assert.match(html, /data-gate-skip aria-describedby="gate-skip-note"/)
  assert.match(html, /id="gate-skip-note"/)
})
