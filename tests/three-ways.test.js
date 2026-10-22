import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// The room taught supervised, unsupervised and reinforcement one after another,
// and never showed them side by side. A reader could follow any one of them
// and still not know what the difference between the three was.
//
// These tests pin the comparison that fixes it: one picture asked of all
// three learners, three cards that each say what you give the machine and
// what it hands back, and the reinforcement learner answering with an action
// rather than a label.

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const html = read('public/train.html')
const js = read('public/js/train/video-lesson.js')
const css = read('public/css/pages/train.css')

const card = (way) => {
  const m = html.match(new RegExp(`<article class="three-way" data-way="${way}">([\\s\\S]*?)</article>`))
  assert.ok(m, `the ${way} card must exist`)
  return m[1]
}
const th = (markup) => {
  const m = markup.match(/<span class="th"[^>]*>([\s\S]*?)<\/span>/)
  return m ? m[1].replace(/<[^>]+>/g, '').trim() : ''
}
const en = (markup) => {
  const m = markup.match(/<span class="en"[^>]*>([\s\S]*?)<\/span>/)
  return m ? m[1].replace(/<[^>]+>/g, '').trim() : ''
}

test('the room asks all three learners the same picture', () => {
  assert.ok(html.includes('class="three-ways"'), 'the comparison must exist')
  assert.ok(html.includes('data-three-ask'), 'there must be a way to ask')
  // One capture, one frame, all three answers: the whole point is that the
  // picture is held constant so only the kind of answer differs.
  assert.match(js, /const sample = await read\(\)/, 'the ask must capture one frame')
  assert.match(js, /lastAsk = sample/, 'the captured frame must be kept')
  for (const learner of ['classify(labels, lastAsk.x)', 'groupOf(groups.centres, lastAsk.x)', 'policy(feedback, lastAsk.x, rounds)']) {
    assert.ok(js.includes(learner), `the same frame must go to the learner that computes ${learner}`)
  }
})

test('there is one card per learning method, and they are the room\'s three', () => {
  const cards = [...html.matchAll(/<article class="three-way" data-way="([a-z]+)">/g)].map((m) => m[1])
  assert.deepEqual(cards, ['supervised', 'unsupervised', 'reinforcement'])
  const buttons = [...html.matchAll(/data-method="([a-z]+)"/g)].map((m) => m[1])
  assert.deepEqual(buttons, cards, 'the cards and the method buttons must be the same three methods')
})

test('each card says what you give it and what it answers, in both languages', () => {
  for (const way of ['supervised', 'unsupervised', 'reinforcement']) {
    const markup = card(way)
    const eyebrow = markup.match(/three-way-eyebrow[^>]*>([\s\S]*?)<\/p>/)
    assert.ok(eyebrow, `the ${way} card must state what you give it`)
    assert.ok(th(eyebrow[1]).length > 0, `the ${way} card must say it in Thai`)
    assert.ok(en(eyebrow[1]).length > 0, `the ${way} card must say it in English`)
    assert.ok(markup.includes('data-way-answer'), `the ${way} card must have an answer slot`)
    assert.ok(markup.includes('data-way-need'), `the ${way} card must have a note slot`)
  }
})

test('the three cards ask three different things of you', () => {
  const gives = ['supervised', 'unsupervised', 'reinforcement'].map((w) => en(card(w).match(/three-way-eyebrow[^>]*>([\s\S]*?)<\/p>/)[1]))
  assert.ok(gives[0].includes('right answer'), 'supervised must ask you for the right answer')
  assert.ok(gives[1].includes('nothing'), 'unsupervised must ask you for nothing at all')
  assert.ok(gives[2].includes('score'), 'reinforcement must ask you for a score')
  assert.equal(new Set(gives).size, 3, 'the three cards must not say the same thing')
})

test('the reinforcement learner answers with an action, not a label', () => {
  // This is the difference the room never made: two of the three classify a
  // picture, and the third one acts. If it answered with a name it would be
  // the same kind of thing as the other two.
  assert.ok(js.includes("rl.action ? t('เงียบ', 'Stay quiet') : t('แจ้งเตือน', 'Raise alert')"), 'the reinforcement answer must be an action')
  assert.ok(js.includes('ตอบด้วยการกระทำ ไม่ใช่คำตอบ'), 'the card must say the answer is an action, not a label')
  assert.ok(js.includes('Answers with an action, not a label'), 'and in English too')
})

test('the reinforcement learner answers even with nothing learned', () => {
  // It must pick straight away: a policy that waits to be sure has no
  // behaviour at all. The other two may say they do not know yet.
  assert.ok(js.includes("answer: t('ยังไม่รู้', 'Does not know yet')"), 'the other two may say they do not know yet')
  assert.ok(js.includes("answer: t('พร้อมเลย', 'Ready right away')"), 'the reinforcement learner must be ready before it has learned anything')
})

test('the comparison is the room\'s own styling, not a new language', () => {
  assert.ok(css.includes('.three-way {'), 'the cards must be styled')
  assert.ok(css.includes('.three-way-answer {'), 'the answer must be styled')
  // The answer is what the machine reported, so it wears the machine's face.
  assert.match(css, /\.three-way-answer \{[^}]*font-family:\s*var\(--mono\)/, 'the answer must be set in the mono face')
  // A card is a filled field, and it is as wide as the column it sits in —
  // the three cards are a comparison table, so equal columns are the point.
  assert.match(css, /\.three-ways-cards \{[^}]*repeat\(3, minmax\(0,1fr\)\)/, 'three equal cards')
})
