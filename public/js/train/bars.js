// Score bars for one learner: one row per class, the leader marked in signal.
// Built with DOM calls, not markup strings, because class names are typed by
// the visitor and widths are set from script (the CSP forbids style="").

import { pct } from '../core/i18n.js'

/** container: an element with class "bars". */
export function createBars(container) {
  let rows = []

  /** labels: ['● Hand up', '■ Hand down', …] */
  function setLabels(labels) {
    if (rows.length === labels.length) {
      labels.forEach((text, i) => { rows[i].name.textContent = text })
      return
    }
    rows = labels.map((text) => {
      const row = document.createElement('div')
      row.className = 'bar'
      const name = document.createElement('span')
      name.textContent = text
      const track = document.createElement('span')
      track.className = 'bar-track'
      const fill = document.createElement('span')
      fill.className = 'bar-fill'
      track.append(fill)
      const value = document.createElement('span')
      value.className = 'num'
      value.textContent = '—'
      row.append(name, track, value)
      return { row, name, fill, value }
    })
    container.replaceChildren(...rows.map((r) => r.row))
  }

  /** probs: array summing to 1, or null for "no answer yet". */
  function setProbs(probs) {
    const top = probs ? probs.indexOf(Math.max(...probs)) : -1
    rows.forEach((r, i) => {
      const p = probs?.[i]
      r.fill.style.width = p == null ? '0%' : `${(p * 100).toFixed(1)}%`
      r.value.textContent = p == null ? '—' : pct(p)
      r.row.classList.toggle('top', i === top)
    })
  }

  return { setLabels, setProbs }
}
