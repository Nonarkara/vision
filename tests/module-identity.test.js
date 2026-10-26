import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

function checkGraph(importLine) {
  const root = mkdtempSync(path.join(tmpdir(), 'vision-module-identity-'))
  try {
    mkdirSync(path.join(root, 'scripts'))
    mkdirSync(path.join(root, 'public/js'), { recursive: true })
    copyFileSync(new URL('../scripts/check-forked-imports.mjs', import.meta.url), path.join(root, 'scripts/check-forked-imports.mjs'))
    writeFileSync(path.join(root, 'package.json'), JSON.stringify({ version: '2.0.0' }))
    writeFileSync(path.join(root, 'public/index.html'), '<script type="module" src="/js/site.js?v={{v}}"></script>')
    writeFileSync(path.join(root, 'public/js/site.js'), '')
    writeFileSync(path.join(root, 'public/js/page.js'), importLine)
    return spawnSync(process.execPath, [path.join(root, 'scripts/check-forked-imports.mjs')], { encoding: 'utf8' })
  } finally { rmSync(root, { recursive: true, force: true }) }
}

test('HTML module stamp and static imports must refer to one module identity', () => {
  assert.equal(checkGraph("import './site.js?v=2.0.0'").status, 0)
  const mismatch = checkGraph("import './site.js?v=1.0.0'")
  assert.equal(mismatch.status, 1)
  assert.match(mismatch.stderr, /site\.js is imported as/)
})

test('dynamic imports also participate in the HTML module graph', () => {
  assert.equal(checkGraph("await import('./site.js?v=2.0.0')").status, 0)
  assert.equal(checkGraph("await import('./site.js?v=1.0.0')").status, 1)
})
