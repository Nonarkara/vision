// Game 2 — Fewest pixels. One frame, shown first as a handful of huge
// blocks and then sharper step by step. You and the detector each get one
// guess from the same four choices; the detector commits only when it is at
// least 50% sure. Whoever is right at the coarser picture wins.
//
// The detector really does look at the blocky picture: ops.pixelate makes
// it, and that canvas is what goes into the network at every step.

import { t, bi, esc, n, lang, onLang } from '../core/i18n.js'
import { cocoName } from '../ml/labels.js'
import { detect } from '../ml/detector.js'
import { pixelate } from '../cv/ops.js'
import { drawDetections } from '../cv/draw.js'
import { startSpecimen } from '../core/specimen.js'
import { sleep } from '../core/site.js'
import { paint, drawUnsure, huntFrame, readyDetector, benchSpecimen, readBest, writeBest, biClass, shuffle, FLOOR_SCORE } from './common.js'

const ROUNDS = 5
const BLOCKS = [64, 40, 24, 14, 8, 4, 1] // pixels per block on a 640-wide frame; 1 is the sharp picture
const COMMIT = 0.5
const AUTO_STEP_MS = 900
const BEST_KEY = 'vision_games_pixels_best_v1'
// Things a camera or a room might plausibly hold — distractors come from here.
const POOL = [1, 2, 3, 4, 6, 8, 9, 10, 13, 15, 16, 17, 18, 28, 44, 47, 62, 63, 64, 72, 73, 77, 84, 85]

