/**
 * /colour — the colour study.
 *
 * The four hues this site has always used are dealt onto four jobs, and a visitor
 * is asked one question: how does this plate feel. The page then says, quietly, what
 * the deal broke.
 *
 * Everything the machine knows about a plate is computed by the same contrast()
 * that certifies the site's own sixteen pairings, inside core/palette.js. That
 * is deliberate: if the study graded plates by its own private arithmetic, it
 * would be able to disagree with the instrument that built it.
 *
 * Privacy, restated because it is the whole trick: an answer leaves the browser as
 * exactly two values — a plate id and one word from a fixed list of ten. The page
 * never sends anything else, and the server has nowhere to put anything else.
 */
import { assignments } from '../core/palette.js?v=1.19.2'

const PLATES = assignments()
const BY_ID = new Map(PLATES.map((p) => [p.id, p]))
const LEGAL = PLATES.filter((p) => p.legible)
const ILLEGAL = PLATES.filter((p) => !p.legible)

/** The arrangement the site normally wears. Everything else is a departure from it. */
export const HOUSE = { ground: 'ivory', ink: 'indigo', quiet: 'gray', signal: 'jasper' }

const HUE = {
  ivory: { th: 'งาช้างอ่อน', en: 'Ivory Buff' },
  indigo: { th: 'ครามเข้ม', en: 'Deep Indigo' },
  gray: { th: 'เทา', en: 'Neutral Gray' },
  jasper: { th: 'แดงแจสเปอร์', en: 'Jasper Red' },
}

const ROLE = {
  ground: { th: 'พื้นกระดาษ', en: 'the paper' },
  ink: { th: 'หมึกที่เขียนด้วย', en: 'the ink' },
  quiet: { th: 'ส่วนที่ไม่ได้อ่านก่อน', en: 'the part nobody reads first' },
  signal: { th: 'สิ่งที่เครื่องเห็น', en: 'what the machine sees' },
}

/** Pick a different plate than the one on screen, so the button always does something. */
export function deal(pool = LEGAL, exclude = null) {
  const options = pool.filter((p) => p.id !== exclude)
  const bag = options.length ? options : pool
  return bag[Math.floor(Math.random() * bag.length)]
}

/**
 * The two lines under the plate: what the machine reports, and what the deal broke.
 *
 * Both are pure so they can be pinned by tests without a DOM — the gloss is the
 * teaching, and teaching that cannot be tested is teaching that quietly rots.
 */
export function describe(plate) {
  const worst = Object.entries(plate.reads)
    .sort((a, b) => a[1].ratio - b[1].ratio)
    .map(([role, r]) => `${ROLE[role].en} ${r.hue} ${r.tone} ${r.value} ${r.ratio.toFixed(2)}:1`)

  const machine = plate.legible
    ? {
      th: `เครื่องอ่านได้: พื้น ${plate.ground} · ค่าต่ำสุด ${plate.worst.toFixed(2)}:1 · ผ่านเกณฑ์ 4.5:1 · ตอบว่า “อ่านได้”`,
      en: `the machine reads: ground ${plate.ground} · lowest reading ${plate.worst.toFixed(2)}:1 · clears 4.5:1 · it says READABLE`,
    }
    : {
      th: `เครื่องอ่านไม่ได้: ค่าต่ำสุด ${plate.worst.toFixed(2)}:1 ต่ำกว่า 4.5:1 · ตอบว่า “อ่านไม่ได้”`,
      en: `the machine cannot read it: lowest reading ${plate.worst.toFixed(2)}:1, under 4.5:1 · it says NOT READABLE`,
    }

  return { machine, gloss: gloss(plate), readings: worst }
}

/**
 * One quiet sentence naming the most important thing this deal broke.
 *
 * Ordered by how much it matters, not by how it was dealt: the paper first,
 * because a page's background is the thing a person feels before reading a word.
 */
