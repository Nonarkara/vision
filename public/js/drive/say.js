// What each car tells you, in both languages: what it is doing, why, and
// what it can see. Pure strings — the page decides where they go.

import { sightRange } from './perceive.js?v=1.10.2'

export const STYLE_NAME = {
  careful: ['ระวัง', 'Careful'],
  normal: ['ปกติ', 'Normal'],
  hasty: ['ใจร้อน', 'Hasty'],
}

const ACTION = {
  waiting: ['หยุดรอ', 'Waiting'],
  braking_hard: ['เบรกแรง', 'Braking hard'],
  slowing: ['ชะลอ', 'Slowing'],
  speeding_up: ['เร่ง', 'Speeding up'],
  cruising: ['วิ่งต่อ', 'Cruising'],
  capped: ['คุมความเร็ว', 'Keeping its speed down'],
  watching: ['เฝ้าดู', 'Watching'],
}

/** Reasons that cap speed rather than demand a stop. */
const CAPS = new Set(['curve', 'short_sight', 'dog_roadside'])

const REASON = {
  clear: ['ทางโล่ง', 'the road is clear'],
  curve: ['มีทางโค้งข้างหน้า', 'a bend is coming'],
  short_sight: ['มองเห็นได้แค่ {R} ม. จึงขับช้าพอจะหยุดทันในระยะนั้น', 'it can only see {R} m, so it keeps to a speed it can stop within'],
  light_red: ['ไฟแดงข้างหน้า', 'red light ahead'],
  light_amber: ['ไฟเหลือง และยังหยุดทัน', 'amber light, and it can still stop in time'],
  person_waiting: ['มีคนรอข้ามทางม้าลาย ให้คนไปก่อน', 'someone is waiting at the zebra — people go first'],
  person_in_lane: ['มีคนอยู่บนเลนข้างหน้า', 'a person is in its lane'],
  person_will_cross: ['คนกำลังจะเดินเข้ามาในเลน', 'a person is about to walk into its lane'],
  dog_in_lane: ['มีสุนัขอยู่บนเลน', 'a dog is in its lane'],
  dog_will_cross: ['สุนัขกำลังจะวิ่งตัดหน้า', 'a dog is about to run across'],
  dog_roadside: ['มีสุนัขข้างทาง อาจวิ่งออกมา', 'a dog by the road might run out'],
  cat_in_lane: ['มีบางอย่างบนเลน — แมว? ไม่แน่ใจ แต่เบรกไว้ก่อน', 'something is in its lane — a cat? Not sure, but it brakes anyway'],
  cat_will_cross: ['มีบางอย่างจะตัดหน้า — แมว? ไม่แน่ใจ แต่เบรกไว้ก่อน', 'something is about to cross — a cat? Not sure, but it brakes anyway'],
  car_ahead: ['ตามรถคันหน้า', 'following the car ahead'],
  car_crossing: ['มีรถขวางเลนอยู่', 'a car is across its lane'],
  yield_ring: ['ให้ทางรถที่อยู่ในวงเวียนก่อน', 'giving way to a car already in the roundabout'],
  yield_car: ['ให้ทางรถที่กำลังจะตัดผ่าน', 'giving way to a car about to cross'],
  crashed: ['ชนรถคันอื่น! รอเคลียร์', 'it crashed into another car — waiting to be cleared'],
  was_hit: ['ถูกรถคันอื่นชน รอเคลียร์', 'another car crashed into it — waiting to be cleared'],
  hit_person: ['ชนคน! นี่คือสิ่งที่ห้ามเกิดที่สุด', 'it hit a person — the one thing it must never do'],
  hit_dog: ['ชนสุนัข! มันไม่ทันเห็นหรือไม่ทันหยุด', 'it hit a dog — it saw it too late, or could not stop in time'],
}

const LABEL = { car: ['รถ', 'car'], person: ['คน', 'person'], dog: ['สุนัข', 'dog'], cat: ['แมว?', 'cat?'], truck: ['รถบรรทุก', 'truck'], bus: ['รถโดยสาร', 'bus'] }

const pick = (pair, lang) => pair[lang === 'en' ? 1 : 0]

/** "Braking hard — a person is in its lane · 12 m" */
export function sayDecision(car, world, lang) {
  const d = car.decision
  let key = d.reason
  if (d.label === 'cat' && /^dog_(in_lane|will_cross)$/.test(key)) key = key.replace('dog', 'cat')
  const R = Math.round(sightRange(car, world.weather))
  const why = pick(REASON[key] ?? REASON.clear, lang).replace('{R}', R)
  const dist = d.dist != null && key !== 'short_sight' ? ` · ${Math.round(d.dist)} ${lang === 'en' ? 'm' : 'ม.'}` : ''
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
  if (car.blind) return lang === 'en' ? 'nothing — its camera is covered' : 'ไม่เห็นอะไรเลย — กล้องถูกปิดอยู่'
  if (!seen.length) return lang === 'en' ? 'nothing in view' : 'ไม่มีอะไรในสายตา'
  return seen.map(({ tr, d }) => `${pick(LABEL[tr.label], lang)} ${Math.round(tr.conf * 100)}% ${Math.round(d)} ${lang === 'en' ? 'm' : 'ม.'}`).join(' · ')
}

export const speedKmh = (car) => Math.round(car.v * 3.6)
