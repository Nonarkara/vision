// The camera catalogue, as the browser sees it. One fetch per page.

import { t } from './i18n.js'

let pending = null

/** One retry when the server asks us to wait — a whole classroom can arrive at once. */
async function fetchCatalog() {
  const res = await fetch('/api/cameras')
  if (res.status !== 429) return res
  const wait = Math.min(15, Number(res.headers.get('Retry-After')) || 5)
  await new Promise((r) => setTimeout(r, wait * 1000))
  return fetch('/api/cameras')
}

export function loadCatalog() {
  pending ??= fetchCatalog().then(async (res) => {
    if (!res.ok) throw new Error(`catalogue ${res.status}`)
    const data = await res.json()
    if (!Array.isArray(data.cameras)) throw new Error('catalogue malformed')
    return data
  }).catch((err) => { pending = null; throw err })
  return pending
}

/** Owners and carriers, short enough for a caption. Long names live on /system. */
export const SOURCES = {
  gistda: { th: 'GISTDA · กล้องถนน กทม./ทล./iTIC', en: 'GISTDA · BMA / DOH / iTIC road cameras' },
  itic: { th: 'มูลนิธิ iTIC', en: 'iTIC Foundation' },
  nst: { th: 'เทศบาลนครนครศรีธรรมราช', en: 'Nakhon Si Thammarat City' },
  pakkret: { th: 'เทศบาลนครปากเกร็ด', en: 'Pak Kret City' },
  rangsit: { th: 'เทศบาลนครรังสิต', en: 'Rangsit City' },
  dwr: { th: 'กรมทรัพยากรน้ำ', en: 'Department of Water Resources' },
  maholan: { th: 'cctv.maholan.net (รวมกล้อง ทล./iTIC/เทศบาล)', en: 'cctv.maholan.net (DOH / iTIC / municipal)' },
}

export const KINDS = {
  video: { th: 'วิดีโอสด · อ่านพิกเซลได้', en: 'Live video · pixels readable' },
  still: { th: 'ภาพนิ่ง · ส่งต่อผ่านหน่วยความจำ', en: 'Still · relayed in memory' },
  view: { th: 'ดูได้ที่ต้นทางเท่านั้น', en: 'Viewable at source only' },
  off: { th: 'ออฟไลน์', en: 'Offline' },
}

export function sourceName(id) {
  const s = SOURCES[id]
  return s ? t(s.th, s.en) : id
}

export function camName(c) {
  const th = c.th || c.en || c.id
  const en = c.en || c.th || c.id
  return t(th, en)
}

/** Can a machine in this browser read this camera's pixels? */
export function isReadable(c) {
  return c.k === 'video' || (c.k === 'still' && c.h !== 0)
}

/**
 * The six figures the About chapter prints. Pure — takes the catalogue
 * payload, returns the numbers, so a test can pin them without a browser.
 *
 * "a machine can read" is counted with isReadable, the same rule the bench,
 * the judge and the wall already use. That chapter promises its numbers cannot
 * disagree with the cameras page; keeping a second copy of the rule inline in
 * that page's own script is exactly how the promise would rot.
 *
 * A figure the payload cannot support comes back null and prints as an em
 * dash, never as 0. A zero is a claim about the world. This page makes claims.
 */
export function evidence(d) {
  if (!d || !Array.isArray(d.cameras)) return null
  const empty = { total: null, readable: null, video: null, still: null, off: null, sources: null }
  // A catalogue that has not loaded yet is not evidence that there is nothing
  // out there. Before the first upstream fetch the server honestly reports zero
  // of everything and origin "empty". Printing those six zeros under the line
  // "they are the camera list this site is reading right now" would be six
  // false claims; a dash says "not known yet", which is the truth. A real zero
  // — a day with no live video — still prints as a zero, because by then the
  // catalogue has loaded and the zero is a fact about the world.
  if (!d.loadedAt) return empty
  const counts = d.counts ?? {}
  return {
    total: counts.total ?? d.cameras.length,
    readable: d.cameras.filter(isReadable).length,
    video: counts.video ?? null,
    still: counts.still ?? null,
    off: counts.off ?? null,
    sources: Array.isArray(d.sources) ? d.sources.length : new Set(d.cameras.map((c) => c.src)).size,
  }
}

export function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Choose `n` readable cameras. Stills known to have worked come first, then
 * untested stills; videos are mixed in when asked, because a page that opens
 * 20 live streams at once is a page that stutters.
 *
 * `avoid` drops cameras that just failed, when enough others remain, so a
 * census retry does not spend another nine seconds on the same dead hosts.
 * `prefer` (ids that answered in this tab) sorts with the server's `h: 1`.
 */
export function pickReadable(cams, n, { video = 0, src = null, avoid = null, prefer = null } = {}) {
  const skip = avoid instanceof Set ? avoid : new Set(avoid ?? [])
  const boost = prefer instanceof Set ? prefer : new Set(prefer ?? [])
  const usable = cams.filter((c) => isReadable(c) && (!src || c.src === src))
  const fresh = skip.size ? usable.filter((c) => !skip.has(c.id)) : usable
  const pool = fresh.length ? fresh : usable
  const rank = (c) => (boost.has(c.id) || c.h === 1 ? 2 : skip.has(c.id) ? 0 : 1)
  const vids = shuffle(pool.filter((c) => c.k === 'video'))
  const stills = shuffle(pool.filter((c) => c.k === 'still'))
  vids.sort((a, b) => rank(b) - rank(a))
  stills.sort((a, b) => rank(b) - rank(a))
  return [...vids.slice(0, video), ...stills].slice(0, n)
}

export function byId(cams, id) {
  return cams.find((c) => c.id === id) ?? null
}
