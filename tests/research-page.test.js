import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

/**
 * /research — the composition of the page, not its content.
 *
 * This page described the field well and drew it badly. Six catalogue numbers in
 * one row at display size, so 3,425 cameras and 7 agencies shouted equally.
 * Four solid black buttons to choose a year, each far bigger than the words in
 * it. A row of "choose where to start" buttons, each sized to its own text,
 * staircasing down the page-head. Every one of them is the same failure — equal
 * weight, so nothing wins — and none of it is visible from the stylesheet alone.
 *
 * These pin the decisions, not the taste. Each was mutation-checked: put the
 * boxes back, and the test that should fail does.
 */

const html = readFileSync(new URL('../public/research.html', import.meta.url), 'utf8')
const css = readFileSync(new URL('../public/css/pages/research.css', import.meta.url), 'utf8')
const js = readFileSync(new URL('../public/js/pages/research.js', import.meta.url), 'utf8')

/** The declaration block of one rule, by exact selector. */
const ruleBody = (selector, source = css) => {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`^[ \\t]*${esc}[ \\t]*\\{([^}]*)\\}`, 'm').exec(source)?.[1] ?? null
}
/** What a rule's `background` actually is — '' when it declares none. */
const fill = (body) => (/(?:^|;)\s*background\s*:\s*([^;]*)/.exec(body ?? '')?.[1] ?? '').trim()
const size = (body) => /(?:^|;)\s*font-size\s*:\s*([^;]*)/.exec(body ?? '')?.[1]?.trim()

test('one number carries the catalogue and the other five are facts beside it', () => {
  const section = /<section class="figures[^"]*"[\s\S]*?<\/section>/.exec(html)?.[0] ?? ''
  assert.ok(section, 'the figures section is gone')

  const leads = section.match(/class="figure is-lead"/g) ?? []
  assert.equal(leads.length, 1, 'there must be exactly one number the page leads with')
  // …and it has to be the camera count, which is the floor the page stands on.
  const leadBlock = /class="figure is-lead">[\s\S]*?<\/div>/.exec(section)?.[0] ?? ''
  assert.match(leadBlock, /data-fig="total"/, 'the lead number is not the camera count')

  const rest = /class="figures-rest">[\s\S]*?<\/div>\s*<\/section>/.exec(section)?.[0] ?? ''
  assert.equal((rest.match(/class="figure"/g) ?? []).length, 5, 'the five supporting facts are not all present')
  assert.equal((section.match(/data-fig=/g) ?? []).length, 6, 'a count was lost or invented')

  // The lead must actually be larger, or the markup change bought nothing.
  const leadSize = size(ruleBody('.figures-lead .is-lead .n'))
  const restSize = size(ruleBody('.figures-lead .figures-rest .n'))
  assert.ok(leadSize && restSize, 'the two figure sizes are not both declared')
  assert.match(leadSize, /^clamp\(/, `the lead number is ${leadSize}, not a display size`)
  // The top of the clamp is what the largest screens actually get, so that is
  // the number worth holding to — 3rem is the smallest that still reads as a
  // headline rather than a fact.
  const top = Number(leadSize.match(/[\d.]+(?=rem\))/)?.[0])
  assert.ok(top >= 3, `the lead number tops out at ${leadSize} — under 3rem it is not a headline`)
  assert.equal(restSize, 'var(--body)', `the supporting facts are set at ${restSize}, not body size`)
})

test('the figure treatment is scoped, not sprayed across the shared class', () => {
  // .figures is used by /cameras, /index and /reconstruct too. Those pages have
  // not been reworked, so a rule that reached the bare .figure or .figures would
  // be changing four pages on the strength of one.
  assert.match(html, /class="figures figures-lead"/, 'the research figures are not carrying the scoping class')
  assert.ok(!ruleBody('.figure .n'), 'research.css is restyling the shared .figure')
  assert.ok(!ruleBody('.figures'), 'research.css is restyling the shared .figures')
})

test('the four landmarks are marks on one axis, not four boxes', () => {
  const marks = html.match(/<button[^>]*data-history-choice[^>]*>/g) ?? []
  assert.equal(marks.length, 4, 'expected four landmarks')
  for (const m of marks) {
    assert.match(m, /class="axis-mark"/, 'a landmark is a button again')
    assert.doesNotMatch(m, /class="btn/, 'a landmark is a filled field again')
  }

  const body = ruleBody('.axis-mark')
  assert.ok(body, 'the mark rule is gone')
  assert.ok(['', 'transparent'].includes(fill(body)), `a landmark is a filled field again: background: ${fill(body)}`)
  // The axis itself: one edge per mark, welding into a single rule.
  assert.match(body, /border-top:\s*3px solid var\(--text\)/, 'the marks no longer form a line')

  // And the chosen year is the one filled thing, which is the only way the eye
  // is told where it is.
  assert.match(ruleBody('.axis-mark[aria-pressed="true"] .num') ?? '', /background:\s*var\(--text\)/)
  assert.match(ruleBody('.axis-mark[aria-pressed="true"] .num') ?? '', /color:\s*var\(--ground\)/)
})

test('the axis turns vertical on a phone rather than cramming four into one row', () => {
  // Four columns at 390px would wrap "Point to an object, select its pixels"
  // into five lines and read as a list, not a timeline.
  const narrow = [...css.matchAll(/@media \(max-width: (\d+)px\) \{([\s\S]*?)\n\}/g)]
    .filter(([, width]) => Number(width) <= 900)
    .map(([, , body]) => body)
    .join('\n')
  assert.match(narrow, /\.axis-mark[\s\S]*?border-left:\s*3px solid/, 'the axis stays horizontal on a phone')
  assert.match(narrow, /\.history-choices[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\)/, 'the marks stay four across on a phone')
})

test('one way in is a field and the rest are words, in both places that offer a way in', () => {
  // Page-head: four "choose where to start" buttons, staircasing down the page.
  const cta = /<nav class="cta"[\s\S]*?<\/nav>/.exec(html)?.[0] ?? ''
  const ctaButtons = cta.match(/<a class="btn[^"]*"/g) ?? []
  assert.equal(ctaButtons.length, 4, 'expected four starting points')
  assert.equal((cta.match(/btn primary/g) ?? []).length, 1, 'more than one starting point is a field')

  // Each panel: try the lesson (a field) or read the paper (a word).
  for (const panel of html.match(/<div class="controls">[\s\S]*?<\/div>/g) ?? []) {
    if (!panel.includes('history') && !panel.includes('Original research') && !panel.includes('ต้นฉบับงานวิจัย')) continue
    assert.equal((panel.match(/btn primary/g) ?? []).length, 1, 'a panel offers more than one field')
  }

  // …and both are actually words in the stylesheet, not just unmarked in the HTML.
  assert.match(ruleBody('.page-head .cta .btn:not(.primary)') ?? '', /background:\s*transparent/)
  assert.match(ruleBody('.history-panel .controls .btn:not(.primary)') ?? '', /background:\s*transparent/)
})

test('the landmark chooser still degrades to four readable panels without JavaScript', () => {
  // The chooser is JS-only. If it were the only thing showing the four years,
  // a reader with no script would get none of them.
  assert.match(html, /class="history-choices" hidden/, 'the chooser is no longer hidden by default')
  const panels = html.match(/<article class="history-panel"[^>]*>/g) ?? []
  assert.equal(panels.length, 4, 'expected four panels')
  for (const p of panels) assert.doesNotMatch(p, /hidden/, 'a panel ships hidden and needs JS to appear')
  assert.match(js, /\.history-choices'\)\.hidden = false/, 'the script no longer reveals the chooser')
})