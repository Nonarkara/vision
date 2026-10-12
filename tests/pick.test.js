import { test } from 'node:test'
import assert from 'node:assert/strict'

globalThis.document = { documentElement: { dataset: { lang: 'en' } } }

const { pickReadable, isReadable } = await import('../public/js/core/catalog.js')

const cams = [
  { id: 'dead', k: 'still', h: 0 },
  { id: 'worked', k: 'still', h: 1 },
  { id: 'fresh', k: 'still' },
  { id: 'also', k: 'still' },
  { id: 'vid', k: 'video' },
  { id: 'othervid', k: 'video', h: 0 },
]

test('a still the relay already marked dead is not offered again', () => {
  assert.equal(isReadable(cams[0]), false)
  const picked = pickReadable(cams, 10)
  assert.equal(picked.some((c) => c.id === 'dead'), false)
})

test('a census retry skips cameras that just failed when others remain', () => {
  const picked = pickReadable(cams, 10, { avoid: ['worked', 'fresh'] })
  assert.deepEqual(picked.map((c) => c.id).filter((id) => id !== 'vid' && id !== 'othervid').sort(), ['also'])
})

test('when every readable camera just failed, the retry still has something to ask', () => {
  const picked = pickReadable(
    [{ id: 'a', k: 'still' }, { id: 'b', k: 'still', h: 1 }],
    2,
    { avoid: ['a', 'b'] },
  )
  assert.deepEqual(picked.map((c) => c.id).sort(), ['a', 'b'])
})

test('cameras that answered, and h:1, sort ahead of the untested ones', () => {
  const picked = pickReadable(cams, 6, { prefer: ['also'] })
  const stills = picked.filter((c) => c.k === 'still').map((c) => c.id)
  assert.equal(stills.at(-1), 'fresh')
  assert.deepEqual(stills.slice(0, 2).sort(), ['also', 'worked'])
})

test('a preferred video is kept when only one video slot is open', () => {
  const picked = pickReadable(cams, 3, { video: 1, prefer: ['vid'] })
  assert.equal(picked[0].id, 'vid')
  assert.equal(picked.filter((c) => c.k === 'video').length, 1)
})
