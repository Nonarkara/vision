import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// The head of /train carries the title and the sentence that explains the task.
//
// 1.22.1 put them in one column. That closed the 580px hole between them — the
// finding 1.21.0 left on every room — but it left the top third of the first
// screen empty on the right: the band was 1348px wide and 576px of it carried
// anything. The title's column is now sized to the title, so the two sit side
// by side with a 24px gap, and the phone stacks them.
//
// These pins hold the decisions in the stylesheet, where they are made. Two of
// them hold what this change decides — the column that hugs, and the top
// alignment that keeps the two on one line. The other two hold the invariants
// it depends on: the title must stay uncapped for the column to hug it, and the
// sentence must stay inside a readable line. Each was proved by changing the
// stylesheet and watching the pin fail.

const css = readFileSync(new URL('../public/css/pages/train.css', import.meta.url), 'utf8')

/** The declarations of the last rule whose prelude names exactly `selector`. */
function lastRule(selector, source = css) {
  const re = /([^{}]+)\{([^}]*)\}/g
  let found = null
  let m
  while ((m = re.exec(source))) {
    const preludes = m[1].replace(/\/\*[\s\S]*?\*\//g, '').split(',').map((s) => s.trim())
    if (preludes.includes(selector)) found = m[2]
  }
  return found || ''
}

/** Every `@media` block whose condition mentions the given query, spaces ignored. */
function mediaBlocks(query) {
  const out = []
  const re = /@media([^{]*)\{/g
  let m
  while ((m = re.exec(css))) {
    const cond = m[1].replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, '')
    const open = m.index + m[0].length - 1
    let depth = 0
    let i = open
    for (; i < css.length; i++) {
      if (css[i] === '{') depth++
      else if (css[i] === '}') { depth--; if (!depth) break }
    }
    out.push({ cond, body: css.slice(open + 1, i) })
  }
  return out.filter((b) => b.cond.includes(query))
}

test('the title sits beside the sentence that explains the task', () => {
  const head = lastRule('body main .page-head')
  assert.match(
    head,
    /grid-template-columns:\s*auto\s+minmax\(0,\s*1fr\)/,
    'the title column must be sized to the title, not to a share of the band'
  )
  assert.match(head, /gap:\s*8px\s+24px/, 'the two must sit close enough to read as one unit')
})

test('the title and the sentence stand on the same line', () => {
  const head = lastRule('body main .page-head')
  assert.match(head, /align-items:\s*start/, 'the two must align at the top, not hang from the bottom')
})

test('the title is not capped, so its column can hug it', () => {
  const h1 = lastRule('body main .page-head h1')
  assert.match(h1, /max-width:\s*none/, 'a capped title would leave a hole inside its own column')
})

test('the sentence that explains the task stays inside a readable line', () => {
  const lede = lastRule('body main .page-head .lede')
  assert.match(lede, /max-width:\s*60ch/, 'prose stays within 65ch')
})

test('the head stacks on a phone, because two columns do not fit in 390px', () => {
  const narrow = mediaBlocks('max-width:900px')
  const stacked = narrow.filter((b) =>
    /grid-template-columns:\s*minmax\(0,\s*1fr\)/.test(lastRule('body main .page-head', b.body))
  )
  assert.equal(stacked.length > 0, true, 'a phone rule must put the head in one column')
})
