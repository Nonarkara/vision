import '../core/site.js?v=1.10.0'
import { t, bi, onLang } from '../core/i18n.js'
import { openWebcam } from '../core/source.js?v=1.10.0'
import { faceSignals, createSession } from '../focus/session.js'

const root = document.querySelector('[data-focus-room]')
const el = (name) => root.querySelector(`[data-${name}]`)
const canvas = el('face-view'), ctx = canvas.getContext('2d')
let phase = 'idle', reason = '', source = null, worker = null, timer = null, watchdog = null, wake = null
let cancelLoading = null
let ticket = 0, session = createSession(), baseline = null, calibration = [], calibrated = 0
let lastFresh = 0, calibrationStarted = 0
let started = 0, deadline = 0, current = null, busy = false, lastVideo = -1
const names = { facing: ['หันตรง', 'Facing forward'], away: ['หันออก', 'Looking away'], absent: ['ไม่เห็นใบหน้าเดียว', 'No single face seen'] }
function time(s) { return `${Math.floor(s / 60).toString().padStart(2, '0')}:${Math.floor(s % 60).toString().padStart(2, '0')}` }
function paint() {
  const d = session.data, active = ['loading', 'calibrating', 'running'].includes(phase)
  el('start').disabled = !el('consent').checked || active
  el('start').innerHTML = phase === 'paused' ? bi('เริ่มต่อ', 'Resume') : phase === 'finished' ? bi('เริ่มใหม่ (ล้างสรุป)', 'New session (clears summary)') : bi('ยินยอมและเริ่ม', 'Agree & start')
  el('pause').disabled = !active; el('stop').disabled = !(active || phase === 'paused')
  el('calibrate').disabled = phase !== 'running'
  el('duration').disabled = phase !== 'idle' && phase !== 'finished'
  el('threshold').disabled = phase !== 'idle' && phase !== 'finished'
  el('clear').disabled = active
  el('export').disabled = !d.samples
  root.querySelectorAll('[data-mood]').forEach((b) => { b.disabled = !d.samples })
  const status = {
    idle: t('กล้องปิด · อ่านคำยินยอมก่อนเริ่ม', 'Camera off · Read the consent before starting'),
    loading: t('กำลังเตรียมโมเดลและกล้อง… กดพักเพื่อยกเลิกได้', 'Preparing model and camera… Pause cancels this.'),
    calibrating: t(`มองหน้าจอตามปกติ · ตั้งค่า ${Math.round(calibrated / 10 * 100)}%`, `Look at the screen normally · Calibration ${Math.round(calibrated / 10 * 100)}%`),
    running: t('กล้องเปิด · กำลังวัดในอุปกรณ์นี้', 'Camera on · Measuring on this device'),
    paused: t('พักแล้ว · กล้องปิด กดเริ่มต่อเมื่อพร้อม', 'Paused · Camera off. Resume when ready.'),
    finished: t('จบแล้ว · กล้องปิด สรุปอยู่ด้านล่าง', 'Finished · Camera off. Review below.'),
  }
  const message = reason || status[phase]
  if (el('status').textContent !== message) el('status').textContent = message
  el('clock').textContent = time(d.observed)
  const metric = (th, en, value) => `<div class="session-metric"><strong>${value}</strong>${bi(th,en)}</div>`
  el('metrics').innerHTML = metric('เวลาที่วัดได้', 'Measured time', time(d.observed)) + metric('ครั้งที่หันออก', 'Look-away events', d.awayEvents) + metric('ครั้งที่ไม่เห็นใบหน้า', 'Face-absent events', d.absentEvents) + metric('ครั้งที่หลับตานาน', 'Long eye closures', d.eyeEvents)
  el('signals').textContent = current ? `${t(...names[current.state])} · ${t('หันตรง', 'Facing')} ${time(d.facing)} · ${t('หันออก', 'Away')} ${time(d.away)} · ${t('ไม่เห็นใบหน้า', 'Absent')} ${time(d.absent)} · ${t('หลับตา', 'Eyes closed')} ${time(d.eyes)}` : t('ยังไม่มีข้อมูล · เวลาที่ซ่อนแท็บและตั้งท่าไม่รวมในเวลาที่วัด', 'No measurements yet · Hidden time and calibration are excluded')
  el('timeline').replaceChildren(...d.timeline.map((m) => {
    const bar = document.createElement('div'); bar.className = 'minute'
    bar.title = `${t('นาที', 'Minute')} ${m.minute + 1}: ${t('หันตรง', 'Facing')} ${Math.round(m.facing)}s, ${t('หันออก', 'Away')} ${Math.round(m.away)}s, ${t('ไม่เห็นใบหน้า', 'Absent')} ${Math.round(m.absent)}s`
    for (const kind of ['facing','away','absent']) { const part = document.createElement('i'); part.className = kind; part.style.flex = String(m[kind]); bar.append(part) }
    return bar
  }))
  const moodNames = { okay:['สบายดี','Okay'], happy:['มีความสุข','Happy'], tired:['เหนื่อย','Tired'], stressed:['เครียด','Stressed'], unsure:['ไม่แน่ใจ','Unsure'] }
  el('mood-notes').textContent = d.moods.slice(-6).map((m)=>`${time(m.observedSeconds)} · ${t(...moodNames[m.value])}`).join(' / ')
}
function release() {
  ticket++
  cancelLoading?.(); cancelLoading = null
  clearTimeout(timer); clearTimeout(watchdog); timer = watchdog = null
  source?.close(); source = null
  worker?.terminate(); worker = null
  wake?.release().catch(() => {}); wake = null
  busy = false; session.gap(); lastVideo = -1
  ctx.fillStyle = '#171917'; ctx.fillRect(0,0,canvas.width,canvas.height)
}
function halt(next, message = '') { release(); phase = next; reason = message; paint() }
async function start() {
  if (!el('consent').checked || document.hidden) return
  if (phase !== 'paused') {
    session = createSession({ threshold: Number(el('threshold').value) }); baseline = null; calibration = []; calibrated = 0; current = null
    started = Date.now(); deadline = started + Number(el('duration').value) * 60000
  }
  if (Date.now() >= deadline) return halt('finished', t('ครบเวลาที่เลือกแล้ว · กล้องปิด', 'Session time reached · Camera off'))
  phase = 'loading'; reason = ''; paint()
  const mine = ++ticket
  try {
    const w = worker = new Worker('/js/focus/worker.js')
    await new Promise((resolve, reject) => {
      cancelLoading = () => reject(new Error('cancelled'))
      watchdog = setTimeout(() => reject(new Error(t('โมเดลยังไม่พร้อม ลองใหม่อีกครั้ง', 'The model did not become ready. Try again.'))), 45000)
      w.onerror = () => reject(new Error(t('โหลดโมเดลไม่ได้ เบราว์เซอร์อาจไม่รองรับ', 'Model could not load. This browser may not support it.')))
      w.onmessage = ({ data }) => { if (data.type === 'ready') { clearTimeout(watchdog); cancelLoading = null; resolve() } else if (data.type === 'error') reject(new Error(t('โมเดลใบหน้าเริ่มไม่ได้ ลองใหม่หรือใช้เบราว์เซอร์อื่น', 'Face model could not start. Try again or use another browser.'))) }
      w.postMessage({ type: 'load' })
    })
    if (mine !== ticket) return
    const camera = await openWebcam({ facing: 'user' })
    if (mine !== ticket) { camera.close(); return }
    source = camera; source.onended = () => halt('paused', t('กล้องหยุดแล้ว · ตรวจสิทธิ์แล้วกดเริ่มต่อ', 'Camera stopped · Check permission, then resume.'))
    if (el('awake').checked && navigator.wakeLock) {
      try { const lock = await navigator.wakeLock.request('screen'); if (mine !== ticket) await lock.release(); else wake = lock } catch { /* optional: session still works */ }
    }
    if (mine !== ticket) return
    phase = baseline ? 'running' : 'calibrating'; calibrationStarted = lastFresh = performance.now()
    w.onerror = () => halt('paused', t('โมเดลหยุดทำงาน · กล้องปิด ลองเริ่มต่อ', 'Model stopped · Camera off. Try resuming.'))
    w.onmessage = ({ data }) => {
      if (mine !== ticket) return
      clearTimeout(watchdog); busy = false
      if (data.type === 'error') return halt('paused', t('วิเคราะห์ภาพไม่ได้ · กล้องปิด ลองเริ่มต่อ', 'Analysis failed · Camera off. Try resuming.'))
      if (data.type !== 'result') return
      const signal = faceSignals(data.result)
      if (!baseline) {
        if (signal && signal.eyes < 0.5) { calibration.push(signal); calibrated++ } else { calibration = []; calibrated = 0 }
        if (calibrated >= 10 && ['yaw','pitch'].some((k) => Math.max(...calibration.map((x)=>x[k])) - Math.min(...calibration.map((x)=>x[k])) > 0.15)) { calibration = []; calibrated = 0 }
        if (calibrated >= 10) { baseline = Object.fromEntries(['yaw','pitch','gaze'].map((k) => [k, calibration.reduce((s,x) => s+x[k],0)/10])); calibration = []; phase = 'running'; session.gap() }
      } else current = session.observe(signal, baseline, data.time)
      const rect = source.drawTo(ctx, canvas.width, canvas.height)
      ctx.fillStyle = '#f15a30'
      for (const face of data.result.faceLandmarks ?? []) for (let i=0; i<face.length; i+=4) { const p=face[i]; ctx.fillRect(rect.x+p.x*rect.w-1,rect.y+p.y*rect.h-1,2,2) }
      paint()
      // Keep live movement separate from the time summary.
      if (signal && baseline) el('signals').textContent += t(` · มุมปากยก ${Math.round(signal.smile*100)}% · อ้าปาก ${Math.round(signal.jaw*100)}% · คิ้วยก ${Math.round(signal.brow*100)}% (ไม่ใช่อารมณ์)`, ` · Mouth corners raised ${Math.round(signal.smile*100)}% · Jaw open ${Math.round(signal.jaw*100)}% · Brow raised ${Math.round(signal.brow*100)}% (not mood)`)
      timer = setTimeout(frame, 500)
    }
    paint(); frame()
  } catch (e) { if (mine === ticket) halt('paused', e.text ?? e.message) }
}
async function frame() {
  if (!source || busy) return
  if (document.hidden) return halt('paused')
  if (Date.now() >= deadline) return halt('finished', t('ครบเวลาที่เลือกแล้ว · กล้องปิด', 'Session time reached · Camera off'))
  if (!baseline && performance.now() - calibrationStarted > 120000) return halt('paused', t('ยังตั้งท่าปกติไม่ได้ · ใช้แสงสว่างและให้เห็นใบหน้าเดียว แล้วเริ่มต่อ', 'Calibration could not finish · Use good light and one face, then resume.'))
  if (source.el.currentTime === lastVideo) {
    if (performance.now() - lastFresh > 10000) return halt('paused', t('กล้องไม่ส่งภาพใหม่ · กล้องปิด ลองเริ่มต่อ', 'Camera stopped sending new frames · Camera off. Try resuming.'))
    timer = setTimeout(frame, 500); return
  }
  lastFresh = performance.now()
  lastVideo = source.el.currentTime
  const mine = ticket
  busy = true
  try {
    const bitmap = await createImageBitmap(source.canvas(480))
    if (mine !== ticket) { bitmap.close(); return }
    watchdog = setTimeout(() => halt('paused', t('การวัดไม่ตอบสนอง · กล้องปิด ลองเริ่มต่อ', 'Analysis stopped responding · Camera off. Try resuming.')), 10000)
    worker.postMessage({ type: 'frame', bitmap, time: performance.now() }, [bitmap])
  } catch { if (mine === ticket) halt('paused', t('อ่านภาพกล้องไม่ได้ · กล้องปิด', 'Camera frame could not be read · Camera off')) }
}
el('consent').addEventListener('change', () => { if (!el('consent').checked && ['loading','calibrating','running'].includes(phase)) halt('paused'); paint() })
el('start').addEventListener('click', start)
el('pause').addEventListener('click', () => halt('paused'))
el('stop').addEventListener('click', () => halt('finished'))
el('calibrate').addEventListener('click', () => { baseline = null; calibration = []; calibrated = 0; phase = 'calibrating'; calibrationStarted = performance.now(); current = null; session.gap(); paint() })
el('clear').addEventListener('click', () => { release(); phase = 'idle'; reason = ''; session = createSession(); baseline = null; current = null; started = deadline = 0; paint() })
root.querySelectorAll('[data-mood]').forEach((b) => b.addEventListener('click', () => { session.mood(b.dataset.mood); paint() }))
el('export').addEventListener('click', () => {
  const report = { experiment: 'Vision face & focus', version: 1, startedAt: new Date(started).toISOString(), exportedAt: new Date().toISOString(), thresholdSeconds: Number(el('threshold').value), note: 'Estimated movements only; looking away does not prove distraction. Mood notes are self-reported. No identity, photos or video.', ...session.data }
  const url = URL.createObjectURL(new Blob([JSON.stringify(report,null,2)], { type:'application/json' }))
  const a=document.createElement('a'); a.href=url; a.download='vision-session.json'; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url),1000)
})
document.addEventListener('visibilitychange', () => { if (document.hidden && ['loading','calibrating','running'].includes(phase)) halt('paused') })
window.addEventListener('pagehide', release)
onLang(paint)
paint()
