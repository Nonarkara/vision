// Lesson 8 — the cameras themselves: read the live catalogue.
//
//   node examples/08-catalogue.mjs                      # the public site
//   BASE=http://localhost:8431 node examples/08-catalogue.mjs   # your dev server
//
// One polite request (the same one every page makes), no pictures. It shows
// what a computer-vision system has to know before it looks at anything:
// which cameras exist, who owns them, and whether a browser may read their
// pixels at all. Most of the work in real vision systems is this — plumbing,
// permission and provenance — not the model.

import { rule } from './shared/ascii.mjs'

const BASE = process.env.BASE ?? 'https://vision.nonarkara.org'
const res = await fetch(`${BASE}/api/cameras`, { headers: { 'User-Agent': 'vision examples/08 (education)' } })
if (!res.ok) {
  console.error(`The catalogue answered ${res.status}. If it is 429, wait a minute — the limit protects everyone.`)
  process.exit(1)
}
const data = await res.json()
const cams = data.cameras

console.log(rule(`${cams.length.toLocaleString()} cameras · catalogue from ${data.origin} · loaded ${data.loadedAt}`))
const KIND = {
  video: 'live video from a host that allows reading (CORS) — the browser analyses it directly',
  still: 'a still JPEG without CORS — relayed through server memory so the browser may read it',
  view: "viewable only on the owner's own page — no machine here can read its pixels",
  off: "the owner's stream was found down by FloodDash's health probe",
}
for (const [k, why] of Object.entries(KIND)) {
  const n = data.counts[k] ?? 0
  console.log(`${k.padEnd(6)} ${String(n).padStart(5)}  ${'█'.repeat(Math.round((n / cams.length) * 40)).padEnd(40)}  ${why}`)
}
const readable = (data.counts.video ?? 0) + (data.counts.still ?? 0)
console.log(`\n${((100 * readable) / cams.length).toFixed(0)}% of listed cameras are machine-readable IN PRINCIPLE. In practice fewer: on`)
console.log('one sample, only 22 of 40 cctv.maholan.net stills answered (the rest 502).')
console.log('"still" means a URL exists; the relay finds out whether it works when someone looks.')
console.log('That share — not model accuracy — is the first limit on what a city-scale vision')
console.log('system can see.')

console.log(rule('By owner'))
for (const s of data.sources) {
  const mine = cams.filter((c) => c.src === s.id)
  const r = mine.filter((c) => c.k === 'video' || c.k === 'still').length
  console.log(`${s.id.padEnd(8)} ${String(mine.length).padStart(5)} listed  ${String(r).padStart(5)} readable in principle   ${s.en}`)
}

console.log(rule('One record, field by field'))
const one = cams.find((c) => c.k === 'video') ?? cams[0]
const FIELDS = {
  id: 'source:native id — stable across refreshes',
  src: 'which of the 7 sources it came from',
  th: 'name in Thai, as the owner wrote it',
  en: 'name in English (often empty — we do not machine-translate)',
  loc: 'road / district context, when given',
  lat: 'latitude (rounded to ~1 m)',
  lng: 'longitude',
  k: 'kind: video · still · view · off',
  v: 'HLS playlist URL (video only) — the browser plays it straight from the owner',
  w: "a link to watch it on the owner's site — credit, and a way to check us",
  face: 'what the camera faces, when its name says so (never guessed)',
  f: '1 when the owner flags the camera as flooded',
  h: 'relay result this session: 1 answered, 0 failed (stills only)',
}
for (const [key, val] of Object.entries(one)) console.log(`  ${key.padEnd(5)} ${JSON.stringify(val).slice(0, 60).padEnd(62)} ${FIELDS[key] ?? ''}`)

console.log(rule('Where the cameras are (a text map: every character is a cell, darker = more cameras)'))
const [lat0, lat1, lng0, lng1] = [5.5, 20.5, 97.3, 105.7]
const COLS = 42, ROWS = 30
const grid = Array.from({ length: ROWS }, () => new Array(COLS).fill(0))
for (const c of cams) {
  const col = Math.floor(((c.lng - lng0) / (lng1 - lng0)) * COLS), row = Math.floor(((lat1 - c.lat) / (lat1 - lat0)) * ROWS)
  if (row >= 0 && row < ROWS && col >= 0 && col < COLS) grid[row][col]++
}
const ramp = ' .:+*#@'
for (const row of grid) console.log('  ' + row.map((n) => ramp[n === 0 ? 0 : Math.min(ramp.length - 1, 1 + Math.floor(Math.log2(n)))]).join(''))
console.log('\nBangkok is the dark knot; the highways draw the country. No basemap needed —')
console.log('the cameras ARE the map. (/cameras draws this properly.)')
