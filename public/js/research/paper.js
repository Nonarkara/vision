import { openPaperReader } from './pdf-reader.js?v=1.27.1'
// Two task views in the existing room; ordinary hash links retain deep links.
const tabs = [...document.querySelectorAll('[data-research-tab]')]
const panels = [...document.querySelectorAll('[data-research-panel]')]
function select() {
  const chosen = location.hash.startsWith('#paper') ? 'paper' : 'explore'
  for (const tab of tabs) {
    const active = tab.dataset.researchTab === chosen
    tab.setAttribute('aria-selected', String(active))
    tab.tabIndex = active ? 0 : -1
  }
  for (const panel of panels) panel.hidden = panel.dataset.researchPanel !== chosen
  if (chosen === 'paper') openPaperReader()
  if (location.hash === '#paper' || location.hash === '#explore') document.querySelector('.research-tabs').scrollIntoView({block:'start'})
  if (location.hash === '#paper-text' || location.hash.startsWith('#paper-ref-')) {
    document.querySelector('.paper-reading').open = true
    document.getElementById(location.hash.slice(1))?.scrollIntoView({block:'start'})
  }
}
for (const tab of tabs) tab.addEventListener('keydown', event => {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
  event.preventDefault()
  const next = event.key === 'Home' ? tabs[0] : event.key === 'End' ? tabs.at(-1) : tabs[(tabs.indexOf(tab) + 1) % tabs.length]
  next.click()
  next.focus()
})
window.addEventListener('hashchange', select)
select()
