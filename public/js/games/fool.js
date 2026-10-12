// Game 3 — Fool the machine. Your own camera, the live objects lens, and a
// list of mischief: make it see what is not there, or miss what is. The
// machine cannot referee this game — it has no idea what is really in front
// of the lens — so you do. Captures live in this tab's memory and nowhere else.

import { t, bi, n, lang, onLang } from '../core/i18n.js'
import { runLens, createLensState } from '../cv/lenses.js'
import { drawDetections } from '../cv/draw.js'
import { cocoName } from '../ml/labels.js'
import { detect } from '../ml/detector.js'
import { toast } from '../core/site.js?v=1.14.0'
import { readyDetector, benchSpecimen, freeze, paint, sayDetections, biClass, readBest, writeBest, FLOOR_SCORE } from './common.js'

const MAX_CAPTURES = 12
const BEST_KEY = 'vision_games_fool_best_v1'

// kind 'see': make it report something that is not there. kind 'miss': make it lose something that is.
const CHALLENGES = [
  { id: 'ghost', cls: [1], kind: 'see', th: 'ทำให้เครื่องเห็น “คน” ที่ไม่ได้อยู่ตรงนั้น', en: 'Make it see a person who isn’t there', tipTh: 'รูปบนจอมือถือ โปสเตอร์ ภาพวาด', tipEn: 'a photo on a phone screen, a poster, a drawing' },
  { id: 'cup', cls: [47], kind: 'miss', th: 'ทำให้ถ้วยหายไป ทั้งที่ยังอยู่ในภาพ', en: 'Make a cup disappear while it is still in view', tipTh: 'เอียง คว่ำ บังไว้ครึ่งหนึ่ง หรือถือใกล้เลนส์มาก ๆ', tipEn: 'tilt it, turn it upside down, cover half, hold it very close' },
  { id: 'phone', cls: [77], kind: 'see', th: 'ทำให้เครื่องเรียกของบางอย่างว่า “โทรศัพท์มือถือ” ทั้งที่ไม่ใช่', en: 'Get it to call something a “cell phone” that isn’t one', tipTh: 'รีโมต กระเป๋าสตางค์ ช็อกโกแลตแท่ง การ์ดสีดำ', tipEn: 'a remote, a wallet, a chocolate bar, a black card' },
  { id: 'pet', cls: [17, 18], kind: 'see', th: 'ทำให้เครื่องเห็นหมาหรือแมว โดยไม่มีสัตว์จริงสักตัว', en: 'Make it see a dog or cat with no animal in the room', tipTh: 'รูปบนจอ ตุ๊กตา ภาพวาด — แล้วลองคิดว่ามันผิดจริงหรือเปล่า', tipEn: 'a picture on a screen, a soft toy, a drawing — then ask whether it is really wrong' },
  { id: 'phone-gone', cls: [77], kind: 'miss', th: 'ทำให้โทรศัพท์หายไป ทั้งที่ยังถืออยู่ในภาพ', en: 'Make a phone vanish while you hold it in view', tipTh: 'หันข้าง ให้เห็นแค่สันเครื่อง หรือถือไว้หน้าของสีเข้ม', tipEn: 'turn it sideways, show only its edge, hold it against something dark' },
  { id: 'vanish', cls: [1], kind: 'miss', th: 'อยู่ในภาพ แต่ทำให้เครื่องไม่เห็น “คน”', en: 'Stay in view but stop it seeing a person', tipTh: 'หันหลัง เข้าใกล้กล้องมาก ๆ หรี่ไฟ คลุมผ้า', tipEn: 'turn away, get very close, dim the light, hide under a blanket' },
]
const byId = (id) => CHALLENGES.find((c) => c.id === id)
const names = (ch) => ch.cls.map((c) => cocoName(c, lang())).join(t(' หรือ ', ' or '))

