// The site promises, in public, on /legal: "No analytics, no advertising, no
// third-party tracking scripts." That promise is kept by exactly one thing: the
// Content-Security-Policy, which refuses to execute anything that did not come
// from this origin.
//
// Cloudflare's Web Analytics injects a <script src="static.cloudflareinsights.com/
// beacon.min.js"> tag into every page it serves. The CSP blocks it, so nothing
// runs, no cookie is set and no data is collected — but the tag is there, and
// every page load logs a red CSP violation. That is the honest state of affairs
// and it is deliberate, not an oversight.
//
// This script exists to stop the one fix that would quietly destroy the
// promise: adding static.cloudflareinsights.com to script-src "to silence the
// console error". That change makes the console clean and starts collecting
// analytics at the same time. It would look like a cleanup.
//
// So: script-src must never widen to a third party. The beacon tag itself is
// added at the edge and cannot be removed from the origin; the one-click fix is
// Web Analytics off in the Cloudflare zone, which this repo cannot do.
//
//   node scripts/check-privacy.mjs

import http from 'node:http'
import { handler } from '../server/index.js'
import { PAGES } from '../server/http.js'

const server = http.createServer(handler)
await new Promise((r) => server.listen(0, '127.0.0.1', r))
const base = `http://127.0.0.1:${server.address().port}`

const problems = []
const fail = (where, what) => problems.push(`${where}: ${what}`)

// 1. script-src must stay closed. A third-party host here means code from
//    somewhere else can run on a page, which is the thing /legal denies.
const sample = ['/index.html', '/drive.html', '/research.html', '/everyday.html', '/legal.html']
for (const page of sample) {
  const res = await fetch(base + page)
  const csp = res.headers.get('content-security-policy') ?? ''
  if (!csp) { fail(page, 'no CSP header — nothing is enforcing the no-tracking promise'); continue }

  const scriptSrc = /;\s*script-src([^;]*)/.exec(csp)?.[1] ?? ''
  if (!scriptSrc.trim()) { fail(page, 'no script-src directive'); continue }

  // Any URL-ish source, a bare wildcard, or unsafe-inline/eval all widen it.
  const host = /(?:^|[\s,])https?:\/\/[^\s,]+/g
  for (const m of scriptSrc.match(host) ?? []) fail(page, `script-src allows a third party: ${m.trim()}`)
  if (/(?:^|[\s,])\*(?:[\s,]|$)/.test(scriptSrc)) fail(page, 'script-src allows any origin')
  for (const risky of ['unsafe-inline', 'unsafe-eval']) {
    if (scriptSrc.includes(risky)) fail(page, `script-src contains ${risky}`)
  }
}

// 2. The origin must never serve a third-party <script src>. The origin is
//    clean today; this is here so it stays that way if someone pastes one in.
for (const route of Object.keys(PAGES)) {
  const html = await (await fetch(base + route)).text()
  const srcs = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1])
  for (const src of srcs) {
    if (/^https?:\/\//i.test(src)) fail(route, `serves a third-party script: ${src}`)
  }
}

// 3. The promise must still be written down. If it is deleted, the check above
//    stops describing anything anyone is actually promising.
const legal = await (await fetch(base + '/legal.html')).text()
if (!legal.includes('No analytics, no advertising, no third-party tracking scripts.')) {
  fail('/legal.html', 'the no-tracking promise has been edited or removed — if that is deliberate, say so here')
}

// 4. Report the known residual honestly rather than pretending it is not there.
const beacon = /static\.cloudflareinsights\.com/
const injected = (await (await fetch(base + '/index.html')).text()).match(beacon)
console.log('privacy:')
console.log(`  script-src closed on ${sample.length} pages — no third-party code can run`)
console.log(`  origin serves no third-party script`)
if (injected) console.log('  ! a Cloudflare beacon is present in this response — investigate')
else console.log('  origin response carries no Cloudflare beacon (any tag seen in a browser is added at the edge)')

server.close()
// `problems` is an array, not a Set — `.size` here would be undefined, which is
// falsy, and this whole script would pass no matter what it found.
if (problems.length) {
  console.error(`\n✗ ${problems.length} privacy problem(s):\n  ` + problems.join('\n  '))
  process.exit(1)
}
console.log('✓ the no-analytics promise is enforced by the CSP, not just asserted')