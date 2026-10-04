// The live figures: how many cameras of each kind, and whose they are. Read
// from the same catalogue the map draws, so the numbers and the dots agree.

import { t, esc, n, onLang } from '../core/i18n.js'
import { SOURCES, isReadable } from '../core/catalog.js'

const KIND_KEYS = ['video', 'still', 'view', 'off']

/** Per-source counts by kind, in the catalogue's order of sources. */
function bySource(data) {
  const rows = new Map()
  for (const s of data.sources ?? []) rows.set(s.id, { id: s.id, th: s.th, en: s.en, total: 0, readable: 0, video: 0, still: 0, view: 0, off: 0 })
  for (const c of data.cameras) {
    if (!rows.has(c.src)) rows.set(c.src, { id: c.src, th: c.src, en: c.src, total: 0, readable: 0, video: 0, still: 0, view: 0, off: 0 })
    const r = rows.get(c.src)
    r.total++
    if (isReadable(c)) r.readable++
    if (KIND_KEYS.includes(c.k)) r[c.k]++
  }
  return [...rows.values()].filter((r) => r.total > 0).sort((a, b) => b.total - a.total)
}

function sourceLabel(r) {
  const known = SOURCES[r.id]
  return known ? t(known.th, known.en) : t(r.th || r.id, r.en || r.id)
}

export function paintFigures(data) {
  const readable = data.cameras.filter(isReadable).length
  const rows = bySource(data)
  const tbody = document.querySelector('[data-source-rows]')
  const asOf = document.querySelector('[data-catalog-at]')

  function paint() {
    const set = (k, v) => { const el = document.querySelector(`[data-fig="${k}"]`); if (el) el.textContent = n(v) }
    set('total', data.counts?.total ?? data.cameras.length)
    set('readable', readable)
    for (const k of KIND_KEYS) set(k, data.counts?.[k] ?? 0)
    // Source labels can come from upstream; escape them like any other catalogue text.
    tbody.innerHTML = rows.map((r) => `<tr>
      <td>${esc(sourceLabel(r))}</td>
      <td class="num">${n(r.total)}</td>
      <td class="num">${n(r.readable)}</td>
      ${KIND_KEYS.map((k) => `<td class="num">${n(r[k])}</td>`).join('')}
    </tr>`).join('')
    if (asOf && (data.upstreamAt || data.loadedAt)) {
      const when = new Date(data.upstreamAt || data.loadedAt)
      if (!Number.isNaN(when.getTime())) {
        const stamp = when.toLocaleString(t('th-TH', 'en-GB'), { dateStyle: 'medium', timeStyle: 'short' })
        asOf.textContent = data.origin === 'disk'
          ? t(`ใช้รายชื่อที่บันทึกไว้ ข้อมูลต้นทางเมื่อ ${stamp} พยายามอัปเดตทุก 10 นาที`, `Using the saved catalogue. Upstream snapshot: ${stamp}. Refresh attempts run every 10 minutes.`)
          : t(`ข้อมูลรายชื่อจากต้นทางเมื่อ ${stamp} พยายามอัปเดตทุก 10 นาที`, `Upstream catalogue snapshot: ${stamp}. Refresh attempts run every 10 minutes.`)
      }
    }
  }
  paint()
  onLang(paint)
}