export function initFool(root) {
  const $ = (sel) => root.querySelector(sel)
  const canvas = $('[data-fool-canvas]')
  const stateEl = $('[data-fool-state]')
  const sayEl = $('[data-fool-say]')
  const msEl = $('[data-fool-ms]')
  const thr = $('[data-fool-thr]')
  const thrOut = $('[data-fool-thr-out]')
  const go = $('[data-fool-go]')
  const captureBtn = $('[data-fool-capture]')
  const listEl = root.querySelector('[data-fool-challenges]')
  const galleryEl = root.querySelector('[data-fool-gallery]')
  const emptyEl = root.querySelector('[data-fool-empty]')
  const scoreEl = document.querySelector('[data-fool-score]')
  const specimen = benchSpecimen($('[data-specimen]'))

  const lens = createLensState()
  lens.minScore = Number(thr.value) / 100
  let started = false
  let loading = false
  let active = CHALLENGES[0].id
  let captures = [] // { n, challenge, frame, labels, fooled }
  let shot = 0
  let seenAt = -1
  let best = readBest(BEST_KEY)

  function state(text) {
    stateEl.hidden = !text
    stateEl.textContent = text ?? ''
  }

  function hint(found) {
    const ch = byId(active)
    const hits = found.filter((d) => ch.cls.includes(d.cls))
    const tip = t(ch.tipTh, ch.tipEn)
    if (ch.kind === 'see') {
      return hits.length
        ? t(`มันบอกว่า ${sayDetections(hits)} — ถ้าตรงนั้นไม่มีจริง กด “เก็บภาพ”`, `It says ${sayDetections(hits)}. If there isn’t really one there, press Capture.`)
        : t(`ยังไม่เห็น${names(ch)} ลอง: ${tip}`, `No ${names(ch)} yet. Try: ${tip}.`)
    }
    return hits.length
      ? t(`มันยังเห็น ${sayDetections(hits)} ลอง: ${tip}`, `It still sees ${sayDetections(hits)}. Try: ${tip}.`)
      : t(`ตอนนี้มันไม่เห็น${names(ch)}ที่มั่นใจเกิน ${thr.value}% ถ้ามีอยู่ในภาพจริง กด “เก็บภาพ” — คุณหลอกมันได้แล้ว`, `It sees no ${names(ch)} above ${thr.value}%. If one is really in view, press Capture — you fooled it.`)
  }

  function say() {
    if (!started) { if (!loading) sayEl.textContent = t('กดปุ่มด้านล่างเพื่อเปิดกล้องของคุณ หรือเลือกรูปจากแถบด้านล่าง', 'Press the button below to open your camera, or choose a photo from the bar underneath.'); return }
    if (!lens.detectedAt) { sayEl.textContent = t('เครื่องกำลังดู…', 'The machine is looking…'); return }
    const found = lens.detections.filter((d) => d.score >= lens.minScore)
    const sees = found.length
      ? `${t('เห็น', 'Sees')}: ${sayDetections(found)}`
      : t(`ไม่พบอะไรที่มั่นใจเกิน ${thr.value}% — ซึ่งไม่ได้แปลว่าไม่มีอะไร`, `Nothing above ${thr.value}% — which does not mean nothing is there.`)
    sayEl.textContent = `${sees}\n${hint(found)}`
  }

  function fooledCount() {
    return new Set(captures.filter((c) => c.fooled).map((c) => c.challenge)).size
  }

  function renderScore() {
    const k = fooledCount()
    if (k > best) { best = k; writeBest(BEST_KEY, best) }
    const parts = [`${t('หลอกสำเร็จ', 'Fooled')} ${n(k)}/${n(CHALLENGES.length)} ${t('โจทย์', 'challenges')}`, `${t('ภาพที่เก็บ', 'Captures')} ${n(captures.length)}`]
    if (best) parts.push(`${t('สถิติดีสุดของคุณ', 'Your best')}: ${n(best)}/${n(CHALLENGES.length)}`)
    scoreEl.textContent = parts.join(' · ')
  }

  function renderChallenges() {
    const done = new Set(captures.filter((c) => c.fooled).map((c) => c.challenge))
    listEl.innerHTML = CHALLENGES.map((ch, i) => `
      <button class="btn challenge" type="button" data-challenge="${ch.id}" aria-pressed="${ch.id === active}">
        <span class="num">${String(i + 1).padStart(2, '0')}${done.has(ch.id) ? ' ✓' : ''}</span>
        <span class="challenge-text">${bi(ch.th, ch.en)}</span>
      </button>`).join('')
  }

  function labelsHtml(labels) {
    if (!labels.length) return bi('ไม่เห็นอะไรเกินเกณฑ์', 'nothing above the threshold')
    return labels.map((d) => `${biClass(d.cls)} ${Math.round(d.score * 100)}%`).join(' · ')
  }

  function renderGallery() {
    galleryEl.replaceChildren(...captures.map(tile))
    for (const c of captures) paintTile(c)
    emptyEl.hidden = captures.length > 0
    renderChallenges()
    renderScore()
  }

  function tile(c) {
    const ch = byId(c.challenge)
    const el = document.createElement('figure')
    el.className = 'tile'
    el.dataset.shot = String(c.n)
    el.innerHTML = `
      <div class="tile-view"><canvas role="img" aria-label="A captured moment with the machine's labels"></canvas><span class="tile-tag">#${c.n}</span></div>
      <figcaption class="tile-meta"><span class="who">${bi(ch.th, ch.en)}</span><br><span class="num">${labelsHtml(c.labels)}</span></figcaption>
      <div class="tile-actions">
        <button class="btn" type="button" data-fooled aria-pressed="${c.fooled}">${bi('หลอกได้', 'Fooled it')}</button>
        <button class="btn" type="button" data-remove>${bi('ลบ', 'Remove')}</button>
      </div>`
    return el
  }

  function paintTile(c) {
    const cv = galleryEl.querySelector(`[data-shot="${c.n}"] canvas`)
    if (!cv) return
    const { ctx, rect } = paint(cv, c.frame)
    drawDetections(ctx, c.labels, rect)
  }

  /** Freeze this moment and let the detector look at exactly it, so the labels match the picture. */
  async function capture() {
    const src = specimen.source
    if (!src?.ready || !started) return
    captureBtn.disabled = true
    try {
      const frame = freeze(src)
      const { detections } = await detect(frame, { minScore: FLOOR_SCORE })
      const labels = detections.filter((d) => d.score >= lens.minScore)
      shot += 1
      captures = [{ n: shot, challenge: active, frame, labels, fooled: false }, ...captures].slice(0, MAX_CAPTURES)
      renderGallery()
      toast(t('เก็บไว้ในแท็บนี้แล้ว ถ้าหลอกได้จริง กด “หลอกได้” ที่ภาพ', 'Kept in this tab. If it really was fooled, press “Fooled it” on the picture.'))
    } catch {
      toast(t('เก็บภาพไม่สำเร็จ', 'Could not capture'))
    } finally {
      captureBtn.disabled = false
    }
  }

  async function start() {
    if (started || loading) return
    loading = true
    go.disabled = true
    // Ask for the camera first so the permission prompt appears while the model downloads.
    const cam = specimen.source ? Promise.resolve(specimen.source) : specimen.useWebcam()
    try {
      await readyDetector((text) => { sayEl.textContent = text })
    } catch (err) {
      loading = false
      go.disabled = false
      sayEl.textContent = err.message
      return
    }
    const src = await cam
    loading = false
    started = true
    go.hidden = true
    captureBtn.disabled = false
    if (!src) state(t('เปิดกล้องของคุณไม่ได้ ใช้ “รูปของฉัน” หรือ “กล้องสาธารณะ” ด้านล่างแทนได้', 'Your camera did not open — use “My photo” or “Public camera” below instead'))
    say()
  }

  runLens(canvas, () => specimen.source, () => ({ name: started ? 'objects' : 'picture', opts: { every: 600 } }), {
    fps: 15,
    state: lens,
    onFrame: () => {
      state('')
      if (lens.detectedAt === seenAt) return
      seenAt = lens.detectedAt
      if (lens.detectMs) msEl.textContent = `${Math.round(lens.detectMs)} ms`
      say()
    },
  })

  specimen.on(() => { lens.detections = []; lens.detectedAt = 0; lens.detectedFrame = -1; say() })
  thr.addEventListener('input', () => {
    lens.minScore = Number(thr.value) / 100
    lens.detectedFrame = -1 // a still or photo is looked at again with the new threshold
    thrOut.textContent = `${thr.value}%`
    say()
  })
  go.addEventListener('click', start)
  captureBtn.addEventListener('click', capture)
  listEl.addEventListener('click', (e) => {
    const b = e.target.closest('[data-challenge]')
    if (!b) return
    active = b.dataset.challenge
    renderChallenges()
    say()
  })
  galleryEl.addEventListener('click', (e) => {
    const shotN = Number(e.target.closest('[data-shot]')?.dataset.shot)
    if (e.target.closest('[data-remove]')) captures = captures.filter((c) => c.n !== shotN)
    else if (e.target.closest('[data-fooled]')) captures = captures.map((c) => (c.n === shotN ? { ...c, fooled: !c.fooled } : c))
    else return
    renderGallery()
  })
  onLang(() => { say(); renderScore(); for (const c of captures) paintTile(c) })

  state(t('ยังไม่ได้เปิดกล้อง', 'No camera open yet'))
  thrOut.textContent = `${thr.value}%`
  renderGallery()
  say()
}
