// Three languages. Static prose carries Thai, English and, where the line is
// new, Simplified Chinese; CSS shows one. Untranslated English stays visible
// in Chinese mode when no Chinese span follows it. Dynamic text asks t() at
// render time and re-renders on 'langchange'.

const KEY = 'vision_lang_v1'
const LANGS = ['th', 'en', 'zh']

export function lang() {
  const l = document.documentElement.dataset.lang
  return LANGS.includes(l) ? l : 'th'
}

export function t(th, en, zh = en) {
  const l = lang()
  if (l === 'en') return en
  if (l === 'zh') return zh
  return th
}

/** The language button walks Thai → English → Simplified Chinese. */
export function nextLang(current) {
  const i = LANGS.indexOf(current)
  return LANGS[i < 0 ? 0 : (i + 1) % LANGS.length]
}

export function setLang(next) {
  const l = LANGS.includes(next) ? next : 'th'
  document.documentElement.dataset.lang = l
  document.documentElement.lang = l === 'zh' ? 'zh-Hans' : l
  try { localStorage.setItem(KEY, l) } catch { /* private mode: choice lasts this page only */ }
  document.dispatchEvent(new CustomEvent('langchange', { detail: { lang: l } }))
}

export function onLang(fn) {
  document.addEventListener('langchange', () => fn(lang()))
}

/**
 * Say so when this page has no Chinese, instead of quietly showing English.
 *
 * Every room is written in Thai and English. Chinese is being added room by
 * room, and where it is missing CSS keeps the English visible so the page is
 * never blank — which is the right behaviour for the content and the wrong
 * behaviour for the reader, because nothing says what is happening. A visitor
 * who asked for Chinese and silently received English has been told, by
 * implication, that this is what Chinese looks like.
 *
 * "Has Chinese" is counted rather than declared, because a page can carry a
 * few Chinese lines without being a Chinese page: the learning-path rail is
 * written in all three languages and appears on four rooms, and eight Chinese
 * spans do not make a room translated. A room is treated as translated once
 * at least half its lines have a Chinese span beside them — the rooms that are
 * finished score 1.00, the rest score below 0.02, so the line is nowhere near
 * either. The note is a status line, not an error, and never blocks the page.
 */
export function noteMissingTranslation(root = document.body) {
  // Called at module scope, so the body may not be a real element yet — or may
  // not be one at all, under a test harness. Nothing to say to nobody.
  if (typeof root?.querySelector !== 'function') return
  const existing = root.querySelector('.lang-note')
  if (existing) existing.remove()
  if (lang() !== 'zh') return
  // Translated navigation is not evidence that the handbook article is translated.
  const content = root.querySelector('main .doc') ?? root.querySelector('main') ?? root
  const th = content.querySelectorAll('[lang="th"]').length
  const zh = content.querySelectorAll('[lang|="zh"]').length
  if (th > 0 && zh >= th / 2) return
  const note = document.createElement('p')
  note.className = 'lang-note'
  note.setAttribute('role', 'status')
  note.innerHTML = '<span lang="zh-Hans">这一页还没有中文，下面是英文内容。中文正在逐个房间补上。</span>'
  root.prepend(note)
}

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c])
}

/** Both languages as markup, so a language switch needs no re-render.
 *  A third argument adds Simplified Chinese after the English span. */
export function bi(th, en, zh) {
  const zhSpan = zh == null ? '' : `<span class="zh" lang="zh-Hans">${esc(zh)}</span>`
  return `<span class="th" lang="th">${esc(th)}</span><span class="en" lang="en">${esc(en)}</span>${zhSpan}`
}

const nf = { th: new Intl.NumberFormat('th-TH'), en: new Intl.NumberFormat('en-GB'), zh: new Intl.NumberFormat('zh-CN') }
export function n(x) {
  return nf[lang()].format(x)
}

/**
 * A count in front of an English noun. "1 boxes pass the line" is the kind of
 * sentence that tells a reader a machine wrote the page; Thai has no plural, so
 * only the English form changes.
 *
 * The plural is built the way English builds it rather than by tacking an "s"
 * on: "box" would otherwise come out as "boxs". Words that need something else
 * still pass their own form.
 */
export function count(x, one, many = plural(one)) {
  return lang() === 'en' ? `${n(x)} ${x === 1 ? one : many}` : `${n(x)} ${one}`
}

function plural(one) {
  if (/(s|x|z|ch|sh)$/.test(one)) return `${one}es`
  if (/[^aeiou]y$/.test(one)) return `${one.slice(0, -1)}ies`
  return `${one}s`
}

export function pct(x, digits = 0) {
  return `${(x * 100).toFixed(digits)}%`
}
