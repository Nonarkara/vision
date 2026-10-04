// The room's memory: your classes and their examples. It is a plain array in
// this tab's RAM and nothing else — no localStorage, no upload, no server.
// Reload the page and it is gone. That is a feature, and the page says so.
//
// Every change replaces the array rather than editing it in place, so any
// part of the page holding an old copy (a judge run, a training loop) keeps a
// consistent picture of what it started with.

export const MIN_CLASSES = 2
export const MAX_CLASSES = 4
export const MAX_PER_CLASS = 100
// A shape per class, so the map and the lists never rely on colour alone.
export const GLYPHS = ['●', '■', '▲', '✕']

// Presets. The first group suits your own camera, the second suits roads.
// There is deliberately no "me / not me": this site does not teach anyone to
// recognise a person. "Someone there / nobody" asks only whether a person is
// in view.
export const PRESETS = [
  { id: 'ab', group: 'mine', names: [['ก', 'A'], ['ข', 'B']] },
  { id: 'hand', group: 'mine', names: [['ยกมือ', 'Hand up'], ['มือลง', 'Hand down']] },
  { id: 'cup', group: 'mine', names: [['มีแก้ว', 'Cup'], ['ไม่มีแก้ว', 'No cup']] },
  { id: 'someone', group: 'mine', names: [['มีคนอยู่', 'Someone there'], ['ไม่มีใคร', 'Nobody']] },
  { id: 'rps', group: 'mine', names: [['ค้อน', 'Rock'], ['กระดาษ', 'Paper'], ['กรรไกร', 'Scissors']] },
  { id: 'road', group: 'public', names: [['รถแน่น', 'Busy road'], ['ถนนโล่ง', 'Empty road']] },
  { id: 'wet', group: 'public', names: [['ฝนตก ถนนเปียก', 'Rain, wet road'], ['ถนนแห้ง', 'Dry road']] },
  { id: 'daynight', group: 'public', names: [['กลางวัน', 'Day'], ['กลางคืน', 'Night']] },
]

const EXTRA_NAMES = [['ค', 'C'], ['ง', 'D']]

let classes = []
let version = 0
let nextKey = 1
let nextSample = 1
const listeners = new Set()

function makeClass([th, en]) {
  return { key: nextKey++, th, en, custom: null, samples: [] }
}

/** kind: 'structure' (classes added/removed/replaced) · 'names' · 'samples' */
function commit(next, kind) {
  classes = next
  version++
  for (const fn of listeners) fn(kind)
}

export const getClasses = () => classes
export const getVersion = () => version
export const onChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn) }

export function nameOf(c, l) {
  if (c.custom) return c.custom
  return l === 'en' ? c.en : c.th
}

export function hasSamples() {
  return classes.some((c) => c.samples.length)
}

export function applyPreset(id) {
  const p = PRESETS.find((x) => x.id === id) ?? PRESETS[0]
  commit(p.names.map(makeClass), 'structure')
}

/** Replace the classes with named ones (from an imported file). Keeps examples if the count matches. */
export function setNames(names) {
  const keep = names.length === classes.length
  commit(names.map((pair, i) => ({ ...makeClass(pair), samples: keep ? classes[i].samples : [] })), 'structure')
}

export function addClass() {
  if (classes.length >= MAX_CLASSES) return
  const pair = EXTRA_NAMES[classes.length - 2] ?? ['?', '?']
  commit([...classes, makeClass(pair)], 'structure')
}

export function removeClass(key) {
  if (classes.length <= MIN_CLASSES) return
  commit(classes.filter((c) => c.key !== key), 'structure')
}

export function rename(key, text) {
  const custom = text.trim().slice(0, 32) || null
  commit(classes.map((c) => (c.key === key ? { ...c, custom } : c)), 'names')
}

export function isFull(key) {
  return (classes.find((c) => c.key === key)?.samples.length ?? 0) >= MAX_PER_CLASS
}

/** Add one example { x: normalised embedding, thumb: canvas }. False if the class is gone or full. */
export function addSample(key, { x, thumb }) {
  const c = classes.find((k) => k.key === key)
  if (!c || c.samples.length >= MAX_PER_CLASS) return false
  const sample = { id: nextSample++, x, thumb }
  commit(classes.map((k) => (k === c ? { ...k, samples: [...k.samples, sample] } : k)), 'samples')
  return true
}

export function removeSample(key, id) {
  commit(classes.map((c) => (c.key === key ? { ...c, samples: c.samples.filter((s) => s.id !== id) } : c)), 'samples')
}

export function clearClass(key) {
  commit(classes.map((c) => (c.key === key ? { ...c, samples: [] } : c)), 'samples')
}

/** Everything the learners need, flattened: [{ x, y }] with y the class index. */
export function trainingSet() {
  return classes.flatMap((c, y) => c.samples.map((s) => ({ x: s.x, y })))
}

/** How many classes have at least one example. */
export function filledClasses() {
  return classes.filter((c) => c.samples.length).length
}

export function allFilled() {
  return classes.every((c) => c.samples.length)
}
