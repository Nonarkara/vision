import '../core/site.js?v=1.24.0'
import { t, onLang } from '../core/i18n.js?v=1.24.0'
import { openWebcam } from '../core/source.js?v=1.24.0'
import { countHand, createCountTrigger, NOTES, SOLFEGE, saturation } from '../gesture/fingers.js?v=1.24.0'

const $ = s => document.querySelector(s)
const picture = $('[data-picture]'), ctx = picture.getContext('2d')
const marks = $('[data-marks]'), ink = marks.getContext('2d')
const confetti = $('[data-confetti]'), paper = confetti.getContext('2d')
const trigger = createCountTrigger()
let mode = 'celebrate', source = null, worker = null, ready = false, busy = false
let opening = false, inputTicket = 0, soundChosen = false
let ticket = 0, lastFrame = 0, deadline = 0, loadTimer = 0, animation = 0, effectTimer = 0
let count = null, manual = false, notes = [], audio = null, sound = false, voices = new Set()
let particles = [], effectAt = 0, visible = true
const phrases = [
  ['ไชโย!', 'Hooray!', '好耶！'], ['ฉลองกัน!', 'Confetti!', '撒彩纸！'],
  ['เยี่ยมเลย!', 'Bravo!', '真棒！'], ['สุดยอด!', 'Fantastic!', '太棒了！'],
  ['ไฮไฟว์!', 'High five!', '击个掌！'], ['ทำได้แล้ว!', 'You did it!', '成功了！'],
  ['ไปต่อเลย!', 'Keep it going!', '继续！'], ['เก่งมาก!', 'Wonderful!', '精彩！'],
  ['อีกนิด!', 'Almost ten!', '快到十了！'], ['ครบสิบ!', 'Ten out of ten!', '十分满分！'],
]
const instructions = {
  celebrate: ['1 นิ้ว = ไชโย! 2 นิ้ว = กระดาษฉลอง ลอง 3–10 เพื่อฉลองแบบอื่น', '1 finger: Hooray! 2: confetti. Try 3–10 for more celebrations.', '1 根手指：好耶！2 根：撒彩纸。试试 3–10 的更多庆祝效果。'],
  music: ['1–8 นิ้ว = โด เร มี ฟา ซอล ลา ที โดสูง เล่นทีละโน้ตตามจังหวะของคุณ', '1–8 fingers: Do, Re, Mi, Fa, Sol, La, Ti, high Do. Play one note at a time, at your own pace.', '1–8 根手指：Do、Re、Mi、Fa、Sol、La、Ti、高音 Do。按自己的节奏逐个弹奏。'],
  colour: ['1 นิ้ว = สีปกติ · 10 นิ้ว = ขาวดำ นิ้วที่เพิ่มขึ้นค่อย ๆ ลดสีในภาพ', '1 finger: full color. 10: black and white. Each extra finger fades more color from the picture.', '1 根手指：全彩。10 根：黑白。手指越多，画面颜色越淡。'],
}
let statusMessage = null
function message(th, en, zh) { statusMessage = [th, en, zh]; $('[data-status]').textContent = t(th, en, zh) }
function silence() {
  for (const voice of voices) { try { voice.stop() } catch { /* already finished */ } }
  voices.clear()
}
async function enableSound() {
  if (!sound) return
  try {
    const Audio = window.AudioContext || window.webkitAudioContext
    if (!Audio) throw new Error('audio unavailable')
    audio ??= new Audio()
    await audio.resume()
    if (!sound || document.hidden) { silence(); return }
    paintSound()
  } catch {
    sound = false; paintSound()
    message('เปิดเสียงไม่ได้ ลองปุ่มเปิดเสียงอีกครั้ง', 'Sound could not start. Try Sound on again.', '声音未能开启，请再次点击开启声音。')
  }
}
function tone(n) {
  if (!sound || audio?.state !== 'running' || !NOTES[n - 1]) return
  // Limit overlap even if someone drums the keyboard rapidly.
  if (voices.size >= 4) { const oldest = voices.values().next().value; oldest.stop(); voices.delete(oldest) }
  const oscillator = audio.createOscillator(), gain = audio.createGain(), now = audio.currentTime
  oscillator.frequency.value = NOTES[n - 1]
  gain.gain.setValueAtTime(0, now)
  gain.gain.linearRampToValueAtTime(.16, now + .012)
  gain.gain.exponentialRampToValueAtTime(.001, now + .35)
  oscillator.connect(gain); gain.connect(audio.destination)
  voices.add(oscillator)
  oscillator.onended = () => { voices.delete(oscillator); oscillator.disconnect(); gain.disconnect() }
  oscillator.start(); oscillator.stop(now + .36)
}
function paintSound() {
  $('[data-sound]').hidden = mode !== 'music'
  $('[data-sound]').textContent = sound ? t('ปิดเสียง', 'Mute', '静音') : t('เปิดเสียง', 'Sound on', '开启声音')
  $('[data-sound]').setAttribute('aria-pressed', String(sound))
}
function paint() {
  $('[data-instruction]').textContent = t(...instructions[mode])
  $('[data-source-label]').textContent = manual ? t('ตัวอย่างจากปุ่ม ไม่ใช่กล้อง', 'Button example · not the camera', '按钮示例 · 非摄像头') : count === null ? t('ยังไม่ได้นับนิ้ว', 'Not counting yet', '尚未开始计数') : t('นิ้วที่นับได้ตอนนี้', 'Fingers counted now', '当前检测到的手指')
  $('[data-count]').textContent = count ?? '—'
  $('.finger-response').dataset.active = String(count > 0)
  let answer, hint
  if (!count) {
    answer = count === 0 ? t('ชูนิ้วให้เห็น', 'Show your fingers', '请伸出手指') : t('เริ่มด้วย 1 นิ้ว', 'Start with 1 finger', '先试试 1 根手指')
    hint = t('หันฝ่ามือเข้ากล้อง ใช้สองมือสำหรับ 6–10 นิ้ว', 'Palms toward the camera. Use both hands for 6–10 fingers.', '手掌朝向摄像头。6–10 根需要两只手。')
  } else if (mode === 'celebrate') {
    answer = t(...phrases[count - 1])
    hint = t('กำนิ้วแล้วชูอีกครั้งเพื่อฉลองซ้ำ หรือกดตัวเลขซ้ำได้เลย', 'Close your fingers, then show them again to repeat. Number buttons can be pressed again straight away.', '先握拳再伸出，就能重复庆祝。数字按钮可以直接重复点击。')
  } else if (mode === 'music') {
    answer = count <= 8 ? SOLFEGE[count - 1] : t('ใช้ 1–8 นิ้วสำหรับเพลง', 'Use 1–8 for music', '音乐请用 1–8 根手指')
    hint = sound && audio?.state === 'running' ? t('กำนิ้วก่อนโน้ตเดิมซ้ำ เปลี่ยนจำนวนนิ้วเพื่อเปลี่ยนโน้ต', 'Close your fingers to repeat a note. Change the count to change the note.', '先握拳即可重复同一个音，改变手指数就能换音。') : t('กดเปิดเสียง แล้วลองโน้ตอีกครั้ง', 'Press Sound on, then play a note again.', '点击开启声音，再弹一次。')
  } else {
    answer = t(`สีเหลือ ${Math.round(saturation(count) * 100)}%`, `${Math.round(saturation(count) * 100)}% color`, `保留 ${Math.round(saturation(count) * 100)}% 颜色`)
    hint = t('เปลี่ยนเฉพาะภาพ ปุ่มและคำอธิบายยังอ่านได้เหมือนเดิม', 'Only the picture changes. Controls and words stay readable.', '只改变画面，按钮和文字保持清晰。')
  }
  $('[data-answer]').textContent = answer; $('[data-hint]').textContent = hint
  $('[data-notes]').textContent = mode === 'music' ? notes.join(' · ') : ''
  $('[data-meter]').hidden = mode !== 'colour'
  $('[data-saturation]').value = Math.round(saturation(count || 1) * 100)
  picture.style.filter = mode === 'colour' ? `saturate(${saturation(count || 1)})` : ''
  for (const button of document.querySelectorAll('[data-number]')) {
    const n = Number(button.dataset.number)
    button.setAttribute('aria-pressed', String(n === count))
    button.textContent = String(n)
    if (mode === 'music' && n <= 8) { const small = document.createElement('small'); small.textContent = SOLFEGE[n - 1]; button.append(small) }
  }
  paintSound()
}
function clearEffect() {
  clearTimeout(effectTimer); particles = []; paper.clearRect(0, 0, 800, 450); $('[data-banner]').hidden = true
}
function act(n, byButton = false) {
  count = n; manual = byButton
  $('[data-idle]').hidden = !!source || byButton
  if (mode === 'celebrate') {
    clearEffect()
    $('[data-banner]').textContent = t(...phrases[n - 1]); $('[data-banner]').hidden = false
    effectTimer = setTimeout(() => { $('[data-banner]').hidden = true }, 1500)
    if ([2, 5, 10].includes(n) && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      effectAt = performance.now()
      particles = Array.from({ length: 70 }, (_, i) => ({ x: Math.random() * 800, y: -Math.random() * 200, vx: (Math.random() - .5) * 90, vy: 130 + Math.random() * 150, color: ['#ebd3a2', '#b6bfc1', '#eb5324'][i % 3] }))
    }
  } else if (mode === 'music' && n <= 8) {
    tone(n); notes.push(SOLFEGE[n - 1]); notes = notes.slice(-12)
  }
  paint()
}
function example(n) {
  // Button input takes explicit ownership: a camera cannot immediately
  // overwrite the example. Start camera again to return to live input.
  if (opening || source || worker) stop(false)
  message('กล้องปิด · ภาพอยู่ในเครื่องคุณ', 'Camera off · pictures stay on your device.', '摄像头已关闭 · 画面留在本机。')
  const input = ++inputTicket
  if (mode === 'music') { enableSound().then(() => { if (input === inputTicket && mode === 'music' && !document.hidden) act(n, true) }) }
  else act(n, true)
}
function stop(announce = true) {
  ticket++; inputTicket++; opening = false; clearTimeout(loadTimer); clearTimeout(deadline)
  source?.close(); source = null
  worker?.terminate(); worker = null; ready = false; busy = false
  trigger.reset(); silence(); clearEffect(); ink.clearRect(0, 0, 800, 450)
  count = null; manual = false; notes = []
  $('[data-camera]').disabled = false; $('[data-camera]').hidden = false; $('[data-stop]').disabled = true; $('[data-stop]').hidden = true
  $('[data-idle]').hidden = false
  if (announce) message('กล้องปิดแล้ว ลองปุ่มตัวเลขหรือเปิดกล้องอีกครั้ง', 'Camera is off. Try the number buttons or start the camera again.', '摄像头已关闭。可试用数字按钮或重新开启。')
  paint(); drawExample()
}
function fail(th, en, zh) { stop(false); message(th, en, zh) }
async function start() {
  stop(false)
  const id = ticket
  opening = true
  $('[data-camera]').disabled = true; $('[data-camera]').hidden = true; $('[data-stop]').disabled = false; $('[data-stop]').hidden = false
  message('อนุญาตกล้องในเบราว์เซอร์ แล้วรอโหลดตัวอ่านมือครั้งแรกประมาณ 8 MB', 'Allow your camera in the browser. The hand reader downloads about 8 MB on first use.', '请在浏览器中允许摄像头，首次使用需要下载约 8 MB 的手部模型。')
  if (mode === 'music') enableSound()
  try {
    const next = await openWebcam()
    if (id !== ticket) { next.close(); return }
    source = next; opening = false
    source.onended = () => fail('กล้องหยุดแล้ว เปิดอีกครั้งได้', 'The camera stopped. You can start it again.', '摄像头已停止，可以重新开启。')
    $('[data-idle]').hidden = true
    worker = new Worker('/js/gesture/worker.js?v=1.24.0')
    loadTimer = setTimeout(() => fail('โหลดตัวอ่านมือไม่สำเร็จ ลองอีกครั้งหรือใช้ปุ่มตัวเลข', 'Hand reader took too long to load. Retry or use the number buttons.', '手部模型加载超时，请重试或使用数字按钮。'), 45000)
    worker.onerror = () => { if (id === ticket) fail('ตัวอ่านมือเปิดไม่ได้ ลองอีกครั้งหรือใช้ปุ่มตัวเลข', 'The hand reader could not start. Retry or use the number buttons.', '手部模型无法启动，请重试或使用数字按钮。') }
    worker.onmessage = ({ data }) => {
      if (id !== ticket) return
      if (data.type === 'ready') {
        clearTimeout(loadTimer); ready = true
        message('พร้อมแล้ว หันฝ่ามือเข้าหากล้อง แล้วชูนิ้ว', 'Ready. Face your palms toward the camera and show some fingers.', '准备好了。手掌朝向摄像头，伸出手指。')
      } else if (data.type === 'result') {
        clearTimeout(deadline); busy = false
        if (document.hidden || !visible) return
        const hands = data.result.worldLandmarks || []
        const n = hands.slice(0, 2).reduce((sum, points) => sum + countHand(points), 0)
        const changed = count !== n || manual
        count = n; manual = false
        drawMarks(data.result.landmarks || [])
        const fired = trigger.update(n, performance.now())
        if (fired) act(fired)
        else if (changed) paint()
      } else if (data.type === 'error') fail('อ่านมือไม่ได้ ลองเปิดกล้องอีกครั้งหรือใช้ปุ่มตัวเลข', 'Could not read hands. Restart the camera or use the number buttons.', '无法读取手部，请重新开启摄像头或使用数字按钮。')
    }
    worker.postMessage({ type: 'load' })
  } catch (error) {
    if (id !== ticket) return
    stop(false)
    message('เปิดกล้องไม่ได้ ตรวจสิทธิ์กล้องแล้วลองใหม่ หรือใช้ปุ่มตัวเลข', 'Camera could not open. Check camera permission or use the number buttons.', '无法开启摄像头。请检查权限或使用数字按钮。')
  }
}
function drawExample() {
  ctx.fillStyle = '#051230'; ctx.fillRect(0, 0, 800, 450)
  // A labelled color specimen makes the color activity usable before consent.
  const colors = ['#ebd3a2', '#b6bfc1', '#eb5324']
  colors.forEach((color, i) => { ctx.fillStyle = color; ctx.fillRect(100 + i * 200, 100, 175, 250) })
  ctx.fillStyle = '#ebd3a2'; ctx.font = '20px sans-serif'; ctx.textAlign = 'center'
  ctx.fillText(t('ภาพตัวอย่าง · ไม่ใช่ภาพกล้อง', 'Example picture · not a camera feed', '示例画面 · 非摄像头画面'), 400, 410)
}
function drawMarks(hands) {
  ink.clearRect(0, 0, 800, 450); ink.strokeStyle = '#eb5324'; ink.fillStyle = '#eb5324'; ink.lineWidth = 3
  for (const points of hands) {
    // Input bitmap is already mirrored by FrameSource, matching the preview.
    for (const chain of [[0,1,2,3,4],[0,5,6,7,8],[5,9,10,11,12],[9,13,14,15,16],[13,17,18,19,20],[0,17]]) {
      ink.beginPath(); chain.forEach((i, k) => { const p = points[i]; if (k) ink.lineTo(p.x * 800, p.y * 450); else ink.moveTo(p.x * 800, p.y * 450) }); ink.stroke()
    }
    for (const p of points) { ink.beginPath(); ink.arc(p.x * 800, p.y * 450, 4, 0, Math.PI * 2); ink.fill() }
  }
}
async function frame(now) {
  animation = requestAnimationFrame(frame)
  if (document.hidden || !visible) return
  if (source?.ready) {
    ctx.clearRect(0, 0, 800, 450); source.drawTo(ctx, 800, 450, 'cover')
    if (ready && !busy && now - lastFrame > 80) {
      busy = true; lastFrame = now
      const id = ticket
      try {
        const bitmap = await createImageBitmap(picture)
        if (id !== ticket || !worker) { bitmap.close(); return }
        worker.postMessage({ type: 'frame', bitmap, time: now }, [bitmap])
        deadline = setTimeout(() => fail('ตัวอ่านมือหยุดตอบ ลองเปิดกล้องอีกครั้ง', 'The hand reader stopped responding. Start the camera again.', '手部模型无响应，请重新开启摄像头。'), 8000)
      } catch { if (id === ticket) fail('อ่านภาพไม่ได้ ลองเปิดกล้องอีกครั้ง', 'Could not read the picture. Start the camera again.', '无法读取画面，请重新开启摄像头。') }
    }
  }
  if (particles.length) {
    paper.clearRect(0, 0, 800, 450)
    const age = (now - effectAt) / 1000
    for (const p of particles) {
      paper.fillStyle = p.color; paper.save(); paper.translate(p.x + p.vx * age, p.y + p.vy * age + age * age * 35); paper.rotate(age * 3 + p.x); paper.fillRect(-4, -7, 8, 14); paper.restore()
    }
    if (age > 2.5) { particles = []; paper.clearRect(0, 0, 800, 450) }
  }
}
for (let n = 1; n <= 10; n++) {
  const button = document.createElement('button'); button.className = 'btn'; button.dataset.number = n; button.type = 'button'
  button.addEventListener('click', () => example(n)); $('[data-keys]').append(button)
}
for (const button of document.querySelectorAll('[data-mode]')) button.addEventListener('click', () => {
  inputTicket++; mode = button.dataset.mode; count = null; notes = []; trigger.reset(); silence(); clearEffect()
  if (mode === 'music') { if (!soundChosen) { sound = true; soundChosen = true }; enableSound() }
  for (const b of document.querySelectorAll('[data-mode]')) b.setAttribute('aria-pressed', String(b === button))
  paint()
})
$('[data-camera]').addEventListener('click', start)
$('[data-stop]').addEventListener('click', () => stop())
$('[data-sound]').addEventListener('click', () => { soundChosen = true; sound = !sound; if (sound) enableSound(); else silence(); paint() })
document.addEventListener('keydown', event => {
  if (event.repeat || event.altKey || event.metaKey || event.ctrlKey || /^(INPUT|SELECT|TEXTAREA)$/.test(event.target.tagName) || event.target.isContentEditable) return
  if (/^[0-9]$/.test(event.key)) { event.preventDefault(); example(Number(event.key) || 10) }
})
document.addEventListener('visibilitychange', () => { trigger.reset(); if (document.hidden) { inputTicket++ }; if (document.hidden) { silence(); clearEffect(); ink.clearRect(0,0,800,450) } })
const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; if (!visible) { trigger.reset(); silence(); clearEffect() } })
observer.observe($('[data-stage]'))
window.addEventListener('pagehide', () => { stop(false); cancelAnimationFrame(animation); observer.disconnect(); audio?.close().catch(() => {}); audio = null })
window.addEventListener('pageshow', event => { if (event.persisted) { observer.observe($('[data-stage]')); animation = requestAnimationFrame(frame) } })
onLang(() => { paint(); if (statusMessage) message(...statusMessage); if (!source) drawExample() })
paint(); drawExample(); animation = requestAnimationFrame(frame)
