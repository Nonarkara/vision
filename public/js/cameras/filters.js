// Filters for the map and the list: what kind, whose, and a name to look for.
// One state, one match function, so the map, the list and the census always
// agree about which cameras are "the ones you are looking at".

import { t, onLang } from '../core/i18n.js'
import { SOURCES, isReadable } from '../core/catalog.js'

/** Short kind names for legends, rows and selects. The long ones live in catalog.js. */
export const KIND_SHORT = {
  video: ['วิดีโอสด', 'Live video'],
  still: ['ภาพนิ่ง', 'Still'],
  view: ['ดูได้ที่ต้นทาง', 'At source only'],
  off: ['ออฟไลน์', 'Offline'],
}

export const kindName = (k) => {
  const row = KIND_SHORT[k] ?? KIND_SHORT.off
  return t(row[0], row[1])
}

/** A kind we know, or 'off' — the class names built from it must stay ours. */
export const safeKind = (k) => (KIND_SHORT[k] ? k : 'off')

const KIND_OPTIONS = [
  ['all', 'ทุกแบบ', 'Every kind'],
  ['readable', 'เครื่องอ่านได้ (วิดีโอ + ภาพนิ่ง)', 'Machine-readable (video + still)'],
  ['video', ...KIND_SHORT.video],
  ['still', ...KIND_SHORT.still],
  ['view', ...KIND_SHORT.view],
  ['off', ...KIND_SHORT.off],
]

const norm = (s) => String(s ?? '').toLowerCase().normalize('NFC').trim()

export function matches(cam, { kind, src, q }) {
  if (kind === 'readable' && !isReadable(cam)) return false
  if (kind !== 'all' && kind !== 'readable' && cam.k !== kind) return false
  if (src !== 'all' && cam.src !== src) return false
  if (!q) return true
  return [cam.th, cam.en, cam.loc, cam.face, cam.id].some((f) => norm(f).includes(q))
}

function fillSelect(select, options, value) {
  select.replaceChildren(...options.map(([v, label]) => {
    const o = document.createElement('option')
    o.value = v
    o.textContent = label
    o.selected = v === value
    return o
  }))
}

/**
 * Wire the filter form. `sources` is the list of source ids present in the
 * catalogue. Calls `onChange(state)` whenever the filter changes.
 */
export function createFilters(form, sources, onChange) {
  const kindSel = form.querySelector('[data-filter-kind]')
  const srcSel = form.querySelector('[data-filter-src]')
  const qInput = form.querySelector('[data-filter-q]')
  const state = { kind: 'all', src: 'all', q: '' }

  function renderOptions() {
    fillSelect(kindSel, KIND_OPTIONS.map(([v, th, en]) => [v, t(th, en)]), state.kind)
    const srcOptions = sources.map((id) => [id, SOURCES[id] ? t(SOURCES[id].th, SOURCES[id].en) : id])
    fillSelect(srcSel, [['all', t('ทุกแหล่ง', 'Every source')], ...srcOptions], state.src)
  }

  const emit = () => onChange({ ...state })
  kindSel.addEventListener('change', () => { state.kind = kindSel.value; emit() })
  srcSel.addEventListener('change', () => { state.src = srcSel.value; emit() })
  let timer = 0
  qInput.addEventListener('input', () => {
    clearTimeout(timer)
    timer = setTimeout(() => { state.q = norm(qInput.value); emit() }, 140)
  })
  form.addEventListener('submit', (e) => e.preventDefault())
  form.addEventListener('reset', () => {
    Object.assign(state, { kind: 'all', src: 'all', q: '' })
    setTimeout(() => { renderOptions(); emit() })
  })

  renderOptions()
  onLang(renderOptions)
  return { get state() { return { ...state } } }
}
