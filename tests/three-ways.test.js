import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { threeWayState } from '../public/js/train/three-ways.js'

// The room taught supervised, unsupervised and reinforcement one after another,
// and never showed them side by side. A reader could follow any one of them
// and still not know what the difference between the three was.
//
// These tests pin the comparison that fixes it: one picture asked of all
// three learners, three cards that each say what you give the machine and
// what it hands back, and the reinforcement learner answering with an action
// rather than a label.
//
// The words live in `public/js/train/three-ways.js`, which holds no DOM, so
// most of these are behavioural: the state is built and the answer is read.

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const html = read('public/train.html')
const js = read('public/js/train/video-lesson.js')
const ways = read('public/js/train/three-ways.js')
const css = read('public/css/pages/train.css')

// The house translator reaches for the document; node has none. English, so
// that every assertion below reads as the sentence a reader would see.
const en = (th, e) => e
const NAMES = ['Busy road', 'Quiet road']

// Two clusters of frames, far enough apart that the vote is never in doubt.
const busy = [[0, 0], [0.1, 0], [0, 0.1], [-0.1, 0]].map((x) => ({ x, y: 0 }))
const quiet = [[10, 10], [10.1, 10], [10, 10.1]].map((x) => ({ x, y: 1 }))
const labels = [...busy, ...quiet]
const groups = {
  centres: [[0, 0], [10, 10]],
  groups: [...busy, ...quiet].map((s) => s.y),
}
const ask = { x: [10, 10] }

/** A state, with the room's own defaults for anything the test does not care about. */
const state = (over = {}) =>
  threeWayState({
    labels,
    learned: true,
    groups,
    feedback: [
      { x: [0, 0], action: 0, reward: 1 },
      { x: [10, 10], action: 1, reward: 1 },
    ],
    rounds: 2,
    ask,
    names: NAMES,
    t: en,
    ...over,
  })

const card = (way) => {
  const m = html.match(new RegExp(`<article class="three-way" data-way="${way}">([\\s\\S]*?)</article>`))
  assert.ok(m, `the ${way} card must exist`)
  return m[1]
}
const th = (markup) => {
  const m = markup.match(/<span class="th"[^>]*>([\s\S]*?)<\/span>/)
  return m ? m[1].replace(/<[^>]+>/g, '').trim() : ''
}
const enText = (markup) => {
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
  for (const learner of ['classify(labels, ask.x)', 'groupOf(groups.centres, ask.x)', 'policy(feedback, ask.x, rounds)']) {
    assert.ok(ways.includes(learner), `the same frame must go to the learner that computes ${learner}`)
  }
})

