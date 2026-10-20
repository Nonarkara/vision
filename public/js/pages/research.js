// All illustrations and explanations remain readable without JavaScript.
import '../core/site.js?v=1.18.0'
import { evidence, loadCatalog } from '../core/catalog.js'

// Share the catalogue loader: language changes also reuse an in-flight request.
let latestCameras = null
let figuresLoading = false
let figuresFailed = false
const figureStatus = document.querySelector('[data-evidence-status]')
const retryFigures = document.querySelector('[data-evidence-retry]')
function paintFigureStatus() {
  retryFigures.hidden = !figuresFailed
  figureStatus.textContent = figuresLoading
    ? t('กำลังโหลดรายชื่อกล้อง…', 'Loading the camera catalogue…')
    : figuresFailed
      ? t('โหลดรายชื่อกล้องไม่ได้ ลองอีกครั้งได้ ตัวเลขที่ไม่ทราบจะแสดงเป็นขีด', 'The camera catalogue could not load. Try again; unknown counts stay as dashes.')
      : latestCameras?.loadedAt
        ? t('อัปเดตรายชื่อ: ', 'Catalogue updated: ') + new Intl.DateTimeFormat(lang() === 'th' ? 'th-TH' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Bangkok' }).format(new Date(latestCameras.loadedAt)) + t(' · เวลาไทย', ' · Bangkok time')
        : t('ยังไม่มีรายชื่อจากต้นทาง จำนวนยังไม่ทราบ ลองอีกครั้งภายหลัง', 'No upstream catalogue yet. Counts are unknown; try again later.')
  if (!figuresLoading && !figuresFailed && !latestCameras?.loadedAt) retryFigures.hidden = false
}
function renderFigures() {
  const figures = evidence(latestCameras)
  if (figures) for (const [k, v] of Object.entries(figures)) {
    const el = document.querySelector(`[data-fig="${k}"]`)
    if (el) el.textContent = typeof v === 'number' ? n(v) : '—'
  }
  paintFigureStatus()
}
async function paintFigures() {
  if (figuresLoading) return
  figuresLoading = true
  figuresFailed = false
  paintFigureStatus()
  try {
    latestCameras = await loadCatalog()
  } catch {
    figuresFailed = true
  } finally {
    figuresLoading = false
    renderFigures()
  }
}
retryFigures.addEventListener('click', () => {
  // A loaded-but-empty answer is cached by the shared loader; a fresh page
  // is needed to ask for the catalogue again in that case.
  if (latestCameras && !latestCameras.loadedAt) location.reload()
  else paintFigures()
})
paintFigures()
onLang(renderFigures)

const choices = [...document.querySelectorAll('[data-history-choice]')]
const panels = [...document.querySelectorAll('[data-history-panel]')]
const lessonChoices = [...document.querySelectorAll('[data-learning-choice]')]
const lessons = [...document.querySelectorAll('[data-learning-panel]')]
function selectHistory(id) {
  for (const choice of choices) choice.setAttribute('aria-pressed', String(choice.dataset.historyChoice === id))
  for (const panel of panels) panel.hidden = panel.dataset.historyPanel !== id
}
function selectLesson(id) {
  for (const choice of lessonChoices) choice.setAttribute('aria-pressed', String(choice.dataset.learningChoice === id))
  for (const lesson of lessons) lesson.hidden = lesson.dataset.learningPanel !== id
}
function followSectionLink() {
  const target = document.getElementById(location.hash.slice(1))
  const historyPanel = target?.closest('[data-history-panel]')
  const lesson = target?.closest('[data-learning-panel]')
  if (historyPanel) selectHistory(historyPanel.dataset.historyPanel)
  if (lesson) selectLesson(lesson.dataset.learningPanel)
  // Hash navigation happens before a hidden target is revealed.
  if (historyPanel || lesson) target.scrollIntoView({ block: 'start' })
}
for (const choice of choices) choice.addEventListener('click', () => {
  selectHistory(choice.dataset.historyChoice)
  history.replaceState(null, '', '#history-' + choice.dataset.historyChoice)
})
for (const choice of lessonChoices) choice.addEventListener('click', () => {
  selectLesson(choice.dataset.learningChoice)
  history.replaceState(null, '', '#lesson-' + choice.dataset.learningChoice)
})
if (choices.length) {
  document.querySelector('.history-choices').hidden = false
  selectHistory(choices[0].dataset.historyChoice)
}
if (lessonChoices.length) {
  document.querySelector('.learning-choices').hidden = false
  document.querySelector('.learning-cards').classList.add('is-guided')
  selectLesson(lessonChoices[0].dataset.learningChoice)
}
window.addEventListener('hashchange', followSectionLink)
followSectionLink()

// Three teaching illustrations; only the one-step reward example learns values.
import { bi, n, onLang, t, lang } from '../core/i18n.js'
import { createRewardLearner, describeReward } from '../research/reward.js?v=1.18.0'
for (const interaction of document.querySelectorAll('.learning-interaction')) interaction.hidden = false
const labelButton = document.querySelector('[data-reveal-labels]')
labelButton.addEventListener('click', () => {
  const show = labelButton.getAttribute('aria-pressed') !== 'true'
  labelButton.setAttribute('aria-pressed', String(show))
  for (const answer of document.querySelectorAll('.learning-answer')) answer.hidden = !show
  labelButton.innerHTML = show ? bi('ซ่อนเฉลยบนบัตร', 'Hide the answers on the cards') : bi('เปิดเฉลยบนบัตร', 'Show the answers on the cards')
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
  const results = rewardLearner.snapshot()
  const { values, readout, next } = describeReward(results, lastAction)
  for (const [index, result] of results.entries()) {
    const path = document.querySelector(`[data-reward-path="${index}"]`)
    path.dataset.chosen = String(lastAction === index)
    const outcome = !result.count ? t('ยังไม่เคยลอง', 'Not tried yet') : index === 0 ? t('ถึงเป้าหมาย · +1', 'Goal reached · +1') : t('เจอสิ่งกีดขวาง · −1', 'Obstacle hit · −1')
    document.querySelector(`[data-reward-result="${index}"]`).textContent = outcome
  }
  document.querySelector('[data-reward-values]').textContent = values
  document.querySelector('[data-reward-next]').textContent = next
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
