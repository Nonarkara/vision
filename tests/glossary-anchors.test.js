// Every "/handbook/glossary#term" link on the site must land on a real row.
// A glossary term that quietly renames itself is a dead end for exactly the
// reader the link exists for — someone meeting the word in a room and
// following it to a definition.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const htmlFiles = fs.readdirSync(path.join(root, 'public')).filter((f) => f.endsWith('.html'))

const glossary = fs.readFileSync(path.join(root, 'public/handbook/glossary.html'), 'utf8')
const ids = new Set([...glossary.matchAll(/<tr id="([^"]+)"/g)].map((m) => m[1]))

test('the glossary gives every term an addressable id', () => {
  assert.ok(ids.size > 80, `only ${ids.size} glossary rows have ids — the slugifier may have broken`)
  // The apostrophe must not leak into a slug: "Otsu's method" -> "otsus-method".
  assert.ok(ids.has('otsus-method'), 'Otsu slug should drop the apostrophe')
  assert.ok(!ids.has('otsu-s-method'), 'Otsu slug should not keep a stray -s-')
})

test('every glossary fragment link on the site lands on a real term', () => {
  const links = []
  for (const file of [...htmlFiles, ...fs.readdirSync(path.join(root, 'public/handbook')).map((f) => `handbook/${f}`).filter((f) => f.endsWith('.html'))]) {
    const html = fs.readFileSync(path.join(root, 'public', file), 'utf8')
    for (const m of html.matchAll(/href="\/handbook\/glossary#([a-z0-9-]+)"/g)) links.push({ file, term: m[1] })
  }
  assert.ok(links.length > 0, 'expected at least one glossary term link in the site')
  for (const { file, term } of links) {
    assert.ok(ids.has(term), `${file} links to /handbook/glossary#${term}, which is not a glossary row`)
  }
})