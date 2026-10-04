// Shared page behaviour: the TH/EN switch and one toast. Imported by every page.

import { lang, setLang } from './i18n.js'
import { initFullscreen } from './fullscreen.js'

for (const btn of document.querySelectorAll('[data-lang-toggle]')) {
  btn.addEventListener('click', () => setLang(lang() === 'th' ? 'en' : 'th'))
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

initFullscreen()

// Match anchor offsets to the rail after wrapping, zooming or switching language.
const rail = document.querySelector('.rail')
if (rail && 'ResizeObserver' in window) {
  new ResizeObserver(() => {
    document.documentElement.style.setProperty('--rail-height', `${rail.getBoundingClientRect().height}px`)
  }).observe(rail)
}
