// The blink drill — the other half of the sentence.
//
// The wall above proves a machine can watch six screens at once. This proves
// the half that is easier to forget: that the person watching those same six
// screens does not catch what changed. You are not asked to take a study's word
// for it. You are asked to take the test, and then told your own score.
//
// How it works, plainly. Six real photographs — the same control rooms from the
// exhibits above — are frozen on screen. On each trial exactly one of them shows
// a patch of pixels changed by Δ grey levels, for a few tens of milliseconds,
// and then goes back. You get three seconds to press the screen you think
// flashed. The machine runs the same per-pixel comparison every frame, on all
// six at once, and reports the share of pixels that moved.
//
// The machine cannot get this wrong, and the drill says so out loud rather than
// hiding it: only one screen changes at a time, so "most pixels moved" is always
// the right answer. It is a deliberately easy problem. It is still the point —
// watching without blinking is the part of the job a machine can be trusted
// with, and the exhibits above are the standing reminder of everything a
// machine still gets wrong.
//
// No camera is opened, nothing leaves the device, and no score is stored.

import { toGray, grayToRgba } from '../cv/ops.js?v=1.24.2'
import { t, n, pct, onLang } from '../core/i18n.js?v=1.24.2'

export const SCREENS = 6
// The machine's own comparison threshold, in grey levels. It is set low on
// purpose: the drill is about the machine not blinking, not about the machine
// being strict. The threshold is printed on every result, so nothing is hidden.
export const MACHINE_THRESHOLD = 6
// Side of the flashed patch, as a share of the shorter side of a screen.
export const PATCH = 0.16
export const RESPOND_MS = 3000
export const LEAD_MIN_MS = 1400
export const LEAD_MAX_MS = 3200

/**
 * The ladder. Trial 0 is practice and is never scored: it is meant to be
 * obvious, so the task is learned before it is measured. Every later trial is
 * shorter and sits closer to the perceptual floor, which is where an operator's
 * misses come from — not one loud event, but the tenth quiet one.
 */
export const TRIALS = [
  { delta: 44, ms: 500, practice: true },
  { delta: 28, ms: 200 },
  { delta: 22, ms: 120 },
  { delta: 20, ms: 70 },
  { delta: 18, ms: 45 },
]

/**
 * Share of pixels that differ by at least `threshold`. The same comparison as
 * cv/ops.js diffMask(), counting the ones instead of keeping the mask — pinned
 * against diffMask in tests/blink.test.js so the two cannot drift apart.
 */
export function changedShare(a, b, threshold = MACHINE_THRESHOLD) {
  const len = Math.min(a.length, b.length)
  if (!len) return 0
  let changed = 0
  for (let i = 0; i < len; i++) if (Math.abs(a[i] - b[i]) >= threshold) changed++
  return changed / len
}

/** A copy of `gray` with one rectangle lifted by `delta`, clamped at both ends. */
export function shade(gray, width, height, rect, delta) {
  const out = Float32Array.from(gray)
  const x0 = Math.max(0, rect.x)
  const y0 = Math.max(0, rect.y)
  const x1 = Math.min(width, rect.x + rect.w)
  const y1 = Math.min(height, rect.y + rect.h)
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) out[y * width + x] += delta
  for (let i = 0; i < out.length; i++) {
    if (out[i] < 0) out[i] = 0
    else if (out[i] > 255) out[i] = 255
  }
  return out
}

/** Where the patch goes this trial. An injected `rand` keeps it testable. */
export function patchRect(width, height, rand = Math.random) {
  const side = Math.max(4, Math.round(Math.min(width, height) * PATCH))
  const w = Math.min(side, width)
  const h = Math.min(side, height)
  return {
    x: Math.round(rand() * Math.max(0, width - w)),
    y: Math.round(rand() * Math.max(0, height - h)),
    w,
    h,
  }
}

/**
 * One row of the trial log, built from what actually happened.
 *
 * `caught` is what the machine saw DURING the flash and is null when it saw
 * nothing — never a fallback to the truth. The first version of this drill read
 * the machine's live reading at reveal time instead, which is always null by then
 * (the frame went back), and quietly wrote the right answer in the machine's
 * column. A score that cannot come out wrong is not a score.
 */
export function recordTrial({ truth, yours, caught, delta, ms, practice = false, label = '' }) {
  return {
    label,
    truth,
    yours,
    machine: caught ? caught.screen : -1,
    share: caught ? caught.share : 0,
    delta,
    ms,
    practice,
  }
}

