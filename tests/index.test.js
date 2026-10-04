import { test } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import net from 'node:net'
import { handler, parseTarget } from '../server/index.js'

test('parseTarget accepts paths and refuses authority-shaped targets without throwing', () => {
  assert.equal(parseTarget('/api/health?x=1').pathname, '/api/health')
  assert.equal(parseTarget('//x:99999').pathname, '/x:99999')
  assert.equal(parseTarget('http://evil/'), null)
  assert.equal(parseTarget(undefined), null)
})

test('hostile request targets get an answer, not a crash', async () => {
  const server = http.createServer(handler)
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  const { port } = server.address()
  const raw = (target) => new Promise((resolve) => {
    const s = net.connect(port, '127.0.0.1', () => s.write(`GET ${target} HTTP/1.1\r\nHost: x\r\nConnection: close\r\n\r\n`))
    let buf = ''
    s.on('data', (d) => { buf += d })
    s.on('end', () => resolve(Number(buf.split(' ')[1])))
    s.on('error', () => resolve(0))
  })
  for (const t of ['//x:99999', '//[', '/%E0%A4%A', '/index.html', '/404.html']) {
    const code = await raw(t)
    assert.ok(code >= 200 && code < 500, `${t} → ${code}`)
  }
  assert.equal(await raw('/index.html'), 200)
  server.close()
})
