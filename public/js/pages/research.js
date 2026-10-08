// All illustrations and explanations remain readable without JavaScript.
import '../core/site.js'

const choices = [...document.querySelectorAll('[data-history-choice]')]
const panels = [...document.querySelectorAll('[data-history-panel]')]
function selectHistory(id) {
  for (const choice of choices) choice.setAttribute('aria-pressed', String(choice.dataset.historyChoice === id))
  for (const panel of panels) panel.hidden = panel.dataset.historyPanel !== id
}
for (const choice of choices) choice.addEventListener('click', () => selectHistory(choice.dataset.historyChoice))
if (choices.length) {
  document.querySelector('.history-choices').hidden = false
  selectHistory(choices[0].dataset.historyChoice)
}
