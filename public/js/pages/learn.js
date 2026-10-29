// Learn: eight chapters, one picture. The specimen bar at the top chooses
// what every bench studies — a public camera, the visitor's own camera, or a
// photo — so switching to your own face re-teaches the whole page at once.

import '../core/site.js?v=1.24.3'
import { t, bi, esc, onLang } from '../core/i18n.js?v=1.24.3'
import { createSpecimen, startSpecimen, specimenBarHtml } from '../core/specimen.js?v=1.24.3'
import { numbersChapter, colourChapter, thresholdChapter } from '../learn/pixels.js?v=1.24.3'
import { convolutionChapter, edgesChapter, motionChapter } from '../learn/filters.js?v=1.24.3'
import { detectorChapter, limitsChapter } from '../learn/neural.js?v=1.24.3'
import { ORDER, currentIndex, readSeen, rememberSeen, progressText, resumeAt } from '../learn/course.js?v=1.24.3'

const CHAPTERS = {
  numbers: numbersChapter,
  colour: colourChapter,
  threshold: thresholdChapter,
  convolution: convolutionChapter,
  edges: edgesChapter,
  motion: motionChapter,
  detector: detectorChapter,
  limits: limitsChapter,
}

const slot = document.querySelector('[data-specimen-slot]')
slot.insertAdjacentHTML('afterend', specimenBarHtml())
slot.remove()
// Keep the source name at the picture choice. Its full ownership/relay credit
// opens in place instead of being permanently clamped to two phone lines.
const sourceBar = document.querySelector('[data-specimen]')
const sourceCredit = document.createElement('details')
sourceCredit.className = 'specimen-credit'
const sourceSummary = document.createElement('summary')
sourceSummary.append(sourceBar.querySelector('[data-specimen-name]'))
sourceCredit.append(sourceSummary, sourceBar.querySelector('[data-specimen-meta]'))
sourceBar.querySelector('.specimen-who').append(sourceCredit)
const specimen = createSpecimen({ bar: document.querySelector('[data-specimen]'), prefer: 'video' })
const getSource = () => specimen.source

const benches = Object.entries(CHAPTERS).flatMap(([name, init]) => {
  const chapter = document.querySelector(`[data-chapter="${name}"]`)
  return chapter ? [init(chapter, getSource)] : []
})

const states = [...document.querySelectorAll('[data-state]')]
function showState(text) {
  for (const el of states) { el.hidden = false; el.textContent = text }
}

specimen.on((src) => {
  for (const el of states) el.hidden = !!src
  for (const b of benches) { b.reset?.(); b.invalidate() }
})
specimen.onError((text, kept) => { if (!kept) showState(text) })
onLang(() => { for (const b of benches) b.invalidate() })

// "Use my camera for the whole page": the same as the bar's button, but where people read first.
document.querySelector('[data-learn-mine]')?.addEventListener('click', () => specimen.useWebcam())

// ── Walking the course ──────────────────────────────────────────────────
// Eight chapters on one long page is a wall until the page says where you are,
// what comes next, and how far you have come. Three small answers to that.

// The chapter list, taken from the page rather than repeated here, so a
// chapter added to the HTML needs no second edit.
const chapters = ORDER
  .map((id) => document.querySelector(`[data-chapter="${id}"]`))
  .filter(Boolean)
const tocLinks = new Map([...document.querySelectorAll('.learn-toc a[href^="#"]')]
  .map((a) => [a.getAttribute('href').slice(1), a]))
// Both languages of a chapter's name, taken from the contents link itself so
// the two can never drift apart. Reading one language's title and printing it
// inside the other's span is how a Thai button ends up saying "A sliding
// window" — the page would be bilingual and still wrong in both.
const titlesOf = (id) => {
  const link = tocLinks.get(id)
  if (!link) return { th: '', en: '' }
  return {
    th: link.querySelector('.th')?.textContent.trim() ?? '',
    en: link.querySelector('.en')?.textContent.trim() ?? '',
  }
}

