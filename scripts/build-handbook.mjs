// The handbook: the repository's Markdown under docs/ rendered into pages under
// public/handbook/, wrapped in the site's shell, with every link rewritten to
// the route (or the repository) it actually points at. Zero dependencies — the
// Markdown subset these chapters use is small enough to render in one pass.
//
//   node scripts/build-handbook.mjs           write the pages and the figures
//   node scripts/build-handbook.mjs --check   fail if what is on disk is stale

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { slug } from './slug.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DOCS = path.join(ROOT, 'docs')
const PUBLIC = path.join(ROOT, 'public')
const SITE = 'https://vision.nonarkara.org'
const BLOB = 'https://github.com/Nonarkara/vision/blob/main/'
const TREE = 'https://github.com/Nonarkara/vision/tree/main/'

const PAGES = [
  { route: '/handbook', name: 'handbook', src: 'README.md' },
  { route: '/handbook/01', name: 'handbook/01', src: '01-pictures-are-numbers.md', chapter: '01' },
  { route: '/handbook/02', name: 'handbook/02', src: '02-colour-and-thresholds.md', chapter: '02' },
  { route: '/handbook/03', name: 'handbook/03', src: '03-convolution-and-edges.md', chapter: '03' },
  { route: '/handbook/04', name: 'handbook/04', src: '04-motion.md', chapter: '04' },
  { route: '/handbook/05', name: 'handbook/05', src: '05-neural-networks.md', chapter: '05' },
  { route: '/handbook/06', name: 'handbook/06', src: '06-object-detection.md', chapter: '06' },
  { route: '/handbook/07', name: 'handbook/07', src: '07-transfer-learning.md', chapter: '07' },
  { route: '/handbook/08', name: 'handbook/08', src: '08-limits-and-ethics.md', chapter: '08' },
  { route: '/handbook/glossary', name: 'handbook/glossary', src: 'reference/glossary.md' },
  { route: '/handbook/reading', name: 'handbook/reading', src: 'reference/reading-list.md' },
  { route: '/handbook/actions', name: 'handbook/actions', src: 'reference/browser-actions.md' },
]
const CHAPTERS = PAGES.filter((p) => p.chapter)

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const attr = (s) => esc(s).replace(/"/g, '&quot;')
const HOLD = '%#%'

/** Which language a fragment is written in. Handbook pages print both languages; lang= is for readers and screen readers. */
function langAttr(text) {
  const th = (text.match(/[฀-๿]/g) ?? []).length
  const en = (text.match(/[A-Za-z]/g) ?? []).length
  return th > en ? ' lang="th"' : ' lang="en"'
}

/** A path relative to docs/ → where it lives on this site, or null for the repository. */
function routeFor(rel) {
  if (rel === 'README.md') return '/handbook'
  const ch = rel.match(/^(\d\d)-.+\.md$/)
  if (ch) return `/handbook/${ch[1]}`
  if (rel === 'reference/glossary.md') return '/handbook/glossary'
  if (rel === 'reference/reading-list.md') return '/handbook/reading'
  if (rel === 'reference/browser-actions.md') return '/handbook/actions'
  if (rel.startsWith('system/')) return '/system'
  if (rel.startsWith('img/')) return `/img/handbook/${rel.slice(4)}`
  return null
}

/** Any link in the Markdown → where a reader of the site should go. */
function rewrite(href, dir) {
  if (href.startsWith('#')) return href
  if (href.startsWith(SITE)) {
    const rest = href.slice(SITE.length) || '/'
    return rest.startsWith('/') ? rest : `/${rest}`
  }
  if (/^(https?:|mailto:)/.test(href)) return href
  const [target, anchor] = href.split('#')
  const suffix = anchor ? `#${anchor}` : ''
  if (target.startsWith('/')) return target + suffix
  const abs = path.resolve(dir, decodeURI(target))
  if (abs === DOCS || abs.startsWith(DOCS + path.sep)) {
    const route = routeFor(path.relative(DOCS, abs).split(path.sep).join('/'))
    if (route) return route + suffix
  }
  if (abs.startsWith(ROOT + path.sep)) {
    const rel = path.relative(ROOT, abs).split(path.sep).join('/')
    const isDir = fs.existsSync(abs) && fs.statSync(abs).isDirectory()
    return (isDir ? TREE : BLOB) + rel + suffix
  }
  return href
}

function emphasis(s) {
  return s
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
}

/** Inline Markdown: code spans and whitelisted raw tags survive escaping. */
function inline(src, ctx) {
  const stash = []
  const keep = (html) => { stash.push(html); return HOLD + (stash.length - 1) + HOLD }
  let s = String(src)
  s = s.replace(/`([^`]+)`/g, (m, code) => keep(`<code>${esc(code)}</code>`))
  s = s.replace(/<br\s*\/?>/gi, () => keep('<br>'))
  s = s.replace(/<\/?sub>/gi, (m) => keep(m.toLowerCase() === '<sub>' ? '<sub>' : '</sub>'))
  s = esc(s)
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (m, alt, href) =>
    `<img src="${attr(rewrite(href, ctx.dir))}" alt="${attr(alt)}" loading="lazy">`)
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, text, href) =>
    `<a href="${attr(rewrite(href, ctx.dir))}">${emphasis(text)}</a>`)
  s = emphasis(s)
  return s.replace(/%#%(\d+)%#%/g, (m, i) => stash[Number(i)])
}

const isBlockStart = (l) =>
  /^(#{1,6}\s|```|>\s|\||---\s*$|<details|\s*([-*]|\d+\.)\s+\S)/.test(l)

