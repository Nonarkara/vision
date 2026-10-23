// Shared page behaviour: the language switch and one toast. Imported by every page.

import { lang, setLang, nextLang, onLang, t, noteMissingTranslation } from './i18n.js?v=1.20.1'
import { initFullscreen } from './fullscreen.js?v=1.20.1'
import { konamiStep } from './konami.js?v=1.20.1'

for (const btn of document.querySelectorAll('[data-lang-toggle]')) {
  btn.addEventListener('click', () => setLang(nextLang(lang())))
}

// Room navigation is a disclosure on small screens, not a permanent second bar.
const roomToggle = document.querySelector('.room-toggle')
const roomNavigation = document.querySelector('.room-navigation')
if (roomToggle && roomNavigation) {
  const closeRooms = () => {
    roomToggle.setAttribute('aria-expanded', 'false')
    roomNavigation.dataset.open = 'false'
    roomNavigation.querySelectorAll('details[open]').forEach(el => { el.open = false })
  }
  roomNavigation.dataset.collapsible = 'true'
  roomToggle.addEventListener('click', () => {
    const open = roomToggle.getAttribute('aria-expanded') !== 'true'
    roomToggle.setAttribute('aria-expanded', String(open))
    roomNavigation.dataset.open = String(open)
  })
  document.addEventListener('click', e => { if (!roomNavigation.contains(e.target)) closeRooms() })
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return
    const more = roomNavigation.querySelector('details[open]')
    if (more) { more.open = false; more.querySelector('summary').focus(); e.preventDefault() }
    else if (roomToggle.getAttribute('aria-expanded') === 'true') { closeRooms(); roomToggle.focus(); e.preventDefault() }
  })
}

// Accessible names are read aloud, not shown, so they need both languages too.
// Any element carrying data-aria-th / data-aria-en gets its aria-label painted
// now and repainted on every switch — a screen-reader user switching to Thai
// should not keep hearing English.
function paintAria() {
  const l = lang()
  for (const el of document.querySelectorAll('[data-aria-th]')) {
    const text = l === 'zh' ? (el.dataset.ariaZh || el.dataset.ariaEn) : l === 'en' ? el.dataset.ariaEn : el.dataset.ariaTh
    if (text) el.setAttribute('aria-label', text)
  }
}
paintAria()
onLang(paintAria)

// Chinese is being written room by room. Where a room has none, the English
// stays visible — and the reader is told that, rather than left to wonder
// whether an English page is simply what Chinese looks like.
noteMissingTranslation()
onLang(() => noteMissingTranslation())

// A room link that straddles the scroller is a half word against the chevron
// (08–10 at 1024–1280). Hide that link. Scrolling it away would walk the rail
// to the end and cut 01 off the left, and there is no chevron back.
// Four pixels of slack: a link's own padding can pass the edge without a
// letter being cut. At the end of the list the last rooms stay visible.
export function roomIsClipped({ edge, left, right, atEnd, start = null }) {
  const cutsRight = !atEnd && right > edge + 4 && left < edge - 4
  const cutsLeft = start != null && left < start - 4 && right > start + 4
  return cutsRight || cutsLeft
}

// The room rail scrolls sideways and hides its scrollbar. At widths too narrow
// to hold all ten rooms that reads as a list that simply ends, with no hint
// that three more exist — so the chevron is shown only while there is actually
// somewhere to scroll to, and taken away again once you reach the end.
// Named navRail/roomsRail to stay clear of the `rail` used further down for the
// anchor-offset work; a duplicate `const rail` kills the whole module.
const navRail = document.querySelector('.rail')
const roomsRail = document.querySelector('.rooms')
const railMore = document.querySelector('[data-rail-more]')
if (navRail && roomsRail && railMore) {
  const paintClip = () => {
    const max = roomsRail.scrollWidth - roomsRail.clientWidth
    const atEnd = max <= 4 || roomsRail.scrollLeft >= max - 1
    const box = roomsRail.getBoundingClientRect()
    for (const link of roomsRail.querySelectorAll(':scope > a')) {
      const r = link.getBoundingClientRect()
      const clipped = roomIsClipped({ edge: box.right, left: r.left, right: r.right, atEnd, start: box.left })
      link.classList.toggle('is-clipped', clipped)
    }
  }
  const syncMore = () => {
    // Measure with the chevron pulled out of the layout first. It sits in the
    // rail's flex row, so while it is on screen it takes width away from
    // .rooms — and a rail that overflows only *because* the chevron is showing
    // would then keep the chevron showing, forever, for no reason.
    const showing = navRail.dataset.more === 'true'
    if (showing) railMore.style.display = 'none'
    const room = roomsRail.scrollWidth - roomsRail.clientWidth > 4
    if (showing) railMore.style.display = ''
    navRail.dataset.more = String(room)
    railMore.setAttribute('aria-hidden', String(!room))
    railMore.tabIndex = room ? 0 : -1
    paintClip()
  }
  railMore.addEventListener('click', () => {
    roomsRail.scrollBy({ left: Math.round(roomsRail.clientWidth * 0.8), behavior: 'smooth' })
  })
  roomsRail.addEventListener('scroll', syncMore, { passive: true })
  addEventListener('resize', syncMore, { passive: true })
  onLang(syncMore)
  syncMore()
}

