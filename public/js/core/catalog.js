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
 */
export function pickReadable(cams, n, { video = 0, src = null } = {}) {
  const pool = cams.filter((c) => isReadable(c) && (!src || c.src === src))
  const vids = shuffle(pool.filter((c) => c.k === 'video')).slice(0, video)
  const stills = shuffle(pool.filter((c) => c.k === 'still'))
  stills.sort((a, b) => (b.h === 1) - (a.h === 1))
  return [...vids, ...stills].slice(0, n)
}

export function byId(cams, id) {
  return cams.find((c) => c.id === id) ?? null
}
