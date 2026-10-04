// The list: the same cameras as the map, fifty at a time, in words. It is
// also the map's keyboard and screen-reader alternative — every square on the
// map is a row here, and "Show on map" does what a tap on the map does.

import { t, esc, n, onLang } from '../core/i18n.js'
import { camName, sourceName, isReadable } from '../core/catalog.js'
import { kindName, safeKind } from './filters.js'

const PAGE_SIZE = 50
const isWebLink = (u) => typeof u === 'string' && /^https?:\/\//i.test(u)

function rowHtml(c, i, pickedCam) {
  const k = safeKind(c.k)
  const study = isReadable(c)
    ? `<button class="btn" type="button" data-study="${i}">${esc(t('ศึกษากล้องนี้', 'Study this'))}</button>`
    : ''
  const owner = isWebLink(c.w)
    ? `<a class="btn" href="${esc(c.w)}" target="_blank" rel="noopener noreferrer">${esc(t('ดูที่เจ้าของ', 'View at owner'))} ↗</a>`
    : ''
  const loc = c.loc && c.loc !== c.th ? `<span class="micro cam-loc">${esc(c.loc)}</span>` : ''
  return `<li class="cam-row${c === pickedCam ? ' is-picked' : ''}">
    <div class="cam-name">
      <button class="cam-pick" type="button" data-pick="${i}" aria-label="${esc(t('แสดงบนแผนที่', 'Show on map'))}: ${esc(camName(c))}">${esc(camName(c))}</button>
      ${loc}
      <span class="micro cam-kind"><i class="sw sw-${k}" aria-hidden="true"></i>${esc(kindName(k))} · ${esc(sourceName(c.src))}</span>
    </div>
    <span class="cam-actions">${study}${owner}</span>
  </li>`
}

export function createList(root, { onStudy, onPick }) {
  const listEl = root.querySelector('[data-list]')
  const countEl = root.querySelector('[data-list-count]')
  const prev = root.querySelector('[data-page-prev]')
  const next = root.querySelector('[data-page-next]')
  const pageEl = root.querySelector('[data-page-at]')
  let rows = []
  let page = 0
  let picked = null

  const pages = () => Math.max(1, Math.ceil(rows.length / PAGE_SIZE))

  function render() {
    const start = page * PAGE_SIZE
    const slice = rows.slice(start, start + PAGE_SIZE)
    // Re-rendering replaces the buttons; keep keyboard focus where it was.
    const focused = listEl.contains(document.activeElement) ? document.activeElement : null
    const refocus = focused?.dataset.pick ? `[data-pick="${focused.dataset.pick}"]` : focused?.dataset.study ? `[data-study="${focused.dataset.study}"]` : null
    listEl.innerHTML = slice.map((c, j) => rowHtml(c, start + j, picked)).join('')
    countEl.textContent = rows.length
      ? t(`แสดง ${n(start + 1)}–${n(start + slice.length)} จาก ${n(rows.length)} กล้อง`, `Showing ${n(start + 1)}–${n(start + slice.length)} of ${n(rows.length)} cameras`)
      : t('ไม่มีกล้องตรงกับตัวกรอง', 'No camera matches these filters')
    if (refocus) listEl.querySelector(refocus)?.focus({ preventScroll: true })
    pageEl.textContent = `${n(page + 1)} / ${n(pages())}`
    prev.disabled = page === 0
    next.disabled = page >= pages() - 1
  }

  function go(p) {
    page = Math.min(pages() - 1, Math.max(0, p))
    render()
    listEl.scrollIntoView({ block: 'nearest' })
  }

  prev.addEventListener('click', () => go(page - 1))
  next.addEventListener('click', () => go(page + 1))
  listEl.addEventListener('click', (e) => {
    const study = e.target.closest('[data-study]')
    if (study) return onStudy(rows[Number(study.dataset.study)])
    const pick = e.target.closest('[data-pick]')
    if (pick) onPick(rows[Number(pick.dataset.pick)])
  })
  onLang(render)

  return {
    set(list) { rows = list; page = 0; render() },
    /** Mark a camera; if it is in the current results, turn to its page. */
    mark(cam) {
      picked = cam
      const i = cam ? rows.indexOf(cam) : -1
      if (i >= 0) page = Math.floor(i / PAGE_SIZE)
      render()
    },
  }
}
