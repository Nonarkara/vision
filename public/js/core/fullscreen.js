// One enlarged instrument, with its controls intact. Native fullscreen when
// available; an accessible viewport mode on phones that do not offer it.
import { t, bi, onLang } from './i18n.js'

export function initFullscreen() {
  let active = null
  let restoreFocus = null
  let isolated = []
  const buttons = new Map()

  function paint() {
    for (const [panel, button] of buttons) {
      const expanded = active === panel || document.fullscreenElement === panel
      button.setAttribute('aria-pressed', String(expanded))
      button.innerHTML = `${expanded ? '↙' : '⛶'} ${expanded ? bi('ออกจากเต็มจอ', 'Exit full screen') : bi('เต็มจอ', 'Full screen')}`
      button.title = expanded ? t('ออกจากเต็มจอ (Esc)', 'Exit full screen (Esc)') : t('เต็มจอ', 'Full screen')
      button.setAttribute('aria-label', button.title)
    }
  }

  function exitViewport() {
    if (!active) return
    active.classList.remove('is-expanded')
    active = null
    document.body.classList.remove('instrument-open')
    for (const [el, inert] of isolated) el.inert = inert
    isolated = []
    paint()
    restoreFocus?.focus({ preventScroll: true })
    window.dispatchEvent(new Event('resize'))
  }

  function enterViewport(panel, button) {
    active = panel
    restoreFocus = button
    // Keep the instrument in place: canvas loops, game state and listeners survive.
    for (let child = panel; child.parentElement; child = child.parentElement) {
      for (const sibling of child.parentElement.children) {
        if (sibling !== child) { isolated.push([sibling, sibling.inert]); sibling.inert = true }
      }
    }
    panel.classList.add('is-expanded')
    document.body.classList.add('instrument-open')
    paint()
    button.focus({ preventScroll: true })
    window.dispatchEvent(new Event('resize'))
  }

  function credit(panel) {
    if (panel.querySelector('[data-specimen]') || !panel.querySelector('canvas[data-view], canvas[data-eye], canvas[data-lesson-view]')) return
    const bar = document.querySelector('[data-specimen]')
    const name = bar?.querySelector('[data-specimen-name]')
    const meta = bar?.querySelector('[data-specimen-meta]')
    if (!name) return
    let caption = panel.querySelector('.instrument-credit')
    if (!caption) {
      caption = document.createElement('div')
      caption.className = 'bench-caption instrument-credit'
      const bench = panel.classList.contains('bench') ? panel : panel.querySelector('.bench')
      bench.append(caption)
    }
    caption.replaceChildren(name.cloneNode(true), ...(meta ? [meta.cloneNode(true)] : []))
    // These are credits, not a second specimen bar.
    for (const el of caption.children) {
      el.removeAttribute('data-specimen-name')
      el.removeAttribute('data-specimen-meta')
    }
  }

  async function toggle(panel, button) {
    if (active) return exitViewport()
    credit(panel)
    if (document.fullscreenElement) {
      try { await document.exitFullscreen() } catch { /* the browser may already be exiting */ }
      return
    }
    // On narrow screens keep the browser's navigation available; the panel
    // still fills the viewport, with touch controls and an explicit exit.
    if (document.fullscreenEnabled && panel.requestFullscreen && window.matchMedia('(min-width: 821px)').matches) {
      try { await panel.requestFullscreen(); return } catch { /* viewport mode still works */ }
    }
    enterViewport(panel, button)
  }

  for (const bench of document.querySelectorAll('.bench')) {
    if (!bench.querySelector('canvas')) continue
    // Training needs its example buttons beside the camera while enlarged.
    const panel = bench.closest('.focus-room') ?? bench.closest('.video-lesson') ?? (bench.classList.contains('room-bench') ? bench.closest('.room-grid') : bench)
    panel.classList.add('instrument')
    let button = bench.querySelector('[data-fullscreen]')
    if (!button) {
      const toolbar = document.createElement('div')
      toolbar.className = 'instrument-tools'
      button = document.createElement('button')
      button.type = 'button'
      button.className = 'btn'
      button.dataset.fullscreen = ''
      toolbar.append(button)
      bench.prepend(toolbar)
    }
    buttons.set(panel, button)
    button.addEventListener('click', () => toggle(panel, button))
  }
  document.addEventListener('specimenchange', () => {
    const panel = active ?? document.fullscreenElement
    if (panel) credit(panel)
  })
  document.addEventListener('fullscreenchange', () => {
    paint()
    window.dispatchEvent(new Event('resize'))
  })
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && active) { event.preventDefault(); exitViewport() }
  })
  onLang(() => {
    paint()
    // The specimen's own language listener runs in the same event dispatch.
    queueMicrotask(() => {
      const panel = active ?? document.fullscreenElement
      if (panel) credit(panel)
    })
  })
  paint()
}
