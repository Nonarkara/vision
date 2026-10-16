/**
 * /colour — the colour study.
 *
 * The four hues this site has always used are dealt onto four jobs, and a visitor
 * is asked one question: how does this plate feel. The page then says, quietly, what
 * the deal broke.
 *
 * Everything the machine knows about a plate is computed by the same contrast()
 * that certifies the site's own sixteen pairings, imported from one shared core.
 * That is deliberate: if the study graded plates by its own private arithmetic, it
 * would be able to disagree with the instrument that built it.
 *
 * Privacy, restated because it is the whole trick: an answer leaves the browser as
 * exactly two values — a plate id and one word from a fixed list of ten. The page
 * never sends anything else, and the server has nowhere to put anything else.
 */
import { assignments, contrast, ladder } from '../core/palette.js?v=1.17.1'

const PLATES = assignments()
const BY_ID = new Map(PLATES.map((p) => [p.id, p]))
const LEGAL = PLATES.filter((p) => p.legible)
const ILLEGAL = PLATES.filter((p) => !p.legible)

/**
 * SEAMS — the only colours a seam is allowed to be.
 *
 * A plate's roles are four hues at base, deep or pale. Black and white are the
 * instrument's own values and no plate can ever deal them, so a seam chosen from
 * here is guaranteed never to coincide with a band. Nothing else qualifies: put
 * olive on olive and the seam is not a seam.
 */
export const SEAM_SET = (() => {
  const l = ladder()
  return [l.black.deep, l.black.base, l.black.pale, l.white.base, l.white.pale]
})()

/** Accept `#abc123` or the `rgb(r, g, b)` a computed style hands back. */
function toHex(c) {
  if (typeof c === 'string' && c.startsWith('#')) return c
  const m = String(c).match(/[\d.]+/g)
  if (!m || m.length < 3) return '#000000'
  return '#' + m.slice(0, 3).map((v) => Math.round(+v).toString(16).padStart(2, '0')).join('')
}

/**
 * The seam that keeps a boundary visible between two colours.
 *
 * A seam only earns its place where two bands are too close to tell apart. Where
 * the ground is Naples and the ink is signal.deep the two already differ by
 * 15:1, and no seam between them is doing any work — insisting that the seam
 * clear BOTH of them is the wrong question and produces a white seam that
 * vanishes into the Naples it was meant to help.
 *
 * So the score is the better of the two ways a boundary can be seen:
 *   contrast(a, b)                  — already distinguishable, no seam needed
 *   min(contrast(s, a), contrast(s, b)) — the seam sets them apart
 *
 * `worst` is returned so a test can assert a floor rather than merely notice that
 * a colour changed. MEASURE.floor is that floor: a seam is a mark between fields,
 * so it is held to the mark floor, never to the text floor.
 */
export const SEAM_FLOOR = 3

/**
 * @param pairs  boundaries this seam must keep visible, as `[left, right]` pairs.
 *
 * Pass every boundary the seam touches and nothing else. An internal seam has
 * one pair — the two bands it sits between. The spine's edge has two, because it
 * stands between the page and the band at the top AND the page and the band at
 * the bottom. Asking one value to serve boundaries it was never told about is how
 * a seam ends up invisible on the side nobody listed.
 */
export function seamFor(...pairs) {
  const P = pairs.map(([a, b]) => [toHex(a), toHex(b)])
  let best = SEAM_SET[0]
  let bestScore = -1
  for (const s of SEAM_SET) {
    let score = Infinity
    for (const [A, B] of P) {
      const boundary = Math.max(contrast(A, B), Math.min(contrast(s, A), contrast(s, B)))
      if (boundary < score) score = boundary
    }
    if (score > bestScore) { bestScore = score; best = s }
  }
  return { value: best, worst: bestScore }
}

/**
 * All four seams for one plate, and nothing else the caller has to remember.
 *
 * This exists as its own function for a reason found by mutation testing. When
 * paint() assembled the seams itself, a version that told the edge about only the
 * top band — dropping the bottom boundary — passed every test, because the tests
 * called seamFor() directly and never exercised the wiring. It was a real bug:
 * 18 of 48 page-and-scheme combinations dropped to 1.23:1, under the floor.
 *
 * With the boundary list fixed inside the function, dropping one is no longer a
 * change to the caller's argument list, and it fails the tests instead.
 *
 * `pageGround` matters as much as the plate: the page is Naples in light and
 * olive in dark, and the edge has to clear whichever one is actually behind it.
 */
export function spineSeams(plate, pageGround) {
  const g = plate.ground
  const i = plate.reads.ink.value
  const q = plate.reads.quiet.value
  const s = plate.reads.signal.value
  const page = toHex(pageGround)
  return {
    // Keyed by the boundary each seam serves, not by its position. A positional
    // array made it possible to build the right seams in the wrong order and
    // nothing noticed: the HTML fixes the bands as ground, ink, quiet, signal
    // from top to bottom, and a swapped array would have coloured the seam
    // between ground and ink for the pair ground and quiet.
    'ground|ink': seamFor([g, i]).value,
    'ink|quiet': seamFor([i, q]).value,
    'quiet|signal': seamFor([q, s]).value,
    // Two boundaries, both required: the spine stands between the page and the
    // band at the top, and between the page and the band at the bottom.
    edge: seamFor([page, g], [page, s]).value,
  }
}