function renderList(items, ctx, start, indent) {
  const tag = items[start].ordered ? 'ol' : 'ul'
  let html = `<${tag}>`
  let i = start
  while (i < items.length && items[i].indent >= indent) {
    if (items[i].indent > indent) break
    const item = items[i++]
    let inner = inline(item.text, ctx)
    if (i < items.length && items[i].indent > indent) {
      const nested = renderList(items, ctx, i, items[i].indent)
      inner += nested.html
      i = nested.i
    }
    html += `<li${langAttr(item.text)}>${inner}</li>`
  }
  return { html: html + `</${tag}>`, i }
}

function renderDetails(block, ctx) {
  const open = block[0]
  const close = /^<\/details>\s*$/.test(block[block.length - 1] ?? '')
  const rest = block.slice(1, block.length - (close ? 1 : 0))
  const m = open.match(/^<details([^>]*)><summary>([\s\S]*?)<\/summary>([\s\S]*)$/)
  const summary = m ? m[2] : open.replace(/<[^>]+>/g, '')
  const tail = m ? [m[3], ...rest] : rest
  const paras = tail
    .join('\n')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p${langAttr(p)}>${inline(p, ctx)}</p>`)
    .join('')
  return `<details><summary${langAttr(summary)}>${inline(summary, ctx)}</summary>${paras}</details>`
}

/** The Markdown subset the handbook uses: headings, quotes, lists, tables, code, details. */
function renderMarkdown(md, ctx) {
  const lines = md.replace(/\r\n/g, '\n').split('\n')
  const out = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) { i++; continue }

    if (line.startsWith('```')) {
      const lang = line.slice(3).trim()
      i++
      const buf = []
      while (i < lines.length && !lines[i].startsWith('```')) buf.push(lines[i++])
      i++
      out.push(`<pre class="code" lang="en"${lang ? ` data-lang="${attr(lang)}"` : ''}><code>${esc(buf.join('\n'))}</code></pre>`)
      continue
    }

    const head = line.match(/^(#{1,6})\s+(.*)$/)
    if (head) {
      const level = head[1].length
      const text = head[2].trim()
      const id = slug(text)
      if (level === 2) ctx.toc.push({ id, text })
      out.push(`<h${level} id="${attr(id)}"${langAttr(text)}>${inline(text, ctx)}</h${level}>`)
      i++
      continue
    }

    if (/^---\s*$/.test(line)) { out.push('<hr>'); i++; continue }

    if (line.startsWith('>')) {
      const buf = []
      while (i < lines.length && lines[i].startsWith('>')) buf.push(lines[i++].replace(/^>\s?/, ''))
      const text = buf.join(' ').trim()
      out.push(`<blockquote${langAttr(text)}>${inline(text, ctx)}</blockquote>`)
      continue
    }

    if (line.startsWith('|')) {
      const rows = []
      while (i < lines.length && lines[i].startsWith('|')) rows.push(lines[i++])
      const cells = (r) => r.replace(/^\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim())
      const headCells = cells(rows[0])
      const body = rows.slice(2).map(cells)
      const th = headCells.map((c) => `<th${langAttr(c)}>${inline(c, ctx)}</th>`).join('')
      const tr = body.map((r) => `<tr>${r.map((c) => `<td${langAttr(c)}>${inline(c, ctx)}</td>`).join('')}</tr>`).join('')
      out.push(`<div class="table-wrap"><table class="table"><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table></div>`)
      continue
    }

    if (/^<details/i.test(line)) {
      const block = []
      while (i < lines.length) {
        block.push(lines[i])
        const done = /^<\/details>\s*$/.test(lines[i]) && block.length > 1
        i++
        if (done) break
      }
      out.push(renderDetails(block, ctx))
      continue
    }

    if (/^(\s*)([-*]|\d+\.)\s+\S/.test(line)) {
      const items = []
      while (i < lines.length) {
        const m = lines[i].match(/^(\s*)([-*]|\d+\.)\s+(\S.*)$/)
        if (!m) {
          if (lines[i].trim() && items.length && !isBlockStart(lines[i])) {
            items[items.length - 1].text += ` ${lines[i].trim()}`
            i++
            continue
          }
          break
        }
        items.push({ indent: m[1].replace(/\t/g, '  ').length, ordered: /\d/.test(m[2]), text: m[3] })
        i++
      }
      out.push(renderList(items, ctx, 0, items[0].indent).html)
      continue
    }

    const buf = [line]
    i++
    while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) buf.push(lines[i++])
    const text = buf.join(' ').trim()
    if (/^!\[[^\]]*\]\([^)]+\)$/.test(text)) {
      let j = i
      while (j < lines.length && !lines[j].trim()) j++
      const cap = (lines[j] ?? '').trim()
      if (/^\*[^*]+\*$/.test(cap)) {
        const caption = cap.slice(1, -1)
        out.push(`<figure>${inline(text, ctx)}<figcaption${langAttr(caption)}>${inline(caption, ctx)}</figcaption></figure>`)
        i = j + 1
      } else {
        out.push(`<figure>${inline(text, ctx)}</figure>`)
      }
      continue
    }
    out.push(`<p${langAttr(text)}>${inline(text, ctx)}</p>`)
  }
  return out.join('\n')
}

