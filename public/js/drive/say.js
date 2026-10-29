// What each car tells you, in both languages: what it is doing, why, and
// what it can see. Pure strings — the page decides where they go.

import { sightRange, FOV } from './perceive.js?v=1.24.2'
import { ITEMS } from './street.js?v=1.24.2'
import { wrap } from './track.js?v=1.24.2'

export const STYLE_NAME = {
  careful: ['ระวัง', 'Careful', '谨慎'],
  normal: ['ปกติ', 'Normal', '正常'],
  hasty: ['ใจร้อน', 'Hasty', '急躁'],
}

const ACTION = {
  waiting: ['หยุดรอ', 'Waiting', '等待'],
  braking_hard: ['เบรกแรง', 'Braking hard', '急刹车'],
  slowing: ['ชะลอ', 'Slowing', '减速'],
  speeding_up: ['เร่ง', 'Speeding up', '加速'],
  cruising: ['วิ่งต่อ', 'Cruising', '继续行驶'],
  capped: ['คุมความเร็ว', 'Keeping its speed down', '限制车速'],
  watching: ['เฝ้าดู', 'Watching', '留意'],
}

/** Reasons that cap speed rather than demand a stop. */
const CAPS = new Set(['curve', 'short_sight', 'dog_roadside'])

const REASON = {
  clear: ['ทางโล่ง', 'the road is clear', '道路畅通'],
  curve: ['มีทางโค้งข้างหน้า', 'a bend is coming', '前方有弯道'],
  short_sight: ['มองเห็นได้แค่ {R} ม. จึงขับช้าพอจะหยุดทันในระยะนั้น', 'it can only see {R} m, so it keeps to a speed it can stop within', '只能看见 {R} 米，所以把速度保持在这个距离内能够停下'],
  light_red: ['ไฟแดงข้างหน้า', 'red light ahead', '前方红灯'],
  light_amber: ['ไฟเหลือง และยังหยุดทัน', 'amber light, and it can still stop in time', '黄灯，而且还能及时停下'],
  person_waiting: ['มีคนรอข้ามทางม้าลาย ให้คนไปก่อน', 'someone is waiting at the zebra — people go first', '有人在斑马线旁等待，行人优先'],
  person_in_lane: ['มีคนอยู่บนเลนข้างหน้า', 'a person is in its lane', '车道前方有人'],
  person_will_cross: ['คนกำลังจะเดินเข้ามาในเลน', 'a person is about to walk into its lane', '有人正要走进车道'],
  dog_in_lane: ['มีสุนัขอยู่บนเลน', 'a dog is in its lane', '车道上有狗'],
  dog_will_cross: ['สุนัขกำลังจะวิ่งตัดหน้า', 'a dog is about to run across', '狗正要冲过车道'],
  dog_roadside: ['มีสุนัขข้างทาง อาจวิ่งออกมา', 'a dog by the road might run out', '路边有狗，可能会跑出来'],
  cat_in_lane: ['มีบางอย่างบนเลน — แมว? ไม่แน่ใจ แต่เบรกไว้ก่อน', 'something is in its lane — a cat? Not sure, but it brakes anyway', '车道上有东西——猫？不确定，但先刹车'],
  cat_will_cross: ['มีบางอย่างจะตัดหน้า — แมว? ไม่แน่ใจ แต่เบรกไว้ก่อน', 'something is about to cross — a cat? Not sure, but it brakes anyway', '有东西正要横穿——猫？不确定，但先刹车'],
  car_ahead: ['ตามรถคันหน้า', 'following the car ahead', '跟随前车'],
  car_crossing: ['มีรถขวางเลนอยู่', 'a car is across its lane', '有车横在车道上'],
  yield_ring: ['ให้ทางรถที่อยู่ในวงเวียนก่อน', 'giving way to a car already in the roundabout', '先让已在环岛里的车'],
  yield_car: ['ให้ทางรถที่กำลังจะตัดผ่าน', 'giving way to a car about to cross', '让正要横穿的车'],
  crashed: ['ชนรถคันอื่น! รอเคลียร์', 'it crashed into another car — waiting to be cleared', '撞上了另一辆车，等待清理'],
  was_hit: ['ถูกรถคันอื่นชน รอเคลียร์', 'another car crashed into it — waiting to be cleared', '被另一辆车撞上，等待清理'],
  hit_person: ['ชนคน! นี่คือสิ่งที่ห้ามเกิดที่สุด', 'it hit a person — the one thing it must never do', '撞到了人。这是绝不能发生的事'],
  hit_dog: ['ชนสุนัข! มันไม่ทันเห็นหรือไม่ทันหยุด', 'it hit a dog — it saw it too late, or could not stop in time', '撞到了狗。它看见得太晚，或来不及停下'],
}

