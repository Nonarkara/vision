import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'

// The manual is a house component. It was not always one: the `.howto` styles
// lived only in train.css, so the gesture room's four steps rendered as an
// unstyled list — no numbers, no ticks. These tests pin the component, the
// step shape and the two faces, so neither can quietly break again.

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const pages = readdirSync(new URL('../public', import.meta.url)).filter((f) => f.endsWith('.html'))
const css = read('public/css/vision.css')

const manuals = []
for (const file of pages) {
  const html = read(`public/${file}`)
  for (const m of html.matchAll(/<ol class="manual"[^>]*>([\s\S]*?)<\/ol>/g)) {
    manuals.push({ file, markup: m[0], body: m[1] })
  }
}

test('the manual is a house component, so it lives in the house stylesheet', () => {
  assert.ok(css.includes('.manual {'), 'vision.css must carry the manual component')
  assert.ok(css.includes('.manual li'), 'vision.css must carry the manual step')
  assert.ok(css.includes('.manual-n'), 'vision.css must carry the step marker')
  assert.ok(css.includes('.manual .part'), 'vision.css must carry the named part')
  // No page may carry its own copy of the component: that is how the gesture
  // room lost its manual in the first place.
  for (const file of readdirSync(new URL('../public/css/pages', import.meta.url))) {
    const page = read(`public/css/pages/${file}`)
    assert.ok(!/\.manual\s*\{/.test(page), `${file} must not re-declare the manual component`)
  }
})

test('every room that carries a manual has one', () => {
  const carriers = [...new Set(manuals.map((m) => m.file))].sort()
  assert.deepEqual(carriers, ['cameras.html', 'colour.html', 'focus.html', 'games.html', 'gesture.html', 'research.html', 'train.html'])
})

test('a manual step is one number and one body', () => {
  for (const m of manuals) {
    const steps = [...m.body.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((s) => s[1])
    assert.ok(steps.length > 0, `${m.file}: a manual with no steps`)
    for (const [i, step] of steps.entries()) {
      const markers = [...step.matchAll(/<span class="manual-n"[^>]*>([^<]*)</g)]
      assert.equal(markers.length, 1, `${m.file} step ${i + 1}: exactly one number marker`)
      assert.equal(markers[0][1].trim(), String(i + 1), `${m.file} step ${i + 1}: numbers run 1, 2, 3 …`)
      assert.equal((step.match(/class="manual-body"/g) || []).length, 1, `${m.file} step ${i + 1}: exactly one body`)
    }
  }
})

test('a manual is five steps at most', () => {
  for (const m of manuals) {
    const steps = [...m.body.matchAll(/<li[^>]*>/g)].length
    assert.ok(steps <= 5, `${m.file}: a manual of ${steps} steps is not a manual — split it`)
  }
})

test('a manual speaks in both house languages', () => {
  for (const m of manuals) {
    for (const [i, step] of [...m.body.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((s) => s[1]).entries()) {
      assert.ok(/class="th"[^>]*lang="th"/.test(step), `${m.file} step ${i + 1}: a Thai line`)
      assert.ok(/class="en"[^>]*lang="en"/.test(step), `${m.file} step ${i + 1}: an English line`)
    }
  }
})

test('a named part is named the same number of times in both languages', () => {
  for (const m of manuals) {
    const th = [...m.body.matchAll(/class="th"[^>]*>([\s\S]*?)<\/span>/g)].map((x) => x[1]).join('')
    const en = [...m.body.matchAll(/class="en"[^>]*>([\s\S]*?)<\/span>/g)].map((x) => x[1]).join('')
    const count = (s) => (s.match(/<code class="part"/g) || []).length
    assert.equal(count(th), count(en), `${m.file}: the two languages must name the same parts`)
  }
})

test('the live steps tick the same keys the page scripts watch', () => {
  for (const [file, js] of [['gesture.html', 'public/js/pages/gesture.js'], ['train.html', 'public/js/pages/train.js']]) {
    const html = read(`public/${file}`)
    const source = read(js)
    const keys = [...html.matchAll(/data-step="([^"]+)"/g)].map((m) => m[1])
    assert.ok(keys.length > 0, `${file}: a live manual must carry data-step`)
    const watched = source.slice(source.indexOf('const STEPS = {'))
    const block = watched.slice(0, watched.indexOf('}'))
    for (const key of keys) {
      assert.ok(new RegExp(`\\b${key}:`).test(block), `${file}: the script watches no step named "${key}"`)
    }
    const declared = [...block.matchAll(/(\w+):\s*\(/g)].map((m) => m[1])
    for (const key of declared) {
      assert.ok(keys.includes(key), `${file}: the script watches "${key}" but the manual has no such step`)
    }
  }
})

test('a named part names something that is really on the page', () => {
  // The lesson rewrites its buttons at runtime ("Busy road + Add example · 0 / 3
  // to start"), so a chip that named the static label named nothing a reader
  // could see. Every chip must appear in the page's own markup or in the
  // strings its scripts build.
  for (const m of manuals) {
    const html = read(`public/${m.file}`)
    const js = ['public/js/pages/', 'public/js/cameras/', 'public/js/games/', 'public/js/train/', 'public/js/core/']
      .flatMap((d) => readdirSync(new URL(`../${d}`, import.meta.url)).filter((f) => f.endsWith('.js')).map((f) => read(d + f)))
      .join('\n')
    const haystack = (html + '\n' + js).toLowerCase()
    for (const chip of m.markup.matchAll(/<code class="part">([^<]*)<\/code>/g)) {
      const text = chip[1].replace(/\s+/g, ' ').trim()
      assert.ok(text.length > 0, `${m.file}: an empty part name`)
      assert.ok(haystack.includes(text.toLowerCase()), `${m.file}: "${text}" names nothing on the page`)
    }
  }
})

test('the rooms that failed the manual test were simplified, not documented around', () => {
  // /train: the gesture room is a different room, so it is no longer offered as
  // a fifth thing to teach in the same chooser.
  const train = read('public/train.html')
  assert.ok(!/training-choice" href="\/gesture"/.test(train), 'the gesture room must not sit in the teaching chooser')
  assert.ok(/href="\/gesture"/.test(train), 'the gesture room must still be one click away')
  // /games: one game at a time, chosen at the top.
  const games = read('public/games.html')
  assert.ok(/data-game-picker/.test(games), '/games must offer a choice of game')
  assert.ok(!/class="game-rules"/.test(games), '/games rules must be manuals, not prose')
  // /cameras: one action per row.
  const list = read('public/js/cameras/list.js')
  assert.ok(!/class="btn" href="\$\{esc\(c\.w\)\}"/.test(list), 'the owner link is not a button field in a row')
  assert.ok(/data-study/.test(list), 'the row keeps its one action')
})
