// Game 1 — Count race. A frame freezes; you count vehicles (or people)
// before the clock runs out; then the detector's boxes appear with their
// scores. Neither side is the answer key: you referee each round after a
// second, slower look — which is, not by accident, how training labels get made.

import { t, bi, n, onLang } from '../core/i18n.js'
import { STREET } from '../ml/labels.js'
import { drawDetections } from '../cv/draw.js'
import { startSpecimen } from '../core/specimen.js?v=1.12.0'
import { paint, drawUnsure, huntFrame, readyDetector, benchSpecimen, readBest, writeBest, sayDetections } from './common.js'

const ROUNDS = 5
const COUNT_MS = 15_000
const BEST_KEY = 'vision_games_count_best_v1'
const TARGETS = {
  vehicles: { classes: STREET.filter((c) => c !== 1), th: 'ยานพาหนะ', en: 'vehicles' },
  people: { classes: [1], th: 'คน', en: 'people' },
}

export function initCount(root) {
  const $ = (sel) => root.querySelector(sel)
  const canvas = $('[data-count-canvas]')
  const stateEl = $('[data-count-state]')
  const clockEl = $('[data-count-clock]')
  const youEl = $('[data-count-you]')
  const sayEl = $('[data-count-say]')
  const thr = $('[data-count-thr]')
  const thrOut = $('[data-count-thr-out]')
  const go = $('[data-count-go]')
  const judgeRow = $('[data-count-judge]')
  const scoreEl = document.querySelector('[data-count-score]')
  const targetBtns = [...root.querySelectorAll('[data-count-target]')]
  const specimen = benchSpecimen($('[data-specimen]'), { prefer: 'still' })

  let phase = 'idle' // idle · loading · counting · revealed · judged · over
  let target = 'vehicles'
  let match = { round: 0, you: 0, machine: 0, draws: 0 }
  let round = null // { frame, detections, guess }
  let deadline = 0
  let timer = 0
  let best = readBest(BEST_KEY)

  const threshold = () => Number(thr.value) / 100
  const wanted = (d) => TARGETS[target].classes.includes(d.cls)
  const sure = () => round.detections.filter((d) => wanted(d) && d.score >= threshold())
  const unsure = () => round.detections.filter((d) => wanted(d) && d.score < threshold())

  function state(text) {
    stateEl.hidden = !text
    stateEl.textContent = text ?? ''
  }

  function draw() {
    if (!round) return
    const { ctx, rect } = paint(canvas, round.frame)
    if (phase !== 'revealed' && phase !== 'judged' && phase !== 'over') return
    drawUnsure(ctx, unsure(), rect)
    drawDetections(ctx, sure(), rect)
  }

  function explain() {
    const you = round.guess
    const machine = sure().length
    const what = t(TARGETS[target].th, TARGETS[target].en)
    const lines = [`${t('คุณ', 'You')}: ${n(you)} · ${t('เครื่อง', 'Machine')}: ${n(machine)} ${what} (${t('ที่ความมั่นใจ', 'at')} ≥ ${Math.round(threshold() * 100)}%)`]
    if (sure().length) lines.push(`${t('เครื่องเห็น', 'It saw')}: ${sayDetections(sure())}`)
    if (machine < you) lines.push(t('เครื่องนับได้น้อยกว่า ลองหา: คันที่ถูกคันอื่นบังอยู่ คันเล็ก ๆ ที่ไกลออกไป และกรอบสีเทา — สิ่งที่มันเห็นครึ่ง ๆ กลาง ๆ แต่ให้คะแนนต่ำกว่าเกณฑ์', 'The machine counted fewer. Look for ones hidden behind others, tiny ones far down the road, and grey boxes — things it half-saw but scored below the threshold.'))
    else if (machine > you) lines.push(t('เครื่องนับได้มากกว่า ลองดูว่า: มีคันไหนถูกตีกรอบซ้ำสองครั้ง มีรถจอดที่คุณไม่ได้นับ หรือมีเงา ป้าย แสงสะท้อน ที่มันคิดว่าเป็นรถ', 'The machine counted more. Check for one thing boxed twice, parked ones you skipped, or shadows, signs and reflections it took for the real thing.'))
    else lines.push(t('ได้เท่ากัน แต่ยังไม่ได้แปลว่าถูกทั้งคู่ ดูว่ากรอบอยู่บนสิ่งเดียวกับที่คุณนับหรือเปล่า', 'Same number — which does not prove you are both right. Check the boxes sit on the same things you counted.'))
    if (unsure().length) lines.push(t(`กรอบสีเทา ${n(unsure().length)} กรอบ: เครื่องเห็นแต่ไม่มั่นใจพอ ลองเลื่อนเกณฑ์ดู ตัวเลขของเครื่องจะเปลี่ยน`, `${n(unsure().length)} grey box(es): seen but not sure enough. Move the threshold and watch the machine's count change.`))
    return lines.join('\n')
  }

  function scoreLine() {
    const parts = [
      `${t('คุณ', 'You')} ${n(match.you)}`,
      `${t('เครื่อง', 'Machine')} ${n(match.machine)}`,
      `${t('เสมอ', 'Ties')} ${n(match.draws)}`,
      `${t('รอบ', 'Round')} ${n(match.round)}/${n(ROUNDS)}`,
    ]
    if (best) parts.push(`${t('สถิติดีสุดของคุณ', 'Your best')}: ${n(best)}/${n(ROUNDS)}`)
    return parts.join(' · ')
  }

  function render() {
    const counting = phase === 'counting'
    const between = phase === 'idle' || phase === 'judged' || phase === 'over'
    youEl.textContent = n(round?.guess ?? 0)
    for (const b of root.querySelectorAll('[data-count-minus], [data-count-plus], [data-count-lock]')) b.disabled = !counting
    for (const b of targetBtns) { b.disabled = !between; b.setAttribute('aria-pressed', String(b.dataset.countTarget === target)) }
    $('[data-count-slider]').hidden = !(phase === 'revealed' || phase === 'judged' || phase === 'over')
    judgeRow.hidden = phase !== 'revealed'
    go.hidden = !between
    go.innerHTML = phase === 'idle' ? bi('เริ่มเกม', 'Start')
      : phase === 'over' ? bi('เล่นอีกเกม', 'Play again')
      : bi(`รอบถัดไป (${match.round + 1}/${ROUNDS})`, `Next round (${match.round + 1}/${ROUNDS})`)
    thrOut.textContent = `${thr.value}%`
    scoreEl.textContent = scoreLine()
    if (phase === 'revealed' || phase === 'judged') sayEl.textContent = explain()
    if (phase === 'over') sayEl.textContent = `${explain()}\n\n${finalLine()}`
    if (phase === 'idle') sayEl.textContent = t('กด “เริ่มเกม” ภาพจะหยุดนิ่ง แล้วคุณมี 15 วินาที', 'Press “Start”. A frame will freeze and you get 15 seconds.')
    if (phase === 'counting') sayEl.textContent = t(`นับ${TARGETS[target].th}ในภาพ แล้วกด “นับเสร็จ”`, `Count the ${TARGETS[target].en} in the picture, then press “Done”.`)
    draw()
  }

  function finalLine() {
    if (match.you > match.machine) return t(`จบเกม: คุณชนะ ${match.you} ต่อ ${match.machine}`, `Match over: you win ${match.you}–${match.machine}.`)
    if (match.machine > match.you) return t(`จบเกม: เครื่องชนะ ${match.machine} ต่อ ${match.you}`, `Match over: the machine wins ${match.machine}–${match.you}.`)
    return t(`จบเกม: เสมอ ${match.you} ต่อ ${match.machine}`, `Match over: level at ${match.you}–${match.machine}.`)
  }

  function tick() {
    const left = Math.max(0, deadline - performance.now())
    clockEl.textContent = `${(left / 1000).toFixed(1)} s`
    if (left <= 0) reveal()
  }

  async function beginRound() {
    if (phase === 'over') match = { round: 0, you: 0, machine: 0, draws: 0 }
    phase = 'loading'
    round = null
    render()
    sayEl.textContent = ''
    try {
      await readyDetector(state)
      if (!specimen.source?.ready) {
        state(t('กำลังหากล้องที่ตอบ…', 'Finding a camera that answers…'))
        await startSpecimen(specimen)
      }
      if (!specimen.source?.ready) throw new Error(t('ยังไม่มีภาพ ลองกด ↻ หรือใช้กล้องหรือรูปของคุณ', 'No picture yet — press ↻, or use your own camera or photo'))
      state(t('เครื่องกำลังดูภาพ (คุณยังไม่เห็นคำตอบของมัน)…', 'The machine is looking (you will not see its answer yet)…'))
      const found = await huntFrame(specimen, { wanted, minScore: 0.4, say: state })
      if (!found) throw new Error(t('ไม่ได้ภาพ ลองใหม่อีกครั้ง', 'Could not get a frame — try again'))
      round = { frame: found.frame, detections: found.detections, guess: 0 }
    } catch (err) {
      phase = match.round ? 'judged' : 'idle'
      render()
      state(err.message)
      return
    }
    state('')
    phase = 'counting'
    deadline = performance.now() + COUNT_MS
    clearInterval(timer)
    timer = setInterval(tick, 100)
    tick()
    render()
  }

  function reveal() {
    if (phase !== 'counting') return
    clearInterval(timer)
    clockEl.textContent = '0.0 s'
    phase = 'revealed'
    render()
  }

  function judge(who) {
    if (phase !== 'revealed') return
    match = {
      ...match,
      round: match.round + 1,
      you: match.you + (who === 'you' ? 1 : 0),
      machine: match.machine + (who === 'machine' ? 1 : 0),
      draws: match.draws + (who === 'draw' ? 1 : 0),
    }
    phase = match.round >= ROUNDS ? 'over' : 'judged'
    if (phase === 'over' && match.you > best) { best = match.you; writeBest(BEST_KEY, best) }
    render()
  }

  function bump(delta) {
    if (phase !== 'counting') return
    round = { ...round, guess: Math.max(0, round.guess + delta) }
    youEl.textContent = n(round.guess)
  }

  $('[data-count-plus]').addEventListener('click', () => bump(1))
  $('[data-count-minus]').addEventListener('click', () => bump(-1))
  $('[data-count-lock]').addEventListener('click', reveal)
  go.addEventListener('click', beginRound)
  thr.addEventListener('input', render)
  for (const b of judgeRow.querySelectorAll('[data-judge]')) b.addEventListener('click', () => judge(b.dataset.judge))
  for (const b of targetBtns) b.addEventListener('click', () => { target = b.dataset.countTarget; render() })

  // Your own camera rarely shows traffic; count people there instead.
  specimen.on((src) => {
    if (src?.kind === 'webcam' && target === 'vehicles' && phase !== 'counting') { target = 'people'; render() }
  })

  onLang(render)
  new ResizeObserver(draw).observe(canvas)
  state(t('ยังไม่ได้โหลดอะไร กด “เริ่มเกม” เมื่อพร้อม', 'Nothing loaded yet. Press “Start” when you are ready.'))
  render()
}