/** The tally. Practice never reaches here — it is filtered out before scoring. */
export function scoreDrill(rows) {
  const scored = rows.filter((r) => !r.practice)
  return {
    you: scored.filter((r) => r.yours === r.truth).length,
    machine: scored.filter((r) => r.machine === r.truth).length,
    rounds: scored.length,
    missed: scored.filter((r) => r.yours !== r.truth).length,
  }
}

const WORK_W = 192
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const pickLead = () => LEAD_MIN_MS + Math.random() * (LEAD_MAX_MS - LEAD_MIN_MS)

/**
 * `timings` exists so a test can drive a whole drill in milliseconds. The defaults
 * are the ones a visitor gets; nothing else reads them.
 */
export function createDrill(root, { lead = pickLead, respondMs = RESPOND_MS } = {}) {
  const wall = root.querySelector('[data-drill-wall]')
  const say = root.querySelector('[data-drill-say]')
  const log = root.querySelector('[data-drill-log]')
  const logBody = log.querySelector('[data-drill-rows]')
  const startBtn = root.querySelector('[data-drill-start]')
  const nextBtn = root.querySelector('[data-drill-next]')
  const againBtn = root.querySelector('[data-drill-again]')

  const screens = []
  const timers = new Set()
  let raf = 0
  let gen = 0
  let running = false
  let phase = 'idle' // idle · waiting · flash · respond · reveal · over
  let trialIndex = -1
  let rows = []
  let flashAt = 0
  let flashUntil = 0
  let flashGray = null
  let flashTile = -1
  let picked = null
  let machine = null
  let caught = null      // what the machine saw DURING the flash, kept past it

  function later(fn, ms) {
    const id = setTimeout(() => { timers.delete(id); fn() }, ms)
    timers.add(id)
  }

  function cancelTimers() {
    for (const id of timers) clearTimeout(id)
    timers.clear()
  }

  // ── the wall ─────────────────────────────────────────────────────────
  /**
   * The six photographs already on this page — no camera, no network, no permission.
   *
   * Queried from the document, NOT from `root`. The drill is mounted on #try and
   * the photographs sit in the exhibits section above it, so a scoped query found
   * nothing and every press answered "this page has fewer than six photographs" —
   * a feature that could never run and looked, in review, like it worked.
   */
  const specimenImages = () => [...document.querySelectorAll('.shots [data-shot] img')].slice(0, SCREENS)

  /** Only screens the browser actually delivered can be flashed or watched. */
  const usable = () => screens.filter((s) => s.ctx !== null)
  const pickTile = () => {
    const pool = usable()
    return pool[Math.floor(Math.random() * pool.length)]
  }

  /**
   * Wait for the exhibits, which are lazily loaded and are usually far above the
   * drill when someone presses its button. `decode()` alone is not enough: on an
   * image the browser has not started fetching it never settles, so this asks for
   * the load explicitly and gives up after a bounded wait rather than hanging on
   * "Opening the control-room photographs…" forever.
   */
  async function warmImages() {
    await Promise.all(specimenImages().map((img) => new Promise((done) => {
      img.loading = 'eager'
      if (img.complete && img.naturalWidth > 0) return done()
      const finish = () => done()
      img.addEventListener('load', finish, { once: true })
      img.addEventListener('error', finish, { once: true })
      if (img.decode) img.decode().then(finish, finish)
      setTimeout(finish, 8000)
    })))
    return specimenImages()
  }

  function buildWall() {
    // Clear first. `screens` is closure-scoped, and a rebuild after a first press
    // that could not decode every image used to PUSH six more entries onto the
    // old six. The wall then rendered twelve tiles — and because draw() and the
    // class toggles match on index, BOTH copies of the flashed screen lit up,
    // while the copy said one screen flashed. A duplicated answer is still a lie.
    screens.length = 0
    const imgs = specimenImages()
    if (imgs.length < SCREENS) return false
    for (let i = 0; i < SCREENS; i++) {
      const img = imgs[i]
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'drill-tile'
      btn.dataset.drillTile = String(i)
      btn.disabled = true
      // Set the label here, not as data-aria-th/en: these buttons are built long
      // after site.js painted the page, so the attributes it looks for would
      // never arrive and the button would be announced as a bare "01".
      const label = t(`กดถ้าคิดว่าจอที่ ${i + 1} กะพริบ`, `Press if you think screen ${i + 1} flashed`)
      btn.setAttribute('aria-label', label)
      btn.title = label
      const canvas = document.createElement('canvas')
      canvas.setAttribute('aria-hidden', 'true')
      const num = document.createElement('span')
      num.className = 'drill-num num'
      num.textContent = String(i + 1).padStart(2, '0')
      btn.append(canvas, num)
      // The exhibits above load lazily, so a visitor who clicks straight away can
      // reach this with naturalWidth still 0. Decode first, and skip anything the
      // browser never delivered — a screen of zeros is not a screen.
      const ready = img.complete && img.naturalWidth > 0
      const w = WORK_W
      const h = ready ? Math.max(1, Math.round(img.naturalHeight * (w / img.naturalWidth))) : 0
      if (!h) {
        screens.push({ i, btn, ctx: null, w: 0, h: 0, baseGray: new Float32Array(0), drawn: null, share: 0 })
        continue
      }
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, w, h)
      const baseGray = toGray(ctx.getImageData(0, 0, w, h))
      screens.push({ i, btn, ctx, w, h, baseGray, drawn: null, share: 0 })
    }
    wall.replaceChildren(...screens.map((s) => s.btn))
    return screens.some((s) => s.ctx !== null)
  }

  function draw(s, gray) {
    if (!s.ctx) return
    // grayToRgba fills the ImageData in place — one buffer per screen, reused every
    // frame. Passing its { data, width, height } wrapper to `new ImageData` is the
    // other half of this line's history: that constructor wants the pixel array, and
    // handing it the wrapper threw once per screen per frame.
    s.rgba ??= new ImageData(s.w, s.h)
    s.ctx.putImageData(grayToRgba(gray, s.w, s.h, s.rgba), 0, 0)
    s.drawn = gray
  }

  /** Every screen, every frame, for as long as the drill runs. This is the job. */
  function machineWatch(flashing) {
    let best = null
    for (const s of screens) {
      const share = changedShare(s.baseGray, s.drawn ?? s.baseGray, MACHINE_THRESHOLD)
      s.share = share
      if (share > 0 && (!best || share > best.share)) best = s
    }
    machine = best ? { screen: best.i, share: best.share } : null
    // Keep what the machine caught WHILE THE FLASH WAS UP. The live reading above
    // is correct only during those few dozen milliseconds: the frame goes back
    // afterwards, every screen returns to its baseline, and reading the live
    // value at reveal time would report 0.00% for a trial the machine did catch
    // — or quietly substitute the right answer for the machine's answer, which
    // is the one thing this page must never do.
    if (flashing && machine && !caught) caught = { ...machine }
  }

  function frame() {
    const now = performance.now()
    const flashing = now >= flashAt && now < flashUntil && flashGray
    for (const s of screens) draw(s, flashing && s.i === flashTile ? flashGray : s.baseGray)
    machineWatch(flashing)
    for (const s of screens) s.btn.classList.toggle('is-machine', machine !== null && s.i === machine.screen)
    if (flashing && phase === 'flash') paintLive()
    raf = requestAnimationFrame(frame)
  }

  function startLoop() {
    if (!raf) raf = requestAnimationFrame(frame)
  }

  function stopLoop() {
    cancelAnimationFrame(raf)
    raf = 0
  }

  // ── the words ────────────────────────────────────────────────────────
  const machineLine = () => (machine
    ? `${t('เครื่องจับได้', 'Machine caught')} ${t('จอ', 'screen')} ${n(machine.screen + 1)} · ${pct(machine.share, 2)} ${t('ของพิกเซล เทียบกับภาพก่อนหน้า', 'of pixels against the frame before')}`
    : t('เครื่องยังไม่เห็นอะไรเปลี่ยน', 'Machine: nothing has changed yet'))

  const paintLive = () => {
    say.textContent = `${t('จอไหนกะพริบ? กดจอที่คุณเห็น', 'Which screen flashed? Press the one you saw')} · ${machineLine()}`
  }

  function trialLine(row) {
    const truth = `${t('กะพริบที่จอ', 'The flash was on screen')} ${n(row.truth + 1)}`
    const you = row.yours === null
      ? t('คุณไม่ได้กดอะไรเลย', 'You pressed nothing')
      : `${t('คุณกดจอ', 'You pressed screen')} ${n(row.yours + 1)}`
    const got = row.machine < 0
      ? t('เครื่องไม่พบ', 'the machine saw nothing')
      : `${t('เครื่องจับได้จอ', 'machine caught screen')} ${n(row.machine + 1)} · ${pct(row.share, 2)} ${t('ของพิกเซล', 'of pixels')}`
    return `${row.label} · ${truth} · ${you} ${row.yours === row.truth ? '✓' : '✗'} · ${got} · Δ${n(row.delta)} ${t('ระดับเทา', 'grey levels')} · ${n(row.ms)} ms`
  }

  function finalLine() {
    const s = scoreDrill(rows)
    if (!s.rounds) return ''
    const head = `${t('คุณจับได้', 'You caught')} ${n(s.you)}/${n(s.rounds)} · ${t('เครื่องจับได้', 'the machine caught')} ${n(s.machine)}/${n(s.rounds)}`
    let tail
    if (s.you === 0) tail = t('ไม่จับเลยสักครั้ง ไม่ใช่เพราะไม่ระวัง แต่เพราะสิ่งที่เปลี่ยนเล็กเกินกว่าที่ตาจะรับรู้ได้ในเวลานั้น นี่ไม่ใช่ความผิดของคุณ นี่คือเหตุผลที่งานนี้ไม่ควรตกอยู่กับสายตาคนเดียว', 'Not once — not because you were careless, but because the change was smaller than an eye can catch in that time. That is not your fault. That is why this job should not sit with one pair of eyes.')
    else if (s.you < s.rounds / 2) tail = t('คุณพลาดไปเกือบทั้งหมด และนี่คือผลของสายตามนุษย์ที่ทำงานได้ดีในช่วงสั้น ๆ เท่านั้น เครื่องไม่ได้ฉลาดขึ้น มันแค่ไม่เบื่อ', 'You missed most of them, which is what a human eye is built for over short stretches. The machine is not cleverer — it is just never bored.')
    else tail = t('คุณทำได้ดีกว่าคนทั่วไปในการทดลองนี้ ลองสังเกตว่าคุณรู้ได้อย่างไร ได้ยิน เห็น หรือเดา และคำตอบแบบนั้นคือคำตอบที่คนถัดไปจะไม่ได้', 'You did better than most people do on this drill. Notice how you knew: heard it, saw it, or guessed. That answer is not the one the next person will give.')
    return `${head}\n${tail}`
  }

  const idleLine = () => t('หกจอนิ่ง คุณจะได้รู้เองว่าตัวเองพลาดไปเท่าไร ก่อนที่จะไปหาว่าใครควรถูกขัง', 'Six still screens. You will find out what you miss yourself, before anyone argues about who should be watching.')

  function logRow(row) {
    const tr = document.createElement('tr')
    const cells = [
      [row.label, ''],
      [`Δ${n(row.delta)} · ${n(row.ms)} ms`, ''],
      [n(row.truth + 1), ''],
      [row.yours === null ? '—' : n(row.yours + 1), row.yours === row.truth ? 'ok' : 'miss'],
      [pct(row.share, 2), ''],
      [row.machine < 0 ? '—' : n(row.machine + 1), row.machine === row.truth ? 'ok' : 'miss'],
    ]
    for (const [text, cls] of cells) {
      const td = document.createElement('td')
      td.textContent = text
      if (cls) td.className = cls
      tr.append(td)
    }
    return tr
  }

  function render() {
    const live = phase !== 'idle' && phase !== 'over'
    startBtn.hidden = live
    againBtn.hidden = phase !== 'over'
    nextBtn.hidden = !(phase === 'reveal' && trialIndex < TRIALS.length - 1)
    log.hidden = rows.length === 0
    for (const s of screens) {
      s.btn.disabled = phase !== 'respond'
      s.btn.classList.toggle('is-open', phase === 'respond')
      s.btn.classList.toggle('is-truth', phase === 'reveal' && s.i === flashTile)
      s.btn.classList.toggle('is-yours', phase === 'reveal' && picked !== null && s.i === picked)
      s.btn.classList.remove('is-machine')
    }
    logBody.replaceChildren(...rows.map(logRow))
  }

  // ── the drill ────────────────────────────────────────────────────────
  function reset() {
    picked = null
    machine = null
    caught = null
    flashGray = null
    flashTile = -1
    flashAt = flashUntil = 0
  }

  async function playTrial(my) {
    trialIndex++
    const spec = TRIALS[trialIndex]
    phase = 'waiting'
    reset()
    render()
    say.textContent = spec.practice
      ? t('ทดลองก่อน — จอหนึ่งจอจะกะพริบชัด ๆ แล้วดับไป กดจอที่กะพริบ', 'Practice first — one screen will flash, clearly, then go dark. Press the one that flashed.')
      : t('ดูจอทั้งหก…', 'Watch all six…')
    await wait(lead())
    if (my !== gen) return false

    // pickTile() returns the screen itself, not its index. Indexing `screens` with
    // it again produced undefined, and the trial died before it could flash.
    const s = pickTile()
    flashTile = s.i
    flashGray = shade(s.baseGray, s.w, s.h, patchRect(s.w, s.h), spec.delta)
    phase = 'flash'
    flashAt = performance.now()
    flashUntil = flashAt + spec.ms
    await wait(spec.ms + 80)
    if (my !== gen) return false

    phase = 'respond'
    render()
    say.textContent = `${t('จอไหนกะพริบ? เหลือเวลา', 'Which screen flashed? You have')} ${Math.round(respondMs / 1000)} ${t('วินาที กดจอ หรือกดปุ่มเลข 1–6', 'seconds — press it, or press a number key 1–6')}`
    later(() => reveal(), respondMs)
    // Wait for the answer window to actually close — by press or by timeout.
    // The trial is only finished when reveal() has run, and the last trial used to
    // skip this entirely: the caller broke out of its loop and called reveal()
    // itself, which fired in the same tick the screen flashed. The visitor got no
    // time to answer the hardest trial and its row never reached the log, so the
    // final score silently counted four trials out of five.
    while (phase === 'respond' && my === gen) await wait(40)
    return my === gen
  }

  function reveal() {
    if (phase !== 'respond') return
    phase = 'reveal'
    cancelTimers()
    const spec = TRIALS[trialIndex]
    rows.push(recordTrial({
      truth: flashTile,
      yours: picked,
      caught,
      delta: spec.delta,
      ms: spec.ms,
      practice: !!spec.practice,
      label: spec.practice ? t('ทดลอง', 'Practice') : `${t('ครั้งที่', 'Trial')} ${n(trialIndex)}`,
    }))
    say.textContent = trialLine(rows[rows.length - 1])
    render()
  }

  async function start() {
    if (running) return
    const my = ++gen
    // Rebuild whenever the wall is short, not only when it is empty: an exhibit
    // that was still loading on the first press left a screen with no pixels in
    // it, and the drill would then refuse to start and could never recover.
    if (usable().length < SCREENS) {
      startBtn.disabled = true
      say.textContent = t('กำลังเปิดภาพห้องควบคุม…', 'Opening the control-room photographs…')
      await warmImages()
      if (my !== gen) { startBtn.disabled = false; return }
      buildWall()
      startBtn.disabled = false
    }
    // All six or none: the copy on this page says six screens, so running with
    // four would make the text a lie.
    if (usable().length < SCREENS) {
      say.textContent = t('หน้านี้ยังมีภาพห้องควบคุมไม่ครบหกภาพ แบบฝึกจึงยังเล่นไม่ได้ — ลองรีเฟรชหน้า', 'This page still has fewer than six control-room photographs, so the drill cannot run yet — try reloading')
      return
    }
    // `running` guards a double start, so every exit clears it — including the
    // bail-outs below, which a `return` in the middle used to skip and which
    // would then leave the drill permanently inert.
    running = true
    try {
      rows = []
      trialIndex = -1
      phase = 'waiting'
      startLoop()
      render()

      // Play every trial. playTrial now waits through the answer window, so the
      // loop only has to ask "is there another trial?" — and the last one is
      // played by the same call as the first four, not by a separate reveal.
      for (;;) {
        if (!await playTrial(my)) return
        if (trialIndex === TRIALS.length - 1) break
        await new Promise((resolve) => {
          const go = () => { nextBtn.removeEventListener('click', go); nextBtn.disabled = false; resolve() }
          nextBtn.disabled = false
          nextBtn.addEventListener('click', go)
        })
        if (my !== gen) return
      }

      phase = 'over'
      stopLoop()
      say.textContent = finalLine()
      render()
    } finally {
      running = false
    }
  }

  function choose(i) {
    if (phase !== 'respond' || i == null || Number.isNaN(i)) return
    picked = i
    reveal()
  }

  startBtn.addEventListener('click', start)
  againBtn.addEventListener('click', start)
  wall.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-drill-tile]')
    if (btn) choose(Number(btn.dataset.drillTile))
  })
  // On the document, not on `root`: pressing the start button hides that button,
  // and focus then falls back to <body>, which is not inside #try — so keys 1–6
  // were announced in the instructions and did nothing for anyone who had not
  // first tabbed back into the drill.
  document.addEventListener('keydown', (e) => {
    if (phase !== 'respond' || e.metaKey || e.ctrlKey || e.altKey) return
    if (e.target?.matches?.('input, textarea, select') || e.target?.isContentEditable) return
    const k = Number(e.key)
    if (k >= 1 && k <= SCREENS) {
      e.preventDefault()
      choose(k - 1)
    }
  })
  onLang(() => {
    if (phase === 'idle') say.textContent = idleLine()
    else if (phase === 'over') say.textContent = finalLine()
  })

  say.textContent = idleLine()

  return {
    stop() {
      gen++
      cancelTimers()
      stopLoop()
      running = false
      phase = 'idle'
      reset()
      for (const s of screens) draw(s, s.baseGray)
      render()
    },
  }
}