export function gloss(plate) {
  const { at } = plate
  const hue = (h, l) => HUE[h][l]

  if (at.ground !== HOUSE.ground) {
    // The one hue the machine refuses as a ground — the signal hue. It is named
    // from HOUSE rather than written out, because a hard-coded hue name here
    // would be a second place for the palette to go stale.
    return at.ground === HOUSE.signal
      ? {
        th: `${hue(HOUSE.signal, 'th')}กลายเป็นพื้นกระดาษ มันเคยมีไว้ทำหน้าที่เดียวคือบอกว่า “นี่คือสิ่งที่เครื่องเห็น” ไม่มีเฉดไหนเลยที่จะได้ 4.5:1 บนพื้นนี้ แม้จะปรับโทนไปทุกขั้น คนยังรู้สึกว่ามันเตือนภัย ส่วนกฎที่ผ่านอยู่ไม่เคยรู้ว่ามันแปลว่าอะไร`,
        en: `${hue(HOUSE.signal, 'en')} is the paper. It had one job — to mark what the machine sees. No hue reaches 4.5:1 on it at any tone. A person still feels the alarm. The rule that passed never knew what the colour meant.`,
      }
      : {
        th: `${hue(at.ground, 'th')}กลายเป็นพื้นกระดาษ ${hue(HOUSE.ground, 'th')}เคยเป็นกระดาษเสมอ นี่คือหน้าที่ของสีที่เปลี่ยนไป`,
        en: `${hue(at.ground, 'en')} is the paper now. ${hue(HOUSE.ground, 'en')} had always been the paper — this is the job that moved.`,
      }
  }

  if (at.signal !== HOUSE.signal) {
    return {
      th: `${hue(at.signal, 'th')}กลายเป็นสิ่งที่เครื่องเห็น แต่${hue(HOUSE.signal, 'th')}เคยมีไว้ทำหน้าที่นี้เท่านั้น แถบสีนี้ยังถูกวางไว้ตรงที่เครื่องเห็น ทั้งที่สีไม่ได้ถูกออกแบบมาเพื่อบอกอะไรกับใคร`,
      en: `${hue(at.signal, 'en')} is what the machine sees now. ${hue(HOUSE.signal, 'en')} had that job alone. The bar is still where the machine's findings go — but the colour behind it was never designed to tell you anything.`,
    }
  }

  if (at.quiet !== HOUSE.quiet) {
    return {
      th: `${hue(at.quiet, 'th')}กลายเป็นส่วนที่ไม่ได้อ่านก่อน ส่วนที่ควรเป็นสีที่คนยังไม่มั่นใจ ตอนนี้ความไม่มั่นใจถูกพิมพ์ไว้ในสีอื่น และตัวเลขไม่มีทางรู้ความต่าง`,
      en: `${hue(at.quiet, 'en')} is now the part nobody reads first. The part meant to carry the machine's uncertainty is printed in a different colour, and no number can tell the difference.`,
    }
  }

  if (at.ink !== HOUSE.ink) {
    return {
      th: `${hue(at.ink, 'th')}กลายเป็นหมึก ตัวอักษรที่คนเขียน ยังอ่านออก เพราะกฎวัดได้แค่ความสว่าง ไม่ได้วัดว่าใครเขียน`,
      en: `${hue(at.ink, 'en')} is the ink now — the words a person wrote. Still perfectly readable, because the rule measures brightness and not authorship.`,
    }
  }

  return {
    th: 'นี่คือชุดสีที่เว็บนี้ใช้อยู่ปกติ ยังไม่มีอะไรถูกสับ',
    en: 'This is the arrangement the site normally wears. Nothing has been swapped.',
  }
}

