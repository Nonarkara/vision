import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

globalThis.document = {
  documentElement: { dataset: { lang: 'en' } },
  createElement() {
    return { style: {}, setAttribute() {}, append() {}, getContext: () => ({}) }
  },
  getElementById: () => null,
  body: { append() {} },
  head: { append() {} },
}

let next = async () => new Response('no', { status: 500 })
globalThis.fetch = (url, opts) => {
  if (opts?.signal?.aborted) {
    const err = new Error('aborted')
    err.name = 'AbortError'
    return Promise.reject(err)
  }
  return next(url, opts)
}

const { openCamera, SourceError } = await import('../public/js/core/source.js')
const cam = { id: 'pakkret:CAMPK001', k: 'still' }

test('a Cloudflare 504 page is named as the tunnel, not the neural network', async () => {
  next = async () => new Response('<html>cloudflare</html>', { status: 504, headers: { 'content-type': 'text/html' } })
  await assert.rejects(openCamera(cam), (err) => {
    assert.ok(err instanceof SourceError)
    assert.match(err.en, /tunnel answered 502\/504/)
    assert.match(err.en, /neural network did not fail/)
    return true
  })
})

test('a relay 424 keeps the owner\'s reason', async () => {
  next = async () => new Response(JSON.stringify({ error: 'upstream did not answer in time' }), {
    status: 424,
    headers: { 'content-type': 'application/json' },
  })
  await assert.rejects(openCamera(cam), (err) => err instanceof SourceError && /did not answer in time/.test(err.en))
})

test('an aborted open does not look like a dead camera', async () => {
  const signal = AbortSignal.abort()
  await assert.rejects(openCamera(cam, { signal }), (err) => err instanceof SourceError && err.en === 'Camera open was cancelled')
})

test('the traffic-light canvas is not the click target', () => {
  const css = fs.readFileSync(new URL('../public/css/pages/drive.css', import.meta.url), 'utf8')
  const grid = css.slice(css.indexOf('.captcha-grid {'), css.indexOf('.captcha-tiles {'))
  const tiles = css.slice(css.indexOf('.captcha-tiles {'), css.indexOf('.captcha-tiles .btn'))
  assert.match(grid, /pointer-events:\s*none/)
  assert.match(tiles, /z-index:\s*2/)
  const html = fs.readFileSync(new URL('../public/drive.html', import.meta.url), 'utf8')
  const picks = html.match(/<button\b[^>]*data-tile="\d"[^>]*>/g) ?? []
  assert.equal(picks.length, 9)
  assert.ok(picks.every((tag) => tag.includes('type="button"')))
})
