// The story: control-room photographs the machine can count, a live wall it
// can watch, and the people who made this.

import '../core/site.js?v=1.11.1'
import { lang } from '../core/i18n.js'
import { createWall } from '../story/wall.js'
import { createExhibits } from '../story/exhibits.js'

createExhibits(document.querySelector('.exhibits'))
createWall(document.getElementById('try'))

const clock = document.querySelector('[data-rec-clock]')
const tick = () => {
  clock.textContent = new Date().toLocaleString(lang() === 'th' ? 'th-TH' : 'en-GB', { hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
tick()
setInterval(tick, 1000)
