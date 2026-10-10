// The class list: a name, two ways to add examples, and the examples
// themselves as a strip of tiny pictures. Click a picture to throw it away —
// a bad example teaches as surely as a good one.

import { t, bi, esc, n, lang, onLang } from '../core/i18n.js'
import * as store from './store.js?v=1.13.0'
import { isBusy } from './eye.js'

const HOLD_MS = 250

/**
 * root: the <ol> that holds the classes. onCapture(key, { quiet }) adds one
 * example from the current frame. Returns { stopAll } for the page.
 */
export function createClassList(root, { onCapture }) {
  const holds = new Set()

  function stopAll() {
    for (const stop of holds) stop()
    holds.clear()
  }

  function rowHtml(c, i, count) {
    const id = `class-name-${c.key}`
    return `
      <li class="klass field-ink" data-key="${c.key}">
        <div class="klass-head">
          <span class="klass-glyph num" aria-hidden="true">${store.GLYPHS[i]}</span>
          <label class="vh" for="${id}">${bi(`ชื่อกลุ่มที่ ${i + 1}`, `Name of group ${i + 1}`)}</label>
          <input id="${id}" class="field-input klass-name" type="text" maxlength="32" autocomplete="off" spellcheck="false" value="${esc(store.nameOf(c, lang()))}">
          <span class="klass-count num" data-count></span>
        </div>
        <div class="controls klass-actions">
          <button class="btn" type="button" data-act="add">+ ${bi('เพิ่มตัวอย่าง', 'Add example')}</button>
          <button class="btn klass-hold" type="button" data-act="hold" aria-pressed="false">● ${bi('กดค้างเพื่ออัด', 'Hold to record')}</button>
          <button class="btn" type="button" data-act="clear">${bi('ล้าง', 'Clear')}</button>
          ${count > store.MIN_CLASSES ? `<button class="btn" type="button" data-act="remove" aria-label="${esc(t('ลบกลุ่มนี้', 'Remove this group'))}" title="${esc(t('ลบกลุ่มนี้', 'Remove this group'))}">×</button>` : ''}
        </div>
        <div class="shots" data-shots role="list" aria-label="${esc(t('ตัวอย่างในกลุ่มนี้', 'Examples in this group'))}"></div>
      </li>`
  }

  function render() {
    stopAll()
    const list = store.getClasses()
    root.innerHTML = list.map((c, i) => rowHtml(c, i, list.length)).join('')
    for (const li of root.querySelectorAll('.klass')) bindRow(li, Number(li.dataset.key))
    paintSamples()
  }

  function bindRow(li, key) {
    const input = li.querySelector('.klass-name')
    input.addEventListener('input', () => store.rename(key, input.value))
    li.querySelector('[data-act="add"]').addEventListener('click', () => onCapture(key, { quiet: false }))
    li.querySelector('[data-act="clear"]').addEventListener('click', () => store.clearClass(key))
    li.querySelector('[data-act="remove"]')?.addEventListener('click', () => store.removeClass(key))
    bindHold(li.querySelector('[data-act="hold"]'), key)
  }

  // "Hold to record": one example every quarter second while pressed — by
  // mouse, finger, or Space/Enter on the keyboard. If the network is still
  // busy with the last frame, this beat is skipped rather than queued.
  function bindHold(btn, key) {
    let timer = 0
    const tick = () => { if (!isBusy()) onCapture(key, { quiet: true }) }
    const stop = () => {
      if (!timer) return
      clearInterval(timer)
      timer = 0
      btn.setAttribute('aria-pressed', 'false')
      holds.delete(stop)
    }
    const start = () => {
      if (timer) return
      btn.setAttribute('aria-pressed', 'true')
      onCapture(key, { quiet: false })
      timer = setInterval(tick, HOLD_MS)
      holds.add(stop)
    }
    btn.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return
      e.preventDefault()
      btn.setPointerCapture?.(e.pointerId)
      start()
    })
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture', 'blur']) btn.addEventListener(ev, stop)
    btn.addEventListener('keydown', (e) => {
      if (e.key !== ' ' && e.key !== 'Enter') return
      e.preventDefault()
      if (!e.repeat) start()
    })
    btn.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') stop() })
    btn.addEventListener('contextmenu', (e) => e.preventDefault())
  }

  function shotButton(c, s, index) {
    const b = document.createElement('button')
    b.type = 'button'
    b.className = 'shot'
    b.setAttribute('role', 'listitem')
    const label = t(`ลบตัวอย่างที่ ${index + 1}`, `Remove example ${index + 1}`)
    b.setAttribute('aria-label', label)
    b.title = label
    b.append(s.thumb)
    b.addEventListener('click', () => store.removeSample(c.key, s.id))
    return b
  }

  /** Counts and thumbnails only — the inputs stay put so typing is never interrupted. */
  function paintSamples() {
    for (const c of store.getClasses()) {
      const li = root.querySelector(`.klass[data-key="${c.key}"]`)
      if (!li) continue
      li.querySelector('[data-count]').textContent = `${n(c.samples.length)} / ${n(store.MAX_PER_CLASS)}`
      const shots = li.querySelector('[data-shots]')
      // Newest first: the picture you just took is the one you want to check.
      const items = c.samples.map((s, i) => shotButton(c, s, i)).reverse()
      if (items.length) shots.replaceChildren(...items)
      else {
        const empty = document.createElement('span')
        empty.className = 'micro shots-empty'
        empty.textContent = t('ยังไม่มีตัวอย่าง', 'No examples yet')
        shots.replaceChildren(empty)
      }
    }
  }

  store.onChange((kind) => {
    if (kind === 'structure') render()
    else if (kind === 'samples') paintSamples()
  })
  onLang(render)

  return { render, stopAll }
}
