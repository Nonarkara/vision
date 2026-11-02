import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createStatic } from '../server/http.js'

const root = path.resolve(fileURLToPath(new URL('../public/', import.meta.url)))
const movie = '/media/lessons/stickers-1.25.0.mp4'
const size = fs.statSync(root + movie).size

async function mediaServer(t) {
  const statics = createStatic({ root, version: 'test' })
  const server = http.createServer((req, res) => {
    if (!statics.serve(req, res, req.url)) { res.writeHead(404); res.end() }
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  t.after(() => server.close())
  return `http://127.0.0.1:${server.address().port}`
}

function bytes(start, length) {
  const fd = fs.openSync(root + movie, 'r')
  try {
    const result = Buffer.alloc(length)
    fs.readSync(fd, result, 0, length, start)
    return result
  } finally { fs.closeSync(fd) }
}

test('lesson film serves typed HEAD, cache validation and captions without downloading the film', async t => {
  const base = await mediaServer(t)
  const head = await fetch(base + movie, { method: 'HEAD' })
  assert.equal(head.status, 200)
  assert.equal(head.headers.get('content-type'), 'video/mp4')
  assert.equal(head.headers.get('accept-ranges'), 'bytes')
  assert.equal(Number(head.headers.get('content-length')), size)
  const cached = await fetch(base + movie, { headers: { 'if-none-match': head.headers.get('etag') } })
  assert.equal(cached.status, 304)
  const captions = await fetch(base + '/media/lessons/stickers-en-1.25.0.vtt')
  assert.match(captions.headers.get('content-type'), /^text\/vtt/)
  assert.match(await captions.text(), /^WEBVTT/)
})

test('film seeks return exact prefix, suffix and open-ended byte ranges', async t => {
  const base = await mediaServer(t)
  for (const [range, start, length] of [['bytes=0-31', 0, 32], ['bytes=-16', size - 16, 16], [`bytes=${size - 24}-`, size - 24, 24], [`bytes=${size - 8}-${size + 99}`, size - 8, 8]]) {
    const response = await fetch(base + movie, { headers: { range } })
    assert.equal(response.status, 206, range)
    assert.equal(response.headers.get('content-range'), `bytes ${start}-${start + length - 1}/${size}`)
    assert.equal(Number(response.headers.get('content-length')), length)
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes(start, length))
  }
})

test('unsatisfiable ranges fail boundedly and weak If-Range validators return a full representation', async t => {
  const base = await mediaServer(t)
  for (const range of [`bytes=${size}-`, 'bytes=20-10', 'bytes=-0', 'bytes=-', 'bytes=oops', 'bytes=0-1,3-4']) {
    const response = await fetch(base + movie, { headers: { range } })
    assert.equal(response.status, 416, range)
    assert.equal(response.headers.get('content-range'), `bytes */${size}`)
    assert.equal((await response.arrayBuffer()).byteLength, 0)
  }
  const head = await fetch(base + movie, { method: 'HEAD', headers: { range: 'bytes=0-31', 'if-range': 'W/"old"' } })
  assert.equal(head.status, 200)
  assert.equal(Number(head.headers.get('content-length')), size)
})
