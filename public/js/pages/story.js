// The story: control-room photographs the machine can count, a live wall it
// can watch, and the people who made this.

import '../core/site.js?v=1.24.3'
import { lang } from '../core/i18n.js?v=1.24.3'
import { createWall } from '../story/wall.js?v=1.24.3'
import { createExhibits } from '../story/exhibits.js?v=1.24.3'
import { createDrill } from '../story/blink.js?v=1.24.3'

createExhibits(document.querySelector('.exhibits'))
createWall(document.getElementById('try'))
createDrill(document.getElementById('try'))

const clock = document.querySelector('[data-rec-clock]')
const tick = () => {
  clock.textContent = new Date().toLocaleString(lang() === 'th' ? 'th-TH' : 'en-GB', { hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
tick()
setInterval(tick, 1000)
