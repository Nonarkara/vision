// "Ask the machine to count": run the real detector over the six control-room
// photographs and count screens (COCO "tv") against people. It cannot tell
// who is looking at what — and says so. Same model, same honesty as every
// other room: every box carries its class and its score.

import { detect, loadDetector } from '../ml/detector.js'
import { drawDetections } from '../cv/draw.js'
import { t, n } from '../core/i18n.js'

const PERSON = 1
const CHAIR = 62
const TV = 72
const INPUT_WIDTH = 640

function frameOf(img) {
  const c = document.createElement('canvas')
  c.width = INPUT_WIDTH
  c.height = Math.round((INPUT_WIDTH * img.naturalHeight) / img.naturalWidth)
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
  return c
}

function paint(shot, detections) {
  const canvas = shot.querySelector('canvas')
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  canvas.width = Math.round(canvas.clientWidth * dpr)
  canvas.height = Math.round(canvas.clientHeight * dpr)
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  drawDetections(ctx, detections, { x: 0, y: 0, w: canvas.width, h: canvas.height })
}

function countLine(c) {
  return `${t('จอ', 'screens')} ${n(c.tv)} · ${t('คน', 'people')} ${n(c.person)} · ${t('เก้าอี้', 'chairs')} ${n(c.chair)}`
}

export function createExhibits(root) {
  const btn = root.querySelector('[data-ask]')
  const say = root.querySelector('[data-ask-say]')
  const shots = [...root.querySelectorAll('[data-shot]')]
  const results = new Map()

  function summary() {
    const total = { tv: 0, person: 0, chair: 0 }
    for (const c of results.values()) for (const k in total) total[k] += c[k]
    for (const [shot, c] of results) shot.querySelector('[data-count]').textContent = countLine(c)
    if (!results.size) return
    const lead = `${t('หกห้อง เครื่องนับได้', 'Six rooms. The machine found')} ${countLine(total)}.`
    // Say what this particular run shows, not what we hoped it would show.
    const why = total.tv === 0
      ? t('จอศูนย์จอ ทั้งที่จอเต็มผนัง เพราะ “tv” ในชุดข้อมูล COCO คือทีวีในห้องนั่งเล่น ผนังจอสี่สิบช่องคือสิ่งที่มันไม่เคยเรียน และเก้าอี้เป็นแถวก็นับไม่ครบ คนที่มันเห็นส่วนใหญ่คือผู้มาเยือน ไม่ใช่คนเฝ้าจอ เห็นไหม เครื่องก็พลาดได้ นี่คือเหตุผลที่ต้องเรียนว่ามันเห็นอะไรจริง ๆ',
          'Zero screens — in rooms made of screens — because COCO\'s “tv” is a living-room television; a forty-feed video wall is something it never learned. It misses most of the chairs, too, and most of the people it does see are visitors, not operators. The machine misses things as well. That is exactly why this classroom exists.')
      : t('มันบอกไม่ได้ว่าใครกำลังดูจอไหน และผนังจอที่ต่อกันเป็นผืนมักถูกนับเป็นจอเดียว เครื่องก็พลาดได้',
          'It cannot tell who is looking at which screen, and a seamless video wall often counts as one “tv”. The machine misses things too.')
    say.textContent = `${lead}\n${why}`
  }

  btn.addEventListener('click', async () => {
    btn.disabled = true
    const onProgress = (e) => { if (e.detail.name === 'detector' && !e.detail.done) say.textContent = `${t('กำลังโหลดโครงข่ายประสาทเทียม', 'Loading the neural network')} ${Math.round(e.detail.p * 100)}%` }
    document.addEventListener('modelprogress', onProgress)
    try {
      await loadDetector()
      for (const shot of shots) {
        const img = shot.querySelector('img')
        if (!img.complete) await img.decode().catch(() => {})
        say.textContent = `${t('กำลังดู', 'Looking at')} ${shot.querySelector('.shot-tag').textContent.split(' ')[0]}…`
        const { detections } = await detect(frameOf(img), { minScore: 0.3 })
        const c = { tv: 0, person: 0, chair: 0 }
        for (const d of detections) {
          if (d.cls === TV) c.tv++
          else if (d.cls === PERSON) c.person++
          else if (d.cls === CHAIR) c.chair++
        }
        results.set(shot, c)
        shot.detections = detections
        paint(shot, detections)
        summary()
      }
    } catch {
      say.textContent = t('โหลดโครงข่ายประสาทเทียมไม่ได้ ลองอีกครั้ง', 'Could not load the neural network — try again')
    } finally {
      document.removeEventListener('modelprogress', onProgress)
      btn.disabled = false
    }
  })

  // Boxes are drawn in canvas pixels: redraw when the layout or the language changes.
  const redraw = () => { for (const shot of shots) if (shot.detections) paint(shot, shot.detections); summary() }
  window.addEventListener('resize', redraw)
  document.addEventListener('langchange', redraw)
}
