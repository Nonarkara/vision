// Two languages, one argument. Static prose carries both languages in the
// markup and CSS shows one; dynamic text asks t() at render time and
// re-renders on 'langchange'.

const KEY = 'vision_lang_v1'

export function lang() {
  return document.documentElement.dataset.lang === 'en' ? 'en' : 'th'
}

export function t(th, en) {
  return lang() === 'en' ? en : th
}

export function setLang(next) {
  const l = next === 'en' ? 'en' : 'th'
  document.documentElement.dataset.lang = l
  document.documentElement.lang = l
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

/** Both languages as markup, so a language switch needs no re-render. */
export function bi(th, en) {
  return `<span class="th" lang="th">${esc(th)}</span><span class="en" lang="en">${esc(en)}</span>`
}

const nf = { th: new Intl.NumberFormat('th-TH'), en: new Intl.NumberFormat('en-GB') }
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