const stripMd = (s) => s
  .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
  .replace(/[*`_]/g, '')
  .replace(/<[^>]+>/g, '')
  .trim()

function meta(md) {
  const title = md.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? 'Handbook'
  const quote = md.match(/^>\s+(.+)$/m)?.[1]?.trim() ?? ''
  let desc = stripMd(quote) || stripMd(md.split(/\n{2,}/).find((p) => p.trim() && !p.startsWith('#')) ?? '')
  if (desc.length > 200) desc = desc.slice(0, 197).replace(/\s+\S*$/, '') + '…'
  return { title, desc }
}

const chrome = {
  eyebrowTh: 'คู่มือ · อ่านเองทีละบท',
  eyebrowEn: 'Handbook · read it on your own',
  ledeTh: 'อ่านเองได้ทีละบท ทุกบทมาพร้อมแบบฝึกหัดให้ลองทำเองและคำถามท้ายบท เมื่ออยากรู้ให้ลึกกว่านี้ กลับไปที่ห้องเรียนบนเว็บเพื่อทดลองของจริง',
  ledeEn: 'Read a chapter at a time. Each comes with an exercise you can try on your own and questions to check yourself. When you want to go deeper, go back to the room on this site and run it for real.',
  tocTh: 'ในหน้านี้',
  tocEn: 'On this page',
  indexTh: 'หน้าคู่มือ',
  indexEn: 'Handbook index',
  prevTh: '← บทก่อน',
  prevEn: '← Previous chapter',
  nextTh: 'บทถัดไป →',
  nextEn: 'Next chapter →',
}
const pair = (href, th, en, cls = '') =>
  `<a${cls ? ` class="${cls}"` : ''} href="${href}"><span class="th" lang="th">${th}</span><span class="en" lang="en">${en}</span></a>`

function docNav(spec) {
  const links = []
  const n = spec.chapter ? CHAPTERS.findIndex((c) => c.chapter === spec.chapter) : -1
  if (n > 0) links.push(pair(CHAPTERS[n - 1].route, chrome.prevTh, chrome.prevEn, 'doc-prev'))
  links.push(pair('/handbook', chrome.indexTh, chrome.indexEn, 'doc-index'))
  if (n >= 0 && n < CHAPTERS.length - 1) links.push(pair(CHAPTERS[n + 1].route, chrome.nextTh, chrome.nextEn, 'doc-next'))
  if (spec.route === '/handbook/glossary') links.push(pair('/handbook/reading', 'รายการอ่าน', 'Reading list', 'doc-next'))
  if (spec.route === '/handbook/reading') links.push(pair('/handbook/glossary', 'อภิธานศัพท์', 'Glossary', 'doc-next'))
  if (spec.route === '/handbook/actions') links.push(pair('/handbook/glossary', 'อภิธานศัพท์', 'Glossary', 'doc-next'))
  return `<nav class="doc-nav" data-aria-th="ไปยังหน้าอื่นในคู่มือ" data-aria-en="Other handbook pages">${links.join('')}</nav>`
}

function tocBlock(toc) {
  if (toc.length < 2) return ''
  const items = toc
    .map((t) => `<li><a href="#${attr(t.id)}"${langAttr(t.text)}>${inline(t.text, { dir: DOCS })}</a></li>`)
    .join('')
  return `<details class="doc-toc"><summary><span class="th" lang="th">${chrome.tocTh}</span><span class="en" lang="en">${chrome.tocEn}</span></summary><ol>${items}</ol></details>`
}

function pageHtml(spec, body, { title, desc }, toc) {
  return `<!doctype html>
<html lang="th" data-lang="th">
<head>
<!--#head-->
<link rel="stylesheet" href="/css/pages/handbook.css?v={{v}}">
<title>${attr(title)} — Handbook · คู่มือ Vision</title>
<meta name="description" content="${attr(desc)}">
</head>
<body class="handbook">
<!--#nav-->
<main id="main">
  <header class="page-head">
    <div>
      <span class="eyebrow label"><span class="th" lang="th">${chrome.eyebrowTh}</span><span class="en" lang="en">${chrome.eyebrowEn}</span></span>
      <h1>${esc(title)}</h1>
    </div>
    <div class="page-head-side">
      <p class="lede th" lang="th">${chrome.ledeTh}</p>
      <p class="lede en" lang="en">${chrome.ledeEn}</p>
      ${tocBlock(toc)}
    </div>
  </header>
  <article class="doc">
${body}
  </article>
  ${docNav(spec)}
</main>
<!--#foot-->
</body>
</html>
`
}

function build() {
  const outputs = new Map()
  for (const spec of PAGES) {
    const srcPath = path.join(DOCS, spec.src)
    const md = fs.readFileSync(srcPath, 'utf8')
    const { title, desc } = meta(md)
    const ctx = { dir: path.dirname(srcPath), toc: [] }
    const body = renderMarkdown(md.replace(/^#\s+.+\n/, ''), ctx)
    const file = `${spec.name}.html`
    outputs.set(path.join(PUBLIC, file), pageHtml(spec, body, { title, desc }, ctx.toc))
  }
  const figDir = path.join(DOCS, 'img')
  const figOut = path.join(PUBLIC, 'img', 'handbook')
  for (const f of fs.readdirSync(figDir)) {
    outputs.set(path.join(figOut, f), fs.readFileSync(path.join(figDir, f)))
  }
  return outputs
}

const outputs = build()
const check = process.argv.includes('--check')
const stale = []
let written = 0
for (const [file, content] of outputs) {
  const rel = path.relative(ROOT, file)
  const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content)
  if (check) {
    const onDisk = fs.existsSync(file) ? fs.readFileSync(file) : null
    if (!onDisk || !onDisk.equals(buffer)) stale.push(rel)
  } else {
    fs.mkdirSync(path.dirname(file), { recursive: true })
    if (!fs.existsSync(file) || !fs.readFileSync(file).equals(buffer)) {
      fs.writeFileSync(file, buffer)
      written++
    }
  }
}
if (check && stale.length) {
  console.error(`✗ handbook pages out of date — run "npm run build:handbook":\n  ${stale.join('\n  ')}`)
  process.exit(1)
}
console.log(check ? '✓ handbook pages match docs/' : `✓ handbook: ${PAGES.length} pages built, ${written} file(s) updated`)