export function initPixels(root) {
  const $ = (sel) => root.querySelector(sel)
  const canvas = $('[data-pix-canvas]')
  const stateEl = $('[data-pix-state]')
  const levelEl = $('[data-pix-level]')
  const optionsEl = $('[data-pix-options]')
  const passBtn = $('[data-pix-pass]')
  const go = $('[data-pix-go]')
  const voidBtn = $('[data-pix-void]')
  const sayEl = $('[data-pix-say]')
  const logEl = $('[data-pix-log]')
  const scoreEl = document.querySelector('[data-pix-score]')
  const specimen = benchSpecimen($('[data-specimen]'), { prefer: 'still' })

  let phase = 'idle' // idle · loading · guessing · looking · done · over
  let match = { round: 0, you: 0, machine: 0, draws: 0 }
  let round = null
  let best = readBest(BEST_KEY)
  const work = document.createElement('canvas')

  function state(text) {
    stateEl.hidden = !text
    stateEl.textContent = text ?? ''
  }

  /** Make the blocky frame for `level`, paint it, and let the detector look at exactly that. */
  async function look(level) {
    const block = BLOCKS[level]
    const src = round.frame
    const img = src.getContext('2d').getImageData(0, 0, src.width, src.height)
    work.width = src.width
    work.height = src.height
    work.getContext('2d').putImageData(new ImageData(pixelate(img, block).data, src.width, src.height), 0, 0)
    paint(canvas, work, { smooth: false })
    const { detections } = await detect(work, { minScore: FLOOR_SCORE })
    const scores = Object.fromEntries(round.options.map((c) => [c, Math.max(0, ...detections.filter((d) => d.cls === c).map((d) => d.score))]))
    const top = round.options.reduce((a, b) => (scores[b] > scores[a] ? b : a))
    return { block, cols: Math.ceil(src.width / block), rows: Math.ceil(src.height / block), top, score: scores[top] }
  }

  async function showLevel(level) {
    round = { ...round, level }
    phase = 'looking'
    render()
    let view
    try {
      view = await look(level)
    } catch {
      round = null
      phase = match.round ? 'done' : 'idle'
      render()
      return state(t('เครื่องดูภาพไม่สำเร็จ ลองเริ่มรอบใหม่', 'The machine could not look at the picture — start the round again'))
    }
    round = { ...round, view }
    if (round.you) return machineMove()
    phase = 'guessing'
    render()
  }

  function personMove(choice) {
    if (phase !== 'guessing') return
    if (choice !== 'pass') round = { ...round, you: { cls: choice, at: round.level } }
    machineMove(choice)
  }

  async function machineMove(youChoice = null) {
    const { view, level } = round
    const commits = !round.machine && view.score >= COMMIT
    if (commits) round = { ...round, machine: { cls: view.top, at: level, score: view.score } }
    round = { ...round, log: [...round.log, { ...view, you: youChoice, machine: commits ? view.top : null }] }
    const last = level === BLOCKS.length - 1
    // Over when both have guessed, or the machine is already right: a later guess cannot beat it.
    if (last || (round.you && round.machine) || round.machine?.cls === round.key) return finish()
    if (round.you) { phase = 'looking'; render(); await sleep(AUTO_STEP_MS) }
    showLevel(level + 1)
  }

  function outcome() {
    const at = (who) => (who && who.cls === round.key ? who.at : Infinity)
    const you = at(round.you), machine = at(round.machine)
    if (you === Infinity && machine === Infinity) return 'none'
    return you < machine ? 'you' : machine < you ? 'machine' : 'draw'
  }

  function finish() {
    const result = outcome()
    round = { ...round, result }
    match = {
      ...match,
      round: match.round + 1,
      you: match.you + (result === 'you' ? 1 : 0),
      machine: match.machine + (result === 'machine' ? 1 : 0),
      draws: match.draws + (result === 'draw' ? 1 : 0),
    }
    phase = match.round >= ROUNDS ? 'over' : 'done'
    if (phase === 'over' && match.you > best) { best = match.you; writeBest(BEST_KEY, best) }
    render()
  }

  function voidRound() {
    if (!round?.result || round.voided) return
    const r = round.result
    match = {
      ...match,
      round: match.round - 1,
      you: match.you - (r === 'you' ? 1 : 0),
      machine: match.machine - (r === 'machine' ? 1 : 0),
      draws: match.draws - (r === 'draw' ? 1 : 0),
    }
    round = { ...round, voided: true }
    phase = 'done'
    render()
  }

  async function beginRound() {
    if (phase === 'over') match = { round: 0, you: 0, machine: 0, draws: 0 }
    phase = 'loading'
    round = null
    render()
    try {
      await readyDetector(state)
      if (!specimen.source?.ready) {
        state(t('กำลังหากล้องที่ตอบ…', 'Finding a camera that answers…'))
        await startSpecimen(specimen)
      }
      if (!specimen.source?.ready) throw new Error(t('ยังไม่มีภาพ ลองกด ↻ หรือใช้กล้องหรือรูปของคุณ', 'No picture yet — press ↻, or use your own camera or photo'))
      state(t('กำลังเตรียมภาพ…', 'Preparing a picture…'))
      const found = await huntFrame(specimen, { minScore: COMMIT, say: state })
      const keyDet = found?.detections.filter((d) => d.score >= COMMIT).sort((a, b) => b.score - a.score)[0]
      if (!keyDet) throw new Error(t('เครื่องไม่เห็นอะไรที่มั่นใจในภาพนี้ ลองหันกล้องไปที่ของใช้ทั่วไป เช่น ถ้วย ขวด เก้าอี้ หรือตัวคุณเอง แล้วเริ่มใหม่', 'The machine is not sure of anything in this picture. Point the camera at an everyday thing — a cup, a bottle, a chair, yourself — and start again.'))
      const seen = new Set(found.detections.map((d) => d.cls))
      const distractors = shuffle(POOL.filter((c) => !seen.has(c))).slice(0, 3)
      round = { frame: found.frame, all: found.detections, key: keyDet.cls, keyScore: keyDet.score, options: shuffle([keyDet.cls, ...distractors]), you: null, machine: null, log: [], level: 0 }
    } catch (err) {
      phase = match.round ? 'done' : 'idle'
      render()
      state(err.message)
      return
    }
    state('')
    showLevel(0)
  }

  function renderOptions() {
    const open = phase === 'guessing'
    optionsEl.innerHTML = (round?.options ?? []).map((c) => {
      const mine = round.you?.cls === c
      return `<button class="btn" type="button" data-pick="${c}" aria-pressed="${mine}"${open ? '' : ' disabled'}>${biClass(c)}</button>`
    }).join('')
    passBtn.hidden = !(open && round.level < BLOCKS.length - 1)
  }

  function cellYou(row) {
    if (row.you === null) return '—'
    if (row.you === 'pass') return t('ขอดูชัดขึ้น', 'sharper')
    return `${t('ทาย', 'guessed')} ${cocoName(row.you, lang())}`
  }

  // Until the round ends the machine's leaning stays hidden — otherwise you could copy it.
  function cellMachine(row) {
    if (!row.score) return t(`ไม่มีตัวเลือกไหนถึง ${Math.round(FLOOR_SCORE * 100)}%`, `none of the four reaches ${Math.round(FLOOR_SCORE * 100)}%`)
    const pctText = `${Math.round(row.score * 100)}%`
    if (!round.result) return row.machine ? t('ทายแล้ว (เปิดเผยตอนจบรอบ)', 'guessed (shown at the end)') : `${t('ยังไม่มั่นใจพอ', 'not sure enough')} (${pctText})`
    const s = `${cocoName(row.top, lang())} ${pctText}`
    return row.machine ? `${t('ทาย', 'guessed')} ${s}` : `${s} — ${t('ยังไม่มั่นใจพอ', 'not sure enough')}`
  }

  function renderLog() {
    if (!round?.log.length) { logEl.innerHTML = ''; return }
    const rows = round.log.map((r) => `<tr><td class="num">${esc(n(r.cols))} × ${esc(n(r.rows))}</td><td>${esc(cellYou(r))}</td><td>${esc(cellMachine(r))}</td></tr>`).join('')
    logEl.innerHTML = `<table class="table"><thead><tr><th>${bi('จำนวนบล็อก', 'Blocks')}</th><th>${bi('คุณ', 'You')}</th><th>${bi('เครื่อง (ความมั่นใจสูงสุดในสี่ตัวเลือก)', 'Machine (its top score among the four)')}</th></tr></thead><tbody>${rows}</tbody></table>`
  }

  function resultText() {
    const key = `${cocoName(round.key, lang())} (${t('เครื่องอ่านจากภาพชัด', 'machine, sharp picture')} ${Math.round(round.keyScore * 100)}%)`
    const verdict = {
      you: t('คุณชนะรอบนี้ — ทายถูกจากภาพที่หยาบกว่า', 'You win this round — right from a coarser picture.'),
      machine: t('เครื่องชนะรอบนี้ — ทายถูกจากภาพที่หยาบกว่า', 'The machine wins this round — right from a coarser picture.'),
      draw: t('เสมอ — ถูกทั้งคู่ที่ความหยาบเท่ากัน', 'A tie — both right at the same coarseness.'),
      none: t('ไม่มีใครถูก', 'Nobody got it.'),
    }[round.result]
    const lines = [`${t('เฉลย', 'Key')}: ${key}`, round.voided ? t('รอบนี้ถูกยกเลิก ไม่นับคะแนน', 'Round voided — it does not count.') : verdict]
    if (phase === 'over') lines.push(match.you > match.machine ? t(`จบเกม: คุณชนะ ${match.you} ต่อ ${match.machine}`, `Match over: you win ${match.you}–${match.machine}.`)
      : match.machine > match.you ? t(`จบเกม: เครื่องชนะ ${match.machine} ต่อ ${match.you}`, `Match over: the machine wins ${match.machine}–${match.you}.`)
      : t(`จบเกม: เสมอ ${match.you} ต่อ ${match.machine}`, `Match over: level at ${match.you}–${match.machine}.`))
    return lines.join('\n')
  }

  function drawFinal() {
    const { ctx, rect } = paint(canvas, round.frame)
    drawUnsure(ctx, round.all.filter((d) => d.score < COMMIT), rect)
    drawDetections(ctx, round.all.filter((d) => d.score >= COMMIT), rect)
  }

  function render() {
    const between = phase === 'idle' || phase === 'done' || phase === 'over'
    go.hidden = !between
    go.innerHTML = phase === 'idle' ? bi('เริ่มเกม', 'Start') : phase === 'over' ? bi('เล่นอีกเกม', 'Play again') : bi(`รอบถัดไป (${match.round + 1}/${ROUNDS})`, `Next round (${match.round + 1}/${ROUNDS})`)
    voidBtn.hidden = !(round?.result && !round.voided)
    renderOptions()
    renderLog()
    const v = round?.view
    levelEl.textContent = v && !between ? `${n(v.cols)} × ${n(v.rows)} ${t('บล็อก', 'blocks')}` : ''
    const parts = [`${t('คุณ', 'You')} ${n(match.you)}`, `${t('เครื่อง', 'Machine')} ${n(match.machine)}`, `${t('เสมอ', 'Ties')} ${n(match.draws)}`, `${t('รอบ', 'Round')} ${n(match.round)}/${n(ROUNDS)}`]
    if (best) parts.push(`${t('สถิติดีสุดของคุณ', 'Your best')}: ${n(best)}/${n(ROUNDS)}`)
    scoreEl.textContent = parts.join(' · ')
    if (phase === 'idle') sayEl.textContent = t('กด “เริ่มเกม” ภาพแรกจะหยาบมาก ทายได้ครั้งเดียว', 'Press “Start”. The first picture is very coarse. One guess each.')
    if (phase === 'guessing') sayEl.textContent = round.machine ? t('เครื่องทายไปแล้ว ถึงตาคุณ: เลือกคำตอบ หรือขอดูชัดขึ้น', 'The machine has guessed. Your turn: pick one, or ask for sharper.') : t('มีอะไรอยู่ในภาพ เลือกหนึ่งข้อ หรือขอดูชัดขึ้น', 'What is in this picture? Pick one, or ask for sharper.')
    if (phase === 'looking') sayEl.textContent = t('เครื่องกำลังดูภาพหยาบนี้…', 'The machine is looking at this coarse picture…')
    if ((phase === 'done' || phase === 'over') && round?.result) { sayEl.textContent = resultText(); drawFinal() }
  }

  optionsEl.addEventListener('click', (e) => {
    const b = e.target.closest('[data-pick]')
    if (b) personMove(Number(b.dataset.pick))
  })
  passBtn.addEventListener('click', () => personMove('pass'))
  go.addEventListener('click', beginRound)
  voidBtn.addEventListener('click', voidRound)
  onLang(render)
  new ResizeObserver(() => { if (round?.result) drawFinal(); else if (round?.view) paint(canvas, work, { smooth: false }) }).observe(canvas)
  state(t('ยังไม่ได้โหลดอะไร กด “เริ่มเกม” เมื่อพร้อม', 'Nothing loaded yet. Press “Start” when you are ready.'))
  render()
}
