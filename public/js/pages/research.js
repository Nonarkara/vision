// All illustrations and explanations remain readable without JavaScript.
import '../core/site.js?v=1.16.0'

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
import { t, bi, onLang } from '../core/i18n.js'
import { createRewardLearner } from '../research/reward.js'
for (const interaction of document.querySelectorAll('.learning-interaction')) interaction.hidden = false
const labelButton = document.querySelector('[data-reveal-labels]')
labelButton.addEventListener('click', () => {
  const show = labelButton.getAttribute('aria-pressed') !== 'true'
  labelButton.setAttribute('aria-pressed', String(show))
  for (const answer of document.querySelectorAll('.learning-answer')) answer.hidden = !show
})
const grouped = document.querySelector('[data-grouped-objects]')
const objects = [...grouped.querySelectorAll('li')]
for (const button of document.querySelectorAll('[data-group-by]')) {
  button.addEventListener('click', () => {
    const feature = button.dataset.groupBy
    for (const choice of document.querySelectorAll('[data-group-by]')) choice.setAttribute('aria-pressed', String(choice === button))
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
  const results = rewardLearner.snapshot()
  const score = result => result.count ? `${result.value >= 0 ? '+' : ''}${result.value.toFixed(2)}` : t('ยังไม่รู้', 'unknown')
  document.querySelector('[data-reward-values]').textContent = t(`คะแนนเฉลี่ยที่เรียนรู้: ซ้าย ${score(results[0])} / ขวา ${score(results[1])}`, `Learned average rewards: left ${score(results[0])} / right ${score(results[1])}`)
  document.querySelector('[data-reward-readout]').textContent = lastAction === null
    ? t('ยังไม่ได้ลองทางไหน ลองทั้งสองทาง แล้วให้หุ่นยนต์เลือกดู', 'No paths tried yet. Try both, then let the robot choose.')
    : t(`ครั้งล่าสุด: ทาง${lastAction === 0 ? 'ซ้าย +1' : 'ขวา −1'} · ลองซ้าย ${results[0].count} ครั้ง ขวา ${results[1].count} ครั้ง`, `Last try: ${lastAction === 0 ? 'left +1' : 'right −1'} · Left tried ${results[0].count} times, right ${results[1].count} times.`)
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
