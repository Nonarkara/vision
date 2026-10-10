// /cameras — every camera in the catalogue, on a map drawn from the cameras
// themselves; a bench to point the machine at any one of them (or at your
// own); and a census that samples a few dozen and adds up what it sees.
//
// The pieces live in /js/cameras/. This file only wires them together: the
// filters decide which cameras are "in view", and the map, the list and the
// census all read that same set.

import '../core/site.js?v=1.11.2'
import { t, esc, n, onLang } from '../core/i18n.js'
import { whenVisible } from '../core/site.js?v=1.11.2'
import { loadCatalog, camName, sourceName, isReadable, byId } from '../core/catalog.js'
import { wantsWebcam } from '../core/specimen.js?v=1.11.2'
import { paintFigures } from '../cameras/figures.js'
import { createFilters, matches, kindName, safeKind } from '../cameras/filters.js'
import { createMap } from '../cameras/map.js'
import { createList } from '../cameras/list.js'
import { createBench } from '../cameras/bench.js'
import { createCensus } from '../cameras/census.js'

const benchRoot = document.querySelector('[data-bench]')
const bench = createBench(benchRoot)
const pickedEl = document.querySelector('[data-picked]')
const mapState = document.querySelector('[data-map-state]')
const mapCount = document.querySelector('[data-map-count]')

let cameras = []
let inView = []
let picked = null

// ── Studying a camera ──────────────────────────────────────────────────

async function study(cam) {
  if (!cam || !isReadable(cam)) return
  show(cam)
  benchRoot.scrollIntoView({ behavior: 'smooth', block: 'start' })
  const url = new URL(location.href)
  url.searchParams.set('cam', cam.id)
  url.searchParams.delete('source')
  history.replaceState(null, '', url)
  await bench.study(cam)
}

// ── The picked camera, under the map ──────────────────────────────────

function renderPicked() {
  if (!picked) {
    pickedEl.textContent = t('แตะจุดบนแผนที่ หรือเลือกจากรายชื่อ เพื่อดูว่าเป็นกล้องอะไร', 'Tap a square on the map, or choose from the list, to see which camera it is.')
    return
  }
  const c = picked
  const k = safeKind(c.k)
  const owner = typeof c.w === 'string' && /^https?:\/\//i.test(c.w)
    ? `<a class="btn" href="${esc(c.w)}" target="_blank" rel="noopener noreferrer">${esc(t('ดูที่เจ้าของ', 'View at owner'))} ↗</a>`
    : ''
  const studyBtn = isReadable(c) ? `<button class="btn primary" type="button" data-picked-study>${esc(t('ศึกษากล้องนี้', 'Study this'))}</button>` : ''
  const why = isReadable(c) ? '' : `<span class="micro picked-why">${esc(t('เครื่องอ่านพิกเซลของกล้องนี้ไม่ได้จากที่นี่ ดูได้ที่เว็บของเจ้าของเท่านั้น', 'No machine here can read this camera\'s pixels; it can only be watched at its owner\'s site.'))}</span>`
  pickedEl.innerHTML = `
    <strong class="picked-name">${esc(camName(c))}</strong>
    ${c.loc && c.loc !== c.th ? `<span class="micro">${esc(c.loc)}</span>` : ''}
    <span class="micro"><i class="sw sw-${k}" aria-hidden="true"></i>${esc(kindName(k))} · ${esc(sourceName(c.src))} · <span class="num">${c.lat.toFixed(4)}, ${c.lng.toFixed(4)}</span></span>
    ${why}
    <span class="controls picked-actions">${studyBtn}${owner}</span>`
}

pickedEl.addEventListener('click', (e) => {
  if (e.target.closest('[data-picked-study]')) study(picked)
})

// ── Map, list, filters ────────────────────────────────────────────────

const map = createMap(document.querySelector('[data-map]'), {
  onPick: (cam) => { picked = cam; renderPicked(); list.mark(cam) },
  onView: (v) => { document.querySelector('[data-map-zoom]').textContent = `×${n(Math.round(v.s * 10) / 10)}` },
})

const list = createList(document.querySelector('[data-atlas-list]'), {
  onStudy: study,
  onPick: (cam) => show(cam),
})

function show(cam) {
  picked = cam
  map.show(cam)
  list.mark(cam)
  renderPicked()
}

function paintCount() {
  if (!cameras.length) return
  mapCount.textContent = t(`แสดง ${n(inView.length)} จาก ${n(cameras.length)} กล้อง`, `${n(inView.length)} of ${n(cameras.length)} cameras shown`)
}

function applyFilter(state) {
  inView = cameras.filter((c) => matches(c, state))
  map.setFilter((c) => matches(c, state))
  list.set(inView)
  list.mark(picked)
  paintCount()
}

document.querySelector('[data-zoom-in]').addEventListener('click', () => map.zoom(2))
document.querySelector('[data-zoom-out]').addEventListener('click', () => map.zoom(0.5))
document.querySelector('[data-zoom-reset]').addEventListener('click', () => map.reset())

// ── Census ────────────────────────────────────────────────────────────

createCensus(document.querySelector('[data-census]'), {
  getPool: () => inView,
  onStudy: study,
})

// ── Start ─────────────────────────────────────────────────────────────

renderPicked()
onLang(renderPicked)

// The bench opens a camera only when someone scrolls to it or asks — unless
// the URL asked for the visitor's own camera, which is the whole point of ?source=mine.
const wantedId = new URLSearchParams(location.search).get('cam')
if (wantsWebcam()) {
  bench.start()
  benchRoot.scrollIntoView({ block: 'start' })
} else if (!wantedId) {
  whenVisible(benchRoot, () => bench.start())
}

loadCatalog().then((data) => {
  cameras = data.cameras
  mapState.hidden = true
  paintFigures(data)
  map.setCameras(cameras)
  const sources = [...new Set(cameras.map((c) => c.src))]
  const filters = createFilters(document.querySelector('[data-filters]'), sources, applyFilter)
  applyFilter(filters.state)
  onLang(paintCount)
  const wanted = wantedId ? byId(cameras, wantedId) : null
  if (wanted && isReadable(wanted)) study(wanted)
  else if (wantedId) whenVisible(benchRoot, () => bench.start())
}).catch(() => {
  mapState.textContent = t('โหลดรายชื่อกล้องไม่ได้ ลองโหลดหน้านี้ใหม่ — กล้องของคุณยังใช้ได้ที่ม้านั่งด้านล่าง', 'Could not load the camera list. Try reloading — your own camera still works on the bench below.')
  if (wantedId) whenVisible(benchRoot, () => bench.start())
})