// 1 · A Next button at the foot of every chapter, carrying the next chapter's
// own name, so the step forward is chosen rather than guessed. The last one
// leaves the page: reading is done, teaching is the next thing a person wants.
for (const [index, chapter] of chapters.entries()) {
  const step = document.createElement('nav')
  step.className = 'chapter-step'
  step.setAttribute('data-aria-th', 'ไปต่อที่บทไหน')
  step.setAttribute('data-aria-en', 'Go on to which chapter')
  const here = index + 1
  const back = chapters[index - 1]
  const ahead = chapters[index + 1]
  const ahead2 = ahead ? titlesOf(ahead.id) : null
  step.innerHTML = `
    ${back ? `<a class="chapter-back" href="#${back.id}"><span class="th" lang="th">← บทก่อนหน้า</span><span class="en" lang="en">← Previous chapter</span></a>` : '<span></span>'}
    ${ahead
      ? `<a class="chapter-next" href="#${ahead.id}"><span class="num">${String(here + 1).padStart(2, '0')}</span><span class="th" lang="th">บทถัดไป →</span><span class="en" lang="en">Next chapter →</span><span class="next-name th" lang="th">${esc(ahead2.th)}</span><span class="next-name en" lang="en">${esc(ahead2.en)}</span></a>`
      : `<a class="chapter-next" href="/train"><span class="th" lang="th">บทสุดท้ายแล้ว · ไปสอนเครื่องเอง →</span><span class="en" lang="en">That was the last chapter · teach one yourself →</span></a>`}`
  chapter.append(step)
}

// 2 · "You are here": the chapter you are reading is marked in the contents,
// and the contents item you have read is ticked off.
let seen = readSeen()
const progressEl = document.querySelector('[data-progress]')
function paintProgress() {
  // The first chapter already says where a new reader starts. Save this band
  // for real progress and a returning reader’s resume link.
  progressEl.hidden = seen.length === 0
  const [th, en, zh] = progressText(seen, chapters.length)
  progressEl.innerHTML = bi(th, en, zh)
  const next = resumeAt(seen)
  if (next && tocLinks.has(next) && !document.querySelector('.learn-resume')) {
    const link = document.createElement('a')
    link.className = 'learn-resume'
    link.href = `#${next}`
    link.innerHTML = bi('อ่านต่อ →', 'Continue →', '继续 →')
    link.setAttribute('aria-label', t(`อ่านต่อที่บท ${seen.length + 1}`, `Continue at chapter ${seen.length + 1}`, `从第 ${seen.length + 1} 章继续`))
    progressEl.append(' ', link)
  }
}
function paintToc() {
  for (const [id, link] of tocLinks) {
    link.classList.toggle('is-read', seen.includes(id))
    if (id === current) link.setAttribute('aria-current', 'location')
    else link.removeAttribute('aria-current')
  }
}

// 3 · Progress that survives a reload, so returning is not starting over.
let current = ORDER[0]
function markRead(id) {
  if (seen.includes(id)) return
  seen = [...seen, id]
  rememberSeen(seen)
  paintProgress()
  paintToc()
}
function measure() {
  const line = scrollY + innerHeight * 0.35
  const tops = chapters.map((c) => c.getBoundingClientRect().top + scrollY)
  const index = currentIndex(tops, line)
  const id = chapters[index]?.id ?? ORDER[0]
  if (id === current) return
  current = id
  paintToc()
}
addEventListener('scroll', () => { measure(); for (const c of chapters) { const r = c.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0) markRead(c.id) } }, { passive: true })
addEventListener('resize', measure, { passive: true })
onLang(paintProgress)
paintProgress()
paintToc()
measure()

showState(t('กำลังหากล้องที่ตอบ…', 'Finding a camera that answers…'))
startSpecimen(specimen).then((src) => {
  if (!src) showState(t('ยังไม่มีกล้องตอบ ลองกด ↻ หรือใช้กล้องของคุณ', 'No camera answered yet — press ↻ or use your own camera'))
})