test('the room wires the comparison through the module the tests can read', () => {
  // The words must live where they can be checked. If they drift back into
  // the page script, these pins stop being behavioural.
  assert.match(js, /import \{ threeWayState \} from '\.\/three-ways\.js\?v=/, 'the page must import the comparison')
  assert.match(js, /threeWayState\(\{\s*labels,\s*learned,\s*groups,\s*feedback,\s*rounds,\s*ask: lastAsk,\s*names,\s*t,/, 'and pass the room its own state')
  assert.doesNotMatch(js, /function threeWayState\(\)/, 'the comparison must not be written twice')
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
    assert.ok(enText(eyebrow[1]).length > 0, `the ${way} card must say it in English`)
    assert.ok(markup.includes('data-way-answer'), `the ${way} card must have an answer slot`)
    assert.ok(markup.includes('data-way-need'), `the ${way} card must have a note slot`)
  }
})

test('the three cards ask three different things of you', () => {
  const gives = ['supervised', 'unsupervised', 'reinforcement'].map((w) => enText(card(w).match(/three-way-eyebrow[^>]*>([\s\S]*?)<\/p>/)[1]))
  assert.ok(gives[0].includes('right answer'), 'supervised must ask you for the right answer')
  assert.ok(gives[1].includes('nothing'), 'unsupervised must ask you for nothing at all')
  assert.ok(gives[2].includes('score'), 'reinforcement must ask you for a score')
  assert.equal(new Set(gives).size, 3, 'the three cards must not say the same thing')
})

test('the reinforcement learner answers with an action, not a label', () => {
  // This is the difference the room never made: two of the three classify a
  // picture, and the third one acts. If it answered with a name it would be
  // the same kind of thing as the other two.
  const row = state().reinforcement
  assert.match(row.answer, /Stay quiet|Raise alert/, 'the answer must be an action')
  assert.doesNotMatch(row.answer, /Busy road|Quiet road|Group \d/, 'and never a label or a group name')
  assert.match(row.need, /an action, not a label/, 'the card must say the answer is an action, not a label')
})

test('the reinforcement learner answers even with nothing learned', () => {
  // It must pick straight away: a policy that waits to be sure has no
  // behaviour at all. The other two may say they do not know yet.
  const empty = state({
    labels: [],
    learned: false,
    groups: null,
    feedback: [],
    rounds: 0,
  })
  assert.match(empty.reinforcement.answer, /Stay quiet|Raise alert/, 'the reinforcement learner must be ready before it has learned anything')
  assert.equal(empty.supervised.answer, 'Does not know yet', 'the other two may say they do not know yet')
  assert.equal(empty.unsupervised.answer, 'Does not know yet', 'both of the other two')
})

test('the supervised card cannot answer before the learner has been taught', () => {
  // classify() answers from a single example. The room's own rule is three
  // pictures in each group and then Learn, and adding an example clears what
  // it had learned. A card that answered from one example would contradict
  // the lesson sitting right above it.
  const one = state({ labels: [{ x: [0, 0], y: 0 }], learned: false })
  assert.equal(one.supervised.answer, 'Does not know yet', 'one example is not a taught learner')
  const taught = state()
  assert.equal(taught.supervised.answer, 'Quiet road', 'once taught it answers in the word the reader named')
  assert.match(taught.supervised.need, /can still be wrong/, 'and it says the answer can still be wrong')
})

test('the supervised card stops asking for pictures the reader already gave', () => {
  // Enough examples are in but Learn has not been pressed. Saying "needs 3
  // pictures in each group" here would be false — the reader has them.
  const ready = state({ labels: [...busy, ...quiet], learned: false })
  assert.equal(ready.supervised.answer, 'Does not know yet')
  assert.match(ready.supervised.need, /press Learn from my answers/, 'the one thing left is the button')
  const short = state({ labels: [busy[0], busy[1], ...quiet], learned: false })
  assert.match(short.supervised.need, /needs 3 pictures in each group/, 'with too few it still asks for pictures')
})

test('the reinforcement card tells the truth about the scores it has', () => {
  // One rating and the card claimed "it has no scores yet" — the reader had
  // given one. And "using the rewards it collected" was true only once both
  // actions had been rated.
  const none = state({ feedback: [], rounds: 0 })
  assert.match(none.reinforcement.need, /no scores yet/, 'with nothing rated it has no scores')
  const one = state({ feedback: [{ x: [10, 10], action: 1, reward: 1 }], rounds: 1 })
  assert.doesNotMatch(one.reinforcement.need, /no scores yet/, 'one rating is a score')
  assert.match(one.reinforcement.need, /trying the action that has no score yet/, 'and it must try the action nobody rated')
  const both = state()
  assert.match(both.reinforcement.need, /using the rewards it collected/, 'both rated, it uses them')
  const exploring = state({ rounds: 4 })
  assert.match(exploring.reinforcement.need, /still tries the other action now and then/, 'and it still explores now and then')
})

test('the button does not move out from under the pointer when the picture appears', () => {
  const stage = html.match(/<div class="three-ways-stage">([\s\S]*?)<\/div>/)
  assert.ok(stage, 'the stage must exist')
  assert.ok(
    stage[1].indexOf('data-three-ask') < stage[1].indexOf('data-three-view'),
    'the button must come before the picture: if the picture appears above it, the button slides away under the pointer',
  )
})

test('the picture is never scaled up', () => {
  // The picture is 224 x 126 by construction. At 1024 the old width:100% rule
  // gave it 851 px of box — a stretch of 3.8x — and pushed the cards down.
  assert.match(css, /\.three-ways-stage canvas \{[^}]*width:\s*224px/, 'the picture keeps its own width')
  assert.match(css, /\.three-ways-stage canvas \{[^}]*max-width:\s*100%/, 'and never overflows a narrower column')
  // The property, not the tail of `max-width`.
  assert.doesNotMatch(css, /\.three-ways-stage canvas \{[^}]*[;{]\s*width:\s*100%/, 'it is not stretched to fill')
})

test('the payoff is reachable from the lesson that promises it', () => {
  assert.ok(html.includes('id="three-ways"'), 'the comparison must be a place the lesson can point at')
  assert.match(html, /<a class="lesson-jump" href="#three-ways">/, 'the lesson topline must link to it')
  assert.match(css, /\.lesson-jump \{/, 'and the link must wear the room\'s own ink')
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
