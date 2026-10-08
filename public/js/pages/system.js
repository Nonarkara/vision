// System: the design in prose, plus one live block — what the server says
// about itself right now. Everything from the network goes in by textContent:
// source labels come from upstream and are not ours to trust.

import '../core/site.js?v=1.10.0'
import { t, n, lang, onLang } from '../core/i18n.js'
import { loadCatalog, SOURCES } from '../core/catalog.js'

const KINDS = ['video', 'still', 'view', 'off']
const healthBody = document.querySelector('[data-health]')
const sourcesBody = document.querySelector('[data-sources]')
const atEl = document.querySelector('[data-at]')
const refreshBtn = document.querySelector('[data-refresh]')

let health = null
let healthError = false
let catalog = null
let catalogError = false
let checkedAt = null

function when(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString(lang() === 'th' ? 'th-TH' : 'en-GB', { timeZone: 'Asia/Bangkok', dateStyle: 'medium', timeStyle: 'short' })
}

function duration(seconds) {
  const s = Math.max(0, Number(seconds) || 0)
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60)
  if (d) return t(`${n(d)} วัน ${n(h)} ชั่วโมง`, `${n(d)} d ${n(h)} h`)
  if (h) return t(`${n(h)} ชั่วโมง ${n(m)} นาที`, `${n(h)} h ${n(m)} min`)
  return t(`${n(m)} นาที`, `${n(m)} min`)
}

function origin(o) {
  if (o === 'flooddash') return t('FloodDash (สด)', 'FloodDash (live)')
  if (o === 'disk') return t('สำเนาล่าสุดบนดิสก์ (FloodDash ไม่ตอบ)', 'last saved copy on disk (FloodDash not answering)')
  return t('ยังไม่มี', 'nothing yet')
}

/** One table row. The first cell names the row; the rest are numbers, right-aligned. */
function row(cells) {
  const tr = document.createElement('tr')
  cells.forEach((text, i) => {
    const cell = document.createElement('td')
    cell.textContent = String(text)
    if (i > 0 && cells.length > 2) cell.className = 'num'
    tr.append(cell)
  })
  return tr
}

function paintHealth() {
  if (healthError) { healthBody.replaceChildren(row([t('อ่านสถานะเซิร์ฟเวอร์ไม่ได้', 'Could not read the server status')])); return }
  if (!health) return
  const c = health.catalogue ?? {}
  const r = health.relay ?? {}
  const resting = Array.isArray(r.resting_hosts) && r.resting_hosts.length ? r.resting_hosts.join(', ') : t('ไม่มี', 'none')
  const rows = [
    [t('สถานะ', 'Status'), health.ok ? t('ทำงาน', 'working') : t('ยังไม่มีรายชื่อกล้อง', 'no camera list yet')],
    [t('รุ่น', 'Version'), health.version ?? '—'],
    [t('ทำงานต่อเนื่องมาแล้ว', 'Up for'), duration(health.uptime_s)],
    [t('รายชื่อกล้องมาจาก', 'Camera list from'), origin(c.origin)],
    [t('โหลดรายชื่อเมื่อ', 'List loaded'), when(c.loadedAt)],
    [t('FloodDash รวบรวมเมื่อ', 'FloodDash gathered it'), when(c.upstreamAt)],
    [t('ภาพในหน่วยความจำรีเลย์ตอนนี้', 'Frames in relay memory now'), n(r.cached_frames ?? 0)],
    [t('กำลังดึง · รอคิว', 'Fetching · waiting'), `${n(r.inflight ?? 0)} · ${n(r.waiting ?? 0)}`],
    [t('กล้องที่รีเลย์ลองแล้ว (ล่าสุดสำเร็จ / ล้มเหลว)', 'Cameras the relay has tried (last ok / failed)'), `${n(r.checked_cameras ?? 0)} (${n(r.last_ok ?? 0)} / ${n(r.last_failed ?? 0)})`],
    [t('โฮสต์ที่กำลังพัก', 'Hosts resting'), resting],
    [t('หน่วยความจำเซิร์ฟเวอร์', 'Server memory'), `${n(health.memory_mb ?? 0)} MB`],
  ]
  healthBody.replaceChildren(...rows.map((cells) => row(cells)))
  for (const k of [...KINDS, 'total']) {
    const el = document.querySelector(`[data-k="${k}"]`)
    if (el && Number.isFinite(c[k])) el.textContent = n(c[k])
  }
}

function sourceLabel(s) {
  const known = SOURCES[s.id]
  if (known) return t(known.th, known.en)
  return t(s.th || s.en || s.id, s.en || s.th || s.id)
}

function paintSources() {
  if (catalogError) { sourcesBody.replaceChildren(row([t('อ่านรายชื่อกล้องไม่ได้', 'Could not read the camera list')])); return }
  if (!catalog) return
  const bySrc = new Map()
  for (const cam of catalog.cameras) {
    const k = bySrc.get(cam.src) ?? { video: 0, still: 0, view: 0, off: 0 }
    if (cam.k in k) k[cam.k]++
    bySrc.set(cam.src, k)
  }
  const list = Array.isArray(catalog.sources) && catalog.sources.length
    ? catalog.sources
    : [...bySrc.keys()].map((id) => ({ id, count: 0 }))
  sourcesBody.replaceChildren(...list.map((s) => {
    const k = bySrc.get(s.id) ?? { video: 0, still: 0, view: 0, off: 0 }
    return row([sourceLabel(s), n(s.count || 0), ...KINDS.map((kind) => n(k[kind]))])
  }))
}

function paintAt() {
  atEl.textContent = checkedAt ? `${t('อ่านเมื่อ', 'Read at')} ${checkedAt.toLocaleTimeString(lang() === 'th' ? 'th-TH' : 'en-GB', { hour12: false })}` : ''
}

async function readHealth() {
  refreshBtn.disabled = true
  try {
    const res = await fetch('/api/health', { cache: 'no-store' })
    if (!res.ok) throw new Error(`health ${res.status}`)
    health = await res.json()
    healthError = false
  } catch {
    healthError = true
  } finally {
    checkedAt = new Date()
    refreshBtn.disabled = false
    paintHealth()
    paintAt()
  }
}

// The catalogue is rate-limited and the same for everyone for a minute: read it once.
loadCatalog()
  .then((data) => { catalog = data; paintSources() })
  .catch(() => { catalogError = true; paintSources() })

readHealth()
refreshBtn.addEventListener('click', readHealth)
onLang(() => { paintHealth(); paintSources(); paintAt() })
