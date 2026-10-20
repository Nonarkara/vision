// Align deep links after the fallback history panels have been collapsed.
export function revealSection(doc, hash) {
  const target = doc.getElementById(hash.slice(1))
  if (!target) return
  let disclosure = target.closest('details')
  while (disclosure) {
    disclosure.open = true
    disclosure = disclosure.parentElement?.closest('details')
  }
  target.scrollIntoView({ block: 'start' })
}
if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => revealSection(document, location.hash))
  document.addEventListener('DOMContentLoaded', () => {
    const initial = location.hash
    document.fonts.ready.then(() => {
      if (location.hash === initial) revealSection(document, initial)
    })
  }, { once: true })
}
