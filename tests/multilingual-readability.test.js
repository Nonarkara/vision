import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { LENS_ORDER, LENS_TEXT } from '../public/js/cv/lenses.js'
import { noteMissingTranslation } from '../public/js/core/i18n.js'
import { assemblePage, PAGES } from '../server/http.js'

const read = p => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8')

test('every lens can describe itself in all three supported languages', () => {
  for (const lens of LENS_ORDER) for (const language of ['th', 'en', 'zh']) {
    const [name, description] = LENS_TEXT[lens][language]
    assert.equal(typeof name, 'string', `${lens}/${language} has no name`)
    assert.ok(description?.length > 10, `${lens}/${language} has no explanation`)
  }
})

test('every routed page boots the shared language and navigation controls', () => {
  const partials = Object.fromEntries(['head', 'nav', 'foot', 'path'].map(p => [p, read(`public/partials/${p}.html`)]))
  for (const [route, page] of Object.entries(PAGES)) {
    const html = assemblePage(read(`public/${page}.html`), { partials, page, version: 'test', route })
    assert.equal((html.match(/<script type="module" src="\/js\/core\/site\.js\?v=test"><\/script>/g) ?? []).length, 1, route)
    if (route.startsWith('/handbook')) {
      const heading = html.match(/<h1>([\s\S]*?)<\/h1>/)?.[1] ?? ''
      for (const language of ['th', 'en', 'zh']) assert.match(heading, new RegExp(`class="${language}"`), `${route}/${language}`)
    }
  }
})

test('Chinese handbook chrome cannot hide an untranslated-article notice', ctx => {
  let notice = null
  const article = { querySelectorAll: selector => selector === '[lang="th"]' ? [1, 2] : [] }
  const root = {
    querySelector: selector => selector === 'main .doc' ? article : null,
    querySelectorAll: () => [1, 2, 3, 4, 5, 6], // navigation is translated
    prepend: node => { notice = node },
  }
  const previous = globalThis.document
  ctx.after(() => { globalThis.document = previous })
  globalThis.document = { documentElement: { dataset: { lang: 'zh' } }, createElement: () => ({ setAttribute() {} }) }
  noteMissingTranslation(root)
  assert.match(notice?.innerHTML ?? '', /下面是英文内容/)
})
