// Three languages, one argument. Static prose carries Thai, English and
// Simplified Chinese in the markup and CSS shows one; dynamic text asks t()
// at render time and re-renders on 'langchange'. Chinese falls back to the
// English source when a line has not been translated yet.

import { ZH } from './zh-dict.js'

const KEY = 'vision_lang_v1'
export const LANGS = ['th', 'en', 'zh']

export function lang() {
  const l = document.documentElement.dataset.lang
  return LANGS.includes(l) ? l : 'th'
}

/** BCP 47 tag for dates and numbers that are not already passed through n(). */
export function locale() {
  const l = lang()
  if (l === 'zh') return 'zh-Hans'
  if (l === 'en') return 'en-GB'
  return 'th-TH'
}

/** Chinese for an English source string, if the classroom has one. */
export function lookup(en) {
  return Object.prototype.hasOwnProperty.call(ZH, en) ? ZH[en] : undefined
}

export function t(th, en, zh) {
  const l = lang()
  if (l === 'en') return en
  if (l === 'zh') return zh ?? lookup(en) ?? en
  return th
}

/** Same choice when the caller already knows the language (drive, games). */
export function phraseFor(l, th, en, zh) {
  if (l === 'en') return en
  if (l === 'zh') return zh ?? lookup(en) ?? en
  return th
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

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c])
}

/** All three languages as markup, so a language switch needs no re-render. */
export function bi(th, en, zh) {
  const z = zh ?? lookup(en) ?? en
  return `<span class="th" lang="th">${esc(th)}</span><span class="en" lang="en">${esc(en)}</span><span class="zh" lang="zh-Hans">${esc(z)}</span>`
}

const nf = {
  th: new Intl.NumberFormat('th-TH'),
  en: new Intl.NumberFormat('en-GB'),
  zh: new Intl.NumberFormat('zh-Hans'),
}
export function n(x) {
  return (nf[lang()] ?? nf.en).format(x)
}

/**
 * A count in front of an English noun. "1 boxes pass the line" is the kind of
 * sentence that tells a reader a machine wrote the page. Thai and Chinese have
 * no plural, so only the English form changes.
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