/** The arrangement the site normally wears. Everything else is a departure from it. */
export const HOUSE = { ground: 'naples', ink: 'olive', quiet: 'gray', signal: 'signal' }

const HUE = {
  naples: { th: 'เหลืองนีเปิล', en: 'Naples yellow' },
  olive: { th: 'มะกอกเขียว', en: 'olive green' },
  gray: { th: 'เทา', en: 'grey' },
  signal: { th: 'แดงพีช', en: 'peach red' },
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
    return at.ground === 'signal'
      ? {
        th: `แดงพีชกลายเป็นพื้นกระดาษ มันเคยมีไว้ทำหน้าที่เดียวคือบอกว่า “นี่คือสิ่งที่เครื่องเห็น” ไม่มีเฉดไหนเลยที่จะได้ 4.5:1 บนพื้นนี้ แม้จะปรับโทนไปทุกขั้น คนยังรู้สึกว่ามันเตือนภัย ส่วนกฎที่ผ่านอยู่ไม่เคยรู้ว่ามันแปลว่าอะไร`,
        en: `Peach red is the paper. It had one job — to mark what the machine sees. No hue reaches 4.5:1 on it at any tone. A person still feels the alarm. The rule that passed never knew what the colour meant.`,
      }
      : {
        th: `${hue(at.ground, 'th')}กลายเป็นพื้นกระดาษ เหลืองนีเปิลเคยเป็นกระดาษเสมอ นี่คือหน้าที่ของสีที่เปลี่ยนไป`,
        en: `${hue(at.ground, 'en')} is the paper now. Naples yellow had always been the paper — this is the job that moved.`,
      }
  }

  if (at.signal !== HOUSE.signal) {
    return {
      th: `${hue(at.signal, 'th')}กลายเป็นสิ่งที่เครื่องเห็น แต่แดงพีชเคยมีไว้ทำหน้าที่นี้เท่านั้น แถบสีนี้ยังถูกวางไว้ตรงที่เครื่องเห็น ทั้งที่สีไม่ได้ถูกออกแบบมาเพื่อบอกอะไรกับใคร`,
      en: `${hue(at.signal, 'en')} is what the machine sees now. Peach red had that job alone. The bar is still where the machine's findings go — but the colour behind it was never designed to tell you anything.`,
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
    // The page-scale deal. One element carries the four custom properties that
    // both the bands and the key read, so the tall stripe and the little swatches
    // can never disagree about which hue went where.
    head: root.querySelector('.study-chapter'),
    stack: root.querySelector('.band-stack'),
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

    // The same four measured values, at page scale. Deliberately the same numbers
    // the plate was given, read once: if these were computed separately they could
    // disagree, and a study that disagrees with itself proves nothing.
    if (el.head) {
      const h = el.head.style
      h.setProperty('--c-ground', plate.ground)
      h.setProperty('--c-ink', plate.reads.ink.value)
      h.setProperty('--c-quiet', plate.reads.quiet.value)
      h.setProperty('--c-signal', plate.reads.signal.value)
    }

    // Each seam is chosen for the two colours it actually separates. Bands run
    // top to bottom in role order, so seam 1 sits between ground and ink, 2
    // between ink and quiet, 3 between quiet and signal; the edge sits between
    // the spine and the page, so it has to clear the bands at both ends AND the
    // page behind them. Repainted on every deal AND on a scheme change, because
    // the page behind the spine is not the same colour in both schemes.
    if (el.stack) {
      const page = toHex(getComputedStyle(document.body).backgroundColor)
      const seams = spineSeams(plate, page)
      const g = el.stack.style
      g.setProperty('--seam-1', seams['ground|ink'])
      g.setProperty('--seam-2', seams['ink|quiet'])
      g.setProperty('--seam-3', seams['quiet|signal'])
      g.setProperty('--seam-edge', seams.edge)
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

  // The spine's edge seam is chosen against the page BENEATH it, and the page is
  // olive in dark and Naples in light. So flipping the OS scheme mid-visit
  // invalidates a seam that was correct a moment ago — the top band would sit on
  // an edge now tuned for a different ground. Re-solve, don't re-deal: the
  // visitor keeps the plate they are looking at.
  if (globalThis.matchMedia) {
    const scheme = globalThis.matchMedia('(prefers-color-scheme: dark)')
    const onScheme = () => { if (current) paint(current) }
    if (scheme.addEventListener) scheme.addEventListener('change', onScheme)
    else if (scheme.addListener) scheme.addListener(onScheme)
  }

  load()
  paint(deal(LEGAL))
  followShared()
  return { paint, load, deal, seamFor }
}

if (typeof document !== 'undefined' && !globalThis.__pump) mount()