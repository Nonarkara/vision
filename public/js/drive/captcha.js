// The Drive gate: nine real camera crops, and a known answer.
//
// A visitor selects every tile that contains a car. Only crops where the
// answer is obvious are dealt (see GATE_PLAIN_CAR and GATE_PLAIN_NONE in
// footage/library.js), one slip is forgiven, and a miss keeps the same grid
// so people can fix their picks. The crops are public iTIC frames (see
// footage/library.js). The answer is the label checked against that crop,
// not a drawing and not a guess the page invents at click time.
//
// This is the job supervised labelling actually is. reCAPTCHA put the same
// job in front of people so the clicks could train vision models. The
// reveal on the page says so. The labels stay in this tab.

import { rng } from './rand.js?v=1.17.5'
import { GATE_TILES } from '../footage/library.js?v=1.17.5'

export const GRID = 3
export const TILES = GRID * GRID

/** What a challenge can ask you to find. Thai names match ml/labels.js.
 *  label is [Thai, English, Simplified Chinese]. */
export const TARGETS = [
  { key: 'car', coco: 3, label: ['รถยนต์', 'a car', '汽车'] },
]

/** Gate sentences that are built in script, not in the HTML. */
export const GATE_TEXT = {
  ask: ['เลือกทุกช่องที่มี', 'Select every tile with ', '选出每一格含有'],
  miss: [
    'ยังไม่ตรง ลองดูอีกครั้ง ช่องที่มีรถยนต์ให้เลือก ช่องที่ไม่มีให้เว้นไว้ หรือกด “ทำแบบทดสอบใหม่”',
    'Not quite. Look again: select the squares with a car and leave the rest, or press “Try a new challenge”.',
    '还不对。再看一次：选出有汽车的格子，其余留空，或按“再做一题”。',
  ],
}

/** Index 0 Thai, 1 English, 2 Simplified Chinese. */
export function phrase(lang, triple) {
  if (lang === 'en') return triple[1]
  if (lang === 'zh') return triple[2]
  return triple[0]
}

export function taughtSentence(lang, { picks, right, missed, extra }) {
  return phrase(lang, [
    `จากฉลาก 9 ช่องของคุณ ในตารางที่มันไม่เคยเห็น มันเลือก ${picks} ช่อง — ถูก ${right} · พลาด ${missed} · เกิน ${extra}`,
    `Your 9 labels taught it. On a grid it had never seen it picked ${picks} squares — ${right} right · ${missed} missed · ${extra} wrong.`,
    `你的 9 个标签教会了它。在它没见过的格子图上，它选了 ${picks} 格——对 ${right} · 漏 ${missed} · 多 ${extra}。`,
  ])
}

export const GATE_KEY = 'vision_drive_gate_v1'

function shuffle(list, rand) {
  const bag = list.slice()
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[bag[i], bag[j]] = [bag[j], bag[i]]
  }
  return bag
}

/**
 * One challenge. Deterministic for a seed, so a reload of the same seed is
 * the same grid, and a retry passes a new seed to get a new one.
 * Between two and six of the nine tiles contain the asked-for class.
 */
export function makeChallenge(seed = 1, targetIndex = 0) {
  const r = rng((seed >>> 0) * 7919 + 13)
  const target = TARGETS[((targetIndex % TARGETS.length) + TARGETS.length) % TARGETS.length]
  const yes = GATE_TILES.filter((t) => t.labels.includes(target.key))
  const no = GATE_TILES.filter((t) => !t.labels.includes(target.key))
  const count = 2 + Math.floor(r() * Math.min(5, yes.length - 1))
  const picked = [...shuffle(yes, r).slice(0, count), ...shuffle(no, r).slice(0, TILES - count)]
  const tiles = shuffle(picked, r).map((tile, i) => ({
    slot: i,
    id: tile.id,
    src: tile.src,
    camera: tile.camera,
    labels: tile.labels,
    has: tile.labels.includes(target.key),
  }))
  return {
    seed: seed >>> 0,
    target,
    targetIndex: ((targetIndex % TARGETS.length) + TARGETS.length) % TARGETS.length,
    tiles,
    answer: tiles.filter((t) => t.has).map((t) => t.slot),
  }
}

/** A failed check deals again. The new grid is not the one just missed. */
export function retryChallenge(previous, step = 1) {
  let seed = ((previous?.seed ?? 1) + step * 104729) >>> 0
  let next = makeChallenge(seed, previous?.targetIndex ?? 0)
  const same = (c) => c.tiles.map((t) => t.id).join('|')
  let guard = 0
  while (previous && same(next) === same(previous) && guard < 8) {
    seed = (seed + 7919) >>> 0
    next = makeChallenge(seed, previous.targetIndex ?? 0)
    guard++
  }
  return next
}

/** How many slips (a missed car or an extra square) still pass. */
export const SLIPS = 1

/** Did the visitor pick the right tiles? At least one car, at most one slip. */
export function check(challenge, picked) {
  const s = score(challenge, picked)
  return s.right > 0 && s.missed + s.extra <= SLIPS
}

/** How many were right and how many were missed. */
export function score(challenge, picked) {
  const got = new Set(picked)
  const right = challenge.answer.filter((s) => got.has(s)).length
  return { right, missed: challenge.answer.length - right, extra: [...got].filter((s) => !challenge.answer.includes(s)).length }
}

/** 'passed' waits on the reveal. 'entered' has gone through to Drive. */
export function readGate(storage) {
  try { return storage?.getItem(GATE_KEY) || '' } catch { return '' }
}

export function writeGate(storage, value) {
  try { storage?.setItem(GATE_KEY, value) } catch { /* private mode: this tab only, and even that can refuse */ }
}