// Detection labels name themselves from ITEMS in street.js, so a class is
// defined in exactly one place: the COCO id and both languages together.
const pick = (pair, lang) => pair[lang === 'en' ? 1 : lang === 'zh' ? 2 : 0]
const metres = (lang) => (lang === 'en' ? 'm' : lang === 'zh' ? '米' : 'ม.')

export const labelFor = (label, lang) => pick(ITEMS[label]?.label ?? [label, label], lang)

/** "Braking hard — a person is in its lane · 12 m" */
export function sayDecision(car, world, lang) {
  const d = car.decision
  let key = d.reason
  if (d.label === 'cat' && /^dog_(in_lane|will_cross)$/.test(key)) key = key.replace('dog', 'cat')
  const R = Math.round(sightRange(car, world.weather))
  const why = pick(REASON[key] ?? REASON.clear, lang).replace('{R}', R)
  const dist = d.dist != null && key !== 'short_sight' ? ` · ${Math.round(d.dist)} ${metres(lang)}` : ''
  const easy = d.action === 'speeding_up' || d.action === 'cruising'
  const action = !easy || key === 'clear' ? d.action : CAPS.has(key) ? 'capped' : 'watching'
  return `${pick(ACTION[action], lang)} — ${why}${dist}`
}

/** "person 94% 12 m · car 88% 25 m" — the three nearest things it believes in. */
export function saySeen(car, lang) {
  const seen = [...car.tracks.values()]
    .map((tr) => ({ tr, d: Math.hypot(tr.obj.x - car.x, tr.obj.y - car.y) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 3)
  if (car.blind) return pick(['ไม่เห็นอะไรเลย — กล้องถูกปิดอยู่', 'nothing — its camera is covered', '什么也看不见——摄像头被盖住了'], lang)
  if (!seen.length) return pick(['ไม่มีอะไรในสายตา', 'nothing in view', '视野里什么也没有'], lang)
  return seen.map(({ tr, d }) => `${labelFor(tr.label, lang)} ${Math.round(tr.conf * 100)}% ${Math.round(d)} ${metres(lang)}`).join(' · ')
}

export const speedKmh = (car) => Math.round(car.v * 3.6)

/**
 * What is in view that the camera has no name for.
 *
 * This is the point of the whole room. A detector is a closed list: COCO's
 * eighty categories and no others. Everything else on a street is simply not
 * reportable — not "missed", not "below threshold", *unnamed*. A lamp post at
 * 6 m is described perfectly well by the geometry and still gets no box,
 * because no category exists for it.
 */
export function sayUnnamed(car, world, lang) {
  const R = sightRange(car, world.weather)
  if (car.blind) return ''
  const kinds = new Map()
  for (const it of world.street.items) {
    if (it.kind === 'building' || ITEMS[it.kind]?.detectable) continue
    const dx = it.x - car.x, dy = it.y - car.y
    const d = Math.hypot(dx, dy)
    if (d > R || Math.abs(wrap(Math.atan2(dy, dx) - car.h)) > FOV / 2) continue
    kinds.set(it.kind, (kinds.get(it.kind) ?? 0) + 1)
  }
  const total = [...kinds.values()].reduce((n, v) => n + v, 0)
  if (!total) return ''
  const list = [...kinds.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2)
    .map(([kind, n]) => (n > 1 ? `${n}× ${labelFor(kind, lang)}` : labelFor(kind, lang)))
    .join(lang === 'en' ? ', ' : lang === 'zh' ? '、' : ' · ')
  if (lang === 'en') return `${total} in view with no name for them — ${list}`
  if (lang === 'zh') return `视野里有 ${total} 个叫不出名字的东西——${list}`
  return `มองเห็น ${total} อย่างที่เรียกไม่ถูก — ${list}`
}
