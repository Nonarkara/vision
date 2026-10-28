// /games — three games against the same detector.
//
// One game is on screen at a time. Three games stacked on one page gave a
// newcomer three goals and no entry point, which is exactly the shape an
// IKEA manual cannot take: a manual has one product in front of you. The
// picker makes the choice explicit, and each game carries its own manual.
//
// A game is wired the first time it is chosen, so the detector is not loaded
// for a game nobody plays.

import '../core/site.js?v=1.24.1'
import { initCount } from '../games/count.js?v=1.24.1'
import { initPixels } from '../games/pixels.js?v=1.24.1'
import { initFool } from '../games/fool.js?v=1.24.1'

const GAMES = ['count', 'pixels', 'fool']
const picker = document.querySelector('[data-game-picker]')
const sections = GAMES.map((id) => document.getElementById(id)).filter(Boolean)
const wired = new Set()

function wire(id) {
  if (wired.has(id)) return
  wired.add(id)
  if (id === 'count') initCount(document.getElementById('count'))
  else if (id === 'pixels') initPixels(document.getElementById('pixels'))
  else initFool(document.getElementById('fool'))
}

function showGame(id, updateUrl = true) {
  const target = GAMES.includes(id) ? id : GAMES[0]
  // Show it before wiring it: a game that measures its canvas while hidden
  // measures nothing.
  for (const el of sections) el.hidden = el.id !== target
  wire(target)
  for (const btn of picker.querySelectorAll('[data-game]')) {
    btn.setAttribute('aria-pressed', String(btn.dataset.game === target))
  }
  if (updateUrl) history.replaceState(null, '', `#${target}`)
}

picker.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-game]')
  if (btn) showGame(btn.dataset.game)
})

showGame(location.hash.slice(1), false)
