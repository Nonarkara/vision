// All illustrations and explanations remain readable without JavaScript.
import '../core/site.js?v=1.16.1'
import { evidence } from '../core/catalog.js'

// The evidence strip: live numbers from the same catalogue the map reads, so
// the about chapter's claims and the cameras page's dots can never disagree.
// The counting rule lives in catalog.js next to isReadable; this file only
// writes the answer down.
function paintFigures() {
  return fetch('/api/cameras').then((r) => r.json()).then((d) => {
    latestCameras = d
    renderFigures(d)
  }).catch(() => {})
}
// The catalogue is a few thousand cameras; re-render the numbers from the last
// answer instead of refetching the whole list just to reformat it.
let latestCameras = null
function renderFigures(d) {
  const figures = evidence(d)
  if (!figures) return
  for (const [k, v] of Object.entries(figures)) {
    const el = document.querySelector(`[data-fig="${k}"]`)
    // n(), not toLocaleString(): a bare call formats in the BROWSER's locale,
    // so a Thai-locale browser showed Thai numerals on the English page while
    // every other figure on the site followed the page's own language.
    if (el) el.textContent = typeof v === 'number' ? n(v) : '—'
  }
}
paintFigures()
// The numbers are written once, at load. Redraw them when the language changes.
document.addEventListener('langchange', () => (latestCameras ? renderFigures(latestCameras) : paintFigures()))

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

// Three teaching illustrations; only the one-step reward example learns values.
import { bi, n, onLang } from '../core/i18n.js'
import { createRewardLearner, describeReward } from '../research/reward.js'
for (const interaction of document.querySelectorAll('.learning-interaction')) interaction.hidden = false
const labelButton = document.querySelector('[data-reveal-labels]')
labelButton.addEventListener('click', () => {
  const show = labelButton.getAttribute('aria-pressed') !== 'true'
  labelButton.setAttribute('aria-pressed', String(show))
  for (const answer of document.querySelectorAll('.learning-answer')) answer.hidden = !show
})
const grouped = document.querySelector('[data-grouped-objects]')
// The list items themselves, in their original order: grouping MOVES them into
// new lists, so the flat view is rebuilt from this array rather than kept.
const objects = [...grouped.querySelectorAll('li')]
for (const button of document.querySelectorAll('[data-group-by]')) {
  button.addEventListener('click', () => {
    const feature = button.dataset.groupBy
    for (const choice of document.querySelectorAll('[data-group-by]')) choice.setAttribute('aria-pressed', String(choice === button))
    const flat = document.createElement('ul')
    flat.className = 'learning-objects'
    if (feature === 'none') { flat.append(...objects); grouped.replaceChildren(flat); return }
    const keys = feature === 'shape' ? ['circle', 'square'] : ['red', 'yellow']
    const names = feature === 'shape' ? [['วงกลม', 'Circles'], ['สี่เหลี่ยม', 'Squares']] : [['สีส้ม', 'Orange'], ['สีเหลือง', 'Yellow']]
    const groups = document.createElement('div')
    groups.className = 'learning-groups'
    keys.forEach((key, i) => {
      const group = document.createElement('div')
      const heading = document.createElement('h4')
      heading.innerHTML = bi(...names[i])
      const list = document.createElement('ul')
      list.className = 'learning-objects'
      list.append(...objects.filter(object => object.dataset[feature] === key))
      group.append(heading, list)
      groups.append(group)
    })
    grouped.replaceChildren(groups)
  })
}
let rewardLearner = createRewardLearner()
let lastAction = null
function paintReward() {
  const { values, readout } = describeReward(rewardLearner.snapshot(), lastAction)
  document.querySelector('[data-reward-values]').textContent = values
  document.querySelector('[data-reward-readout]').textContent = readout
}
function tryPath(index) {
  lastAction = index
  rewardLearner.observe(index, index === 0 ? 1 : -1)
  paintReward()
}
for (const button of document.querySelectorAll('[data-reward-action]')) button.addEventListener('click', () => tryPath(Number(button.dataset.rewardAction)))
document.querySelector('[data-reward-choose]').addEventListener('click', () => tryPath(rewardLearner.choose()))
document.querySelector('[data-reward-reset]').addEventListener('click', () => {
  rewardLearner = createRewardLearner()
  lastAction = null
  paintReward()
})
onLang(paintReward)
paintReward()
