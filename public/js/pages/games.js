// Games: three ways to measure yourself against the detector. Each game owns
// its bench and its own picture source. Count and Fewest pixels start a
// round on their own; Fool waits for a camera the visitor chooses.

import '../core/site.js?v=1.16.0'
import { initCount } from '../games/count.js'
import { initPixels } from '../games/pixels.js'
import { initFool } from '../games/fool.js'

initCount(document.querySelector('#count'))
initPixels(document.querySelector('#pixels'))
initFool(document.querySelector('#fool'))
