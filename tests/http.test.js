import { test } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { safeResolve, assemblePage, createLimiter, clientIp, CSP, PAGES } from '../server/http.js'

const PUBLIC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'public')

test('safeResolve serves real files and refuses traversal, dotfiles, NUL and directories', () => {
  assert.ok(safeResolve(PUBLIC, '/index.html'))
  assert.equal(safeResolve(PUBLIC, '/../package.json'), null)
  assert.equal(safeResolve(PUBLIC, '/%2e%2e/package.json'), null)
  assert.equal(safeResolve(PUBLIC, '/js/../../server/index.js'), null)
  assert.equal(safeResolve(PUBLIC, '/.env'), null)
  assert.equal(safeResolve(PUBLIC, '/index.html%00.js'), null)
  assert.equal(safeResolve(PUBLIC, '/%E0%A4%A'), null)
  assert.equal(safeResolve(PUBLIC, '/js'), null)
})

test('every page in the router exists on disk', () => {
  for (const name of Object.values(PAGES)) assert.ok(safeResolve(PUBLIC, `/${name}.html`), `${name}.html missing`)
})

test('assemblePage fills partials, marks the current page and stamps the version', () => {
  const html = '<!--#nav--><p>{{v}}</p><!--#missing-->'
  const out = assemblePage(html, { partials: { nav: '<a data-page="learn">L</a>' }, page: 'learn', version: '9.9.9' })
  assert.equal(out, '<a data-page="learn" aria-current="page">L</a><p>9.9.9</p><!--#missing-->')
})

test('limiter allows a burst then refills at the stated rate', () => {
  let t = 0
  const lim = createLimiter({ rate: 60, burst: 3, now: () => t })
  assert.deepEqual([lim.take('a'), lim.take('a'), lim.take('a'), lim.take('a')], [true, true, true, false])
  assert.equal(lim.take('b'), true, 'keys are independent')
  t += 1000
  assert.equal(lim.take('a'), true)
  assert.equal(lim.take('a'), false)
})

test('clientIp trusts cf-connecting-ip only from loopback', () => {
  assert.equal(clientIp({ socket: { remoteAddress: '127.0.0.1' }, headers: { 'cf-connecting-ip': '1.2.3.4' } }), '1.2.3.4')
  assert.equal(clientIp({ socket: { remoteAddress: '9.9.9.9' }, headers: { 'cf-connecting-ip': '1.2.3.4' } }), '9.9.9.9')
})

test('CSP forbids inline script, eval and framing', () => {
  assert.match(CSP, /script-src 'self'(;|$)/)
  assert.doesNotMatch(CSP, /unsafe-(inline|eval)/)
  assert.match(CSP, /frame-ancestors 'none'/)
})

test('static memo is keyed by file, so slash variants do not grow memory, and raw templates are never served', async () => {
  const { createStatic } = await import('../server/http.js')
  const statics = createStatic({ root: PUBLIC, version: 't' })
  const sent = []
  const res = () => ({ writeHead: (s) => sent.push(s), end() {} })
  const req = { method: 'GET', headers: {} }
  for (const p of ['/vendor/hls.min.js', '/vendor//hls.min.js', '/vendor///hls.min.js']) assert.equal(statics.serve(req, res(), p), true)
  assert.deepEqual(sent, [200, 200, 200])
  assert.equal(statics.serve(req, res(), '/404.html'), false)
  assert.equal(statics.serve(req, res(), '/learn.html'), true, 'clean page URL with .html still assembles')
})

test('original photos (with GPS metadata) are never served', async () => {
  const { createStatic } = await import('../server/http.js')
  const statics = createStatic({ root: PUBLIC, version: 't' })
  const res = { writeHead() {}, end() {} }
  assert.equal(statics.serve({ method: 'GET', headers: {} }, res, '/CCTV%20photos/Rawai,%20Phuket%20Municipality.jpg'), false)
  assert.equal(statics.serve({ method: 'GET', headers: {} }, res, '/img/ioc/rawai.jpg'), true)
})
