// Games: three ways to measure yourself against the detector. Each game owns
// its bench and its own picture source, and none of them downloads the
// neural network until someone presses its start button.

import '../core/site.js?v=1.19.2'
import { initCount } from '../games/count.js?v=1.19.2'
import { initPixels } from '../games/pixels.js?v=1.19.2'
import { initFool } from '../games/fool.js?v=1.19.2'

initCount(document.querySelector('#count'))
initPixels(document.querySelector('#pixels'))
initFool(document.querySelector('#fool'))
