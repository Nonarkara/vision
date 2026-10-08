// Shared page behaviour: the TH/EN switch and one toast. Imported by every page.

import { lang, setLang, onLang } from './i18n.js'
import { initFullscreen } from './fullscreen.js?v=1.10.1'

for (const btn of document.querySelectorAll('[data-lang-toggle]')) {
  btn.addEventListener('click', () => setLang(lang() === 'th' ? 'en' : 'th'))
}

// Accessible names are read aloud, not shown, so they need both languages too.
// Any element carrying data-aria-th / data-aria-en gets its aria-label painted
// now and repainted on every switch — a screen-reader user switching to Thai
// should not keep hearing English.
function paintAria() {
  const key = lang() === 'en' ? 'ariaEn' : 'ariaTh'
  for (const el of document.querySelectorAll('[data-aria-th]')) {
    const text = el.dataset[key]
    if (text) el.setAttribute('aria-label', text)
  }
}
paintAria()
onLang(paintAria)

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

// Match anchor offsets to the rail after wrapping, zooming or switching language.
const rail = document.querySelector('.rail')
if (rail && 'ResizeObserver' in window) {
  new ResizeObserver(() => {
    document.documentElement.style.setProperty('--rail-height', `${rail.getBoundingClientRect().height}px`)
  }).observe(rail)
}