/** Share of each feeling, largest first. `n` is the honest denominator. */
export function share(rows, n) {
  return rows.map((r) => ({ ...r, pct: n ? Math.round((r.count / n) * 100) : 0 }))
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

/** Both languages in the markup, one shown — the same rule the rest of the site uses. */
function bi({ th, en }) {
  return `<span class="th" lang="th">${esc(th)}</span><span class="en" lang="en">${esc(en)}</span>`
}

export function mount(root = document) {
  const form = root.querySelector('#feel')
    const el = {
      plate: root.querySelector('#plate'),
    signal: root.querySelector('#plate-signal-line'),
    machine: root.querySelector('#machine-line'),
    gloss: root.querySelector('#gloss-line'),
    warn: root.querySelector('#illegal-warn'),
    feelings: root.querySelector('[data-feelings]'),
    form,
    consent: root.querySelector('[data-consent]'),
    status: root.querySelector('#feel-status'),
    board: root.querySelector('#board'),
    empty: root.querySelector('#board-empty'),
    deal: root.querySelector('[data-deal]'),
    dealShared: root.querySelector('[data-deal-shared]'),
    dealIllegal: root.querySelector('[data-deal-illegal]'),
  }
  if (!el.plate) return null

  let current = null
  let chosen = null

  const paint = (plate) => {
    current = plate
    // CSSOM, not a style attribute: the page's own CSP allows no inline styles, and
    // this is the one way to hand a runtime value to the stylesheet without a rule
    // per plate.
    const s = el.plate.style
    s.setProperty('--pg', plate.ground)
    s.setProperty('--pi', plate.reads.ink.value)
    s.setProperty('--pq', plate.reads.quiet.value)
    s.setProperty('--ps', plate.reads.signal.value)

    // The machine's own number on the plate, from the same instrument that
    // graded it: the signal colour's measured ratio against this paper. It
    // used to be a hard-coded "confidence 0.41" that never changed on any of
    // the twenty-four plates — a fake number under a bar that read as a meter.
    if (el.signal) {
      const r = plate.reads.signal.ratio.toFixed(2)
      el.signal.innerHTML = bi({
        th: `${ROLE.signal.th} · ${r}:1 บนกระดาษนี้`,
        en: `${ROLE.signal.en} · ${r}:1 on this paper`,
      })
    }

    const d = describe(plate)
    el.machine.innerHTML = bi(d.machine)
    el.gloss.innerHTML = bi(d.gloss)
    if (plate.legible) {
      el.warn.hidden = true
      el.warn.innerHTML = ''
      el.plate.removeAttribute('data-illegal')
    } else {
      el.plate.setAttribute('data-illegal', '')
      el.warn.hidden = false
      el.warn.innerHTML = bi({
        th: `จานนี้ตั้งใจให้อ่านไม่ออก ค่าที่ต่ำที่สุดคือ ${plate.worst.toFixed(2)}:1 ซึ่งต่ำกว่าเกณฑ์ 4.5:1 ถ้าอ่านไม่ออกแป่ว่าระบบสีมีปัญหา — แป่ว่าเครื่องกำลังบอกคุณว่ามันไม่รู้`,
        en: `This plate is meant to be unreadable. The lowest reading is ${plate.worst.toFixed(2)}:1, under the 4.5:1 floor. If you cannot read it, the colour system is not broken — the machine is telling you it does not know.`,
      })
    }
    chosen = null
    el.status.innerHTML = ''
  }

  const renderFeelings = (feelings) => {
    el.feelings.innerHTML = feelings
      .map((f) => `<button class="btn feel-btn" type="button" data-feel="${esc(f.id)}" aria-pressed="false">${bi(f)}</button>`)
      .join('')
  }

  const renderBoard = (board) => {
    if (!board.length) {
      el.board.innerHTML = ''
      el.empty.hidden = false
      return
    }
    el.empty.hidden = true
    el.board.innerHTML = board
      .map((s) => {
        const plate = BY_ID.get(s.assignment)
        const bars = share(s.rows, s.n)
          .map((r) => `
            <li>
              <span class="feel-label">${bi(r)}</span>
              <span class="feel-bar" data-w="${Math.max(2, r.pct)}"></span>
              <span class="feel-n">${r.pct}%</span>
            </li>`)
          .join('')
        return `
          <article class="board-row" data-legible="${plate?.legible ? '1' : '0'}">
            <h3>${bi({
          th: `พื้นหลัง ${HUE[plate.groundHue].th} · อ่านได้${plate.legible ? '' : 'ไม่ได้'}`,
          en: `${HUE[plate.groundHue].en} ground · ${plate.legible ? 'legible' : 'not legible'}`,
        })}</h3>
            <p class="board-n">${s.n} <span class="th" lang="th">คำตอบ</span><span class="en" lang="en">answers</span></p>
            <ul class="feel-bars">${bars}</ul>
          </article>`
      })
      .join('')
    // Bar widths by CSSOM, for the same reason the plate uses it: an inline style
    // attribute is exactly what this page's own CSP refuses.
    for (const bar of el.board.querySelectorAll('.feel-bar')) bar.style.width = `${bar.dataset.w}%`
  }

  let feelings = []

  const load = async () => {
    try {
      const res = await fetch('/api/colour', { headers: { Accept: 'application/json' } })
      if (!res.ok) throw new Error(String(res.status))
      const data = await res.json()
      feelings = data.feelings ?? []
      renderFeelings(feelings)
      renderBoard(data.board ?? [])
    } catch {
      // The study is optional; a failure to load the board must not take the page
      // down, because the plate and the question still work with no network at all.
      feelings = feelings.length ? feelings : []
      if (!feelings.length) renderFeelings([])
    }
  }

  el.feelings.addEventListener('click', (ev) => {
    const btn = ev.target.closest('[data-feel]')
    if (!btn) return
    chosen = btn.dataset.feel
    for (const b of el.feelings.querySelectorAll('[data-feel]')) b.setAttribute('aria-pressed', String(b === btn))
    el.status.innerHTML = ''
  })

  el.feelings.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Enter' && ev.key !== ' ') return
    const btn = ev.target.closest('[data-feel]')
    if (!btn) return
    ev.preventDefault()
    btn.click()
  })

  // The consent checkbox is the send. Nothing is transmitted unless it is ticked,
  // and ticking it is not sticky: a new plate clears it, so consent is per answer.
  // It lives on the form, not inside [data-feelings], so the listener is on the form.
  el.form.addEventListener('change', async () => {
    if (!chosen || !el.consent.checked) return
    const plateId = current.id
    const feeling = chosen
    el.consent.checked = false
    try {
      const res = await fetch('/api/colour', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignment: plateId, feeling }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'not saved')
      el.status.innerHTML = bi({
        th: `บันทึกแล้ว ตอนนี้มีคำตอบทั้งหมด ${data.total} คำตอบในจานนี้`,
        // "1 answers" is the sort of thing a page arguing for honesty should not
        // put in front of the person who just trusted it with an answer.
        en: `Saved. There ${data.total === 1 ? 'is now 1 answer' : `are now ${data.total} answers`} in total, ${data.n} on this plate.`,
      })
      // Re-read the board rather than splicing this one row into it: a count that
      // only shows the answer just given would flatter the result.
      load()
    } catch (err) {
      el.status.innerHTML = bi({
        th: `บันทึกไม่สำเร็จ: ${err.message} — คำตอบของคุณยังอยู่ในเครื่องนี้`,
        en: `Not saved: ${err.message} — your answer is still only in this browser.`,
      })
    }
  })

  el.deal.addEventListener('click', () => paint(deal(LEGAL, current?.id)))
  el.dealIllegal.addEventListener('click', () => paint(deal(ILLEGAL, current?.id)))
  el.dealShared.addEventListener('click', async () => {
    try {
      const res = await fetch('/api/colour/share', { method: 'POST', headers: { 'Content-Type': 'application/json' } })
      const data = await res.json()
      if (res.ok && data.shared?.id && BY_ID.has(data.shared.id)) {
        el.dealShared.setAttribute('aria-pressed', 'true')
        paint(BY_ID.get(data.shared.id))
      }
    } catch { /* the button simply did nothing, which is honest enough */ }
  })

  // Follow whatever plate everyone else is looking at, once, on arrival.
  const followShared = async () => {
    try {
      const res = await fetch('/api/colour')
      const data = await res.json()
      if (data.shared?.id && BY_ID.has(data.shared.id)) {
        el.dealShared.setAttribute('aria-pressed', 'true')
        paint(BY_ID.get(data.shared.id))
      }
    } catch { /* offline: deal one locally, which is the whole point of the button */ }
  }

  // The scheme-change repaint went with the spine. It existed only because a seam
  // had been solved against the page colour behind it, and the page is indigo in
  // dark and Ivory Buff in light. Nothing on this page is tuned to the scheme now —
  // the plate's four values come from the deal, not from the theme — so a
  // listener here would repaint identical values forever.

  load()
  paint(deal(LEGAL))
  followShared()
  return { paint, load, deal }
}

if (typeof document !== 'undefined' && !globalThis.__pump) mount()