let toastTimer = null
/** Transient feedback. Also announced, because a toast nobody can hear is a toast half the audience misses. */
export function toast(message, ms = 3200) {
  let el = document.querySelector('.toast')
  if (!el) {
    el = document.createElement('div')
    el.className = 'toast'
    el.setAttribute('role', 'status')
    el.setAttribute('aria-live', 'polite')
    document.body.append(el)
  }
  el.textContent = message
  el.hidden = false
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { el.hidden = true }, ms)
}

/** Run `fn` when `el` first scrolls near the viewport — heavy benches wait until wanted. */
export function whenVisible(el, fn, rootMargin = '200px') {
  if (!('IntersectionObserver' in window)) return fn()
  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) { io.disconnect(); fn() }
  }, { rootMargin })
  io.observe(el)
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * The page's own yes/no. window.confirm() renders in the browser's language
 * with the browser's button words, which is exactly wrong for a page that
 * offers both Thai and English. Resolves true for OK, false for cancel.
 */
export function confirmBox(message, { ok = 'OK', cancel = 'Cancel' } = {}) {
  return new Promise((resolve) => {
    const scrim = document.createElement('div')
    scrim.className = 'confirm-scrim'
    const box = document.createElement('div')
    box.className = 'confirm-box'
    box.setAttribute('role', 'alertdialog')
    box.setAttribute('aria-modal', 'true')
    const p = document.createElement('p')
    p.textContent = message
    const controls = document.createElement('div')
    controls.className = 'controls'
    const no = document.createElement('button')
    no.type = 'button'
    no.className = 'btn'
    no.textContent = cancel
    const yes = document.createElement('button')
    yes.type = 'button'
    yes.className = 'btn primary'
    yes.textContent = ok
    controls.append(no, yes)
    box.append(p, controls)
    scrim.append(box)
    document.body.append(scrim)
    const previous = document.activeElement
    yes.focus()

    const close = (answer) => {
      scrim.remove()
      document.removeEventListener('keydown', onKey, true)
      previous?.focus?.()
      resolve(answer)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); close(false) }
      if (e.key === 'Enter') { e.preventDefault(); close(true) }
      if (e.key === 'Tab') { e.preventDefault(); (document.activeElement === yes ? no : yes).focus() }
    }
    yes.addEventListener('click', () => close(true))
    no.addEventListener('click', () => close(false))
    scrim.addEventListener('pointerdown', (e) => { if (e.target === scrim) close(false) })
    document.addEventListener('keydown', onKey, true)
  })
}

initFullscreen()

// Konami code: ↑ ↑ ↓ ↓ ← → ← → B A. Machine vision is a view, not an account.
function setMachine(on, announce) {
  document.documentElement.dataset.machine = on ? '1' : '0'
  try { sessionStorage.setItem('vision_machine_v1', on ? '1' : '0') } catch { /* this tab only */ }
  document.querySelector('.machine-scan')?.remove()
  if (on) {
    const bar = document.createElement('div')
    bar.className = 'machine-scan'
    bar.setAttribute('aria-hidden', 'true')
    document.body.append(bar)
  }
  document.dispatchEvent(new CustomEvent('machinevision', { detail: { on } }))
  if (announce) toast(on
    ? t('โหมดสายตาเครื่องเปิด — ขอบ การเคลื่อนไหว สิ่งของ', 'Machine vision on — edges, motion, objects')
    : t('โหมดสายตาเครื่องปิด', 'Machine vision off'))
}
try { if (sessionStorage.getItem('vision_machine_v1') === '1') setMachine(true, false) } catch { /* leave it off */ }
let konamiBuf = []
document.addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return
  if (/input|textarea|select/i.test(e.target?.tagName || '')) return
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key
  const step = konamiStep(konamiBuf, key)
  konamiBuf = step.buf
  if (!step.fire) return
  setMachine(document.documentElement.dataset.machine !== '1', true)
})

// Match anchor offsets to the rail after wrapping, zooming or switching language.
const rail = document.querySelector('.rail')
if (rail && 'ResizeObserver' in window) {
  new ResizeObserver(() => {
    document.documentElement.style.setProperty('--rail-height', `${rail.getBoundingClientRect().height}px`)
  }).observe(rail)
}
