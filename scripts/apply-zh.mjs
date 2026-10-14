// Insert a Simplified Chinese sibling after every English element that does
// not already have one, and a data-aria-zh next to every data-aria-en.
// Chinese comes from public/js/core/zh-dict.js, keyed by the English markup.
// A miss keeps the English text so the three span counts still match, and is
// logged. Idempotent: an existing zh sibling is left alone.
//
// Handbook chapter bodies are not span pairs; scripts/build-handbook.mjs owns
// their chrome. This script skips public/handbook and public/vendor.
//
//   node scripts/apply-zh.mjs

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ZH } from '../public/js/core/zh-dict.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PUBLIC = path.join(ROOT, 'public')
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr'])
const RAW = new Set(['script', 'style'])
const misses = []

function tokens(attrs) {
  const m = attrs.match(/\bclass="([^"]*)"/)
  return m ? m[1].trim().split(/\s+/) : []
}
function has(attrs, name) { return tokens(attrs).includes(name) }

function toZh(attrs) {
  let a = attrs
  if (/\bclass="/.test(a)) {
    a = a.replace(/\bclass="([^"]*)"/, (_, c) => `class="${c.trim().split(/\s+/).map((t) => (t === 'en' ? 'zh' : t)).join(' ')}"`)
  } else a += ' class="zh"'
  if (/\blang="/.test(a)) a = a.replace(/\blang="[^"]*"/, 'lang="zh-Hans"')
  else a += ' lang="zh-Hans"'
  return a
}

function translate(inner) {
  if (Object.prototype.hasOwnProperty.call(ZH, inner)) return { html: ZH[inner], hit: true }
  const trimmed = inner.trim()
  if (trimmed !== inner && trimmed && Object.prototype.hasOwnProperty.call(ZH, trimmed)) {
    return { html: inner.replace(trimmed, ZH[trimmed]), hit: true }
  }
  let hit = false
  const html = inner.replace(/(^|>)([^<]+)(?=<|$)/g, (all, pre, text) => {
    if (Object.prototype.hasOwnProperty.call(ZH, text)) { hit = true; return pre + ZH[text] }
    const t = text.trim()
    if (t && t !== text && Object.prototype.hasOwnProperty.call(ZH, t)) {
      hit = true
      return pre + text.replace(t, ZH[t])
    }
    return all
  })
  return { html, hit }
}

function nextIsZh(html, j) {
  const m = html.slice(j).match(/^\s*<([a-zA-Z][\w:-]*)([^>]*?)>/)
  return !!(m && has(m[2], 'zh'))
}

function process(html, file) {
  let i = 0
  let out = ''
  while (i < html.length) {
    const lt = html.indexOf('<', i)
    if (lt === -1) { out += html.slice(i); break }
    out += html.slice(i, lt)
    if (html.startsWith('<!--', lt)) {
      const end = html.indexOf('-->', lt)
      const to = end === -1 ? html.length : end + 3
      out += html.slice(lt, to)
      i = to
      continue
    }
    const m = html.slice(lt).match(/^<([a-zA-Z][\w:-]*)([^>]*)>/)
    if (!m) { out += html[lt]; i = lt + 1; continue }
    const name = m[1]
    const attrs = m[2]
    const full = m[0]
    const lower = name.toLowerCase()
    const self = /\/\s*$/.test(attrs) || VOID.has(lower)
    if (self) { out += full; i = lt + full.length; continue }
    const startInner = lt + full.length
    if (RAW.has(lower)) {
      const closeAt = html.toLowerCase().indexOf(`</${lower}`, startInner)
      const end = closeAt === -1 ? html.length : html.indexOf('>', closeAt) + 1
      out += html.slice(lt, end)
      i = end
      continue
    }
    let depth = 1
    let j = startInner
    let closeFrom = -1
    while (j < html.length && depth > 0) {
      const next = html.indexOf('<', j)
      if (next === -1) break
      if (html.startsWith('<!--', next)) {
        const e = html.indexOf('-->', next)
        j = e === -1 ? html.length : e + 3
        continue
      }
      const tm = html.slice(next).match(/^<\/?([a-zA-Z][\w:-]*)([^>]*)>/)
      if (!tm) { j = next + 1; continue }
      const n = tm[1].toLowerCase()
      const isClose = tm[0].startsWith('</')
      const isSelf = /\/\s*$/.test(tm[2]) || VOID.has(n)
      if (n === lower) {
        if (isClose) depth--
        else if (!isSelf) depth++
      }
      if (depth === 0) closeFrom = next
      j = next + tm[0].length
    }
    if (depth !== 0 || closeFrom < 0) { out += html.slice(lt); break }
    const original = html.slice(startInner, closeFrom)
    const inner = process(original, file)
    out += `<${name}${attrs}>${inner}</${name}>`
    if (has(attrs, 'en') && !nextIsZh(html, j)) {
      const { html: zh, hit } = translate(original)
      if (!hit) misses.push(`${file}: ${original.replace(/\s+/g, ' ').slice(0, 140)}`)
      out += `<${name}${toZh(attrs)}>${zh}</${name}>`
    }
    i = j
  }
  return out
}

function addAria(html, file) {
  return html.replace(/<[^>]+>/g, (tag) => {
    if (!tag.includes('data-aria-en=') || tag.includes('data-aria-zh=')) return tag
    const m = tag.match(/data-aria-en="([^"]*)"/)
    if (!m) return tag
    const zh = Object.prototype.hasOwnProperty.call(ZH, m[1]) ? ZH[m[1]] : m[1]
    if (!Object.prototype.hasOwnProperty.call(ZH, m[1])) misses.push(`${file} aria: ${m[1]}`)
    const safe = zh.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
    return tag.replace(/data-aria-en="[^"]*"/, (a) => `${a} data-aria-zh="${safe}"`)
  })
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) {
      if (e.name === 'vendor' || e.name === 'handbook' || e.name === 'node_modules') return []
      return walk(p)
    }
    return e.name.endsWith('.html') ? [p] : []
  })
}

let files = 0
for (const file of walk(PUBLIC)) {
  const before = fs.readFileSync(file, 'utf8')
  const after = addAria(process(before, path.relative(ROOT, file)), path.relative(ROOT, file))
  if (after !== before) { fs.writeFileSync(file, after); files++ }
}
const log = '/tmp/apply-zh-misses.txt'
fs.writeFileSync(log, misses.length ? misses.join('\n') + '\n' : '')
console.log(`updated ${files} html files, ${misses.length} misses → ${log}`)
if (misses.length) console.log(misses.slice(0, 30).join('\n'))
