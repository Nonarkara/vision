// Publish the checked workspace to the launchd runtime on this Mac.
// Tunnel credentials stay in ~/.cloudflared; photo originals are excluded.
//
// Two properties this script used to lack, both found by audit:
//   1. Orphan pruning — assets the repo no longer ships must stop being
//      served (models are edge-cached immutable for a year, so a stale
//      shard would otherwise outlive its manifest forever).
//   2. Rollback — the previous runtime is kept exactly one generation
//      back, and a build that will not come up healthy is restored and
//      restarted, so a bad release fails closed instead of taking the
//      site down with no revert path.
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const runtime = path.join(os.homedir(), 'Library', 'Application Support', 'Vision')
const previous = path.join(os.homedir(), 'Library', 'Application Support', 'Vision-prev')
const label = 'org.nonarkara.vision'
const domain = `gui/${process.getuid()}`
const shipped = ['server', 'public']
const excluded = (file) => ['.DS_Store', 'CCTV photos'].includes(path.basename(file))

execFileSync('npm', ['run', 'check'], { cwd: root, stdio: 'inherit' })

/** Keep exactly one generation of the shipped code for rollback. */
function backupPrevious() {
  fs.rmSync(previous, { recursive: true, force: true })
  if (!fs.existsSync(path.join(runtime, 'server'))) return false
  fs.mkdirSync(previous, { recursive: true })
  for (const dir of shipped) fs.cpSync(path.join(runtime, dir), path.join(previous, dir), { recursive: true })
  const pkg = path.join(runtime, 'package.json')
  if (fs.existsSync(pkg)) fs.copyFileSync(pkg, path.join(previous, 'package.json'))
  return true
}

/** Delete anything inside runtime/`dir` that the repo no longer has. */
function prune(srcDir, dstDir) {
  if (!fs.existsSync(dstDir)) return
  for (const entry of fs.readdirSync(dstDir, { withFileTypes: true })) {
    const dst = path.join(dstDir, entry.name)
    if (!fs.existsSync(path.join(srcDir, entry.name))) fs.rmSync(dst, { recursive: true, force: true })
    else if (entry.isDirectory()) prune(path.join(srcDir, entry.name), dst)
  }
}

function restorePrevious() {
  if (!fs.existsSync(path.join(previous, 'server'))) return false
  for (const dir of shipped) fs.cpSync(path.join(previous, dir), path.join(runtime, dir), { recursive: true })
  const pkg = path.join(previous, 'package.json')
  if (fs.existsSync(pkg)) fs.copyFileSync(pkg, path.join(runtime, 'package.json'))
  return true
}

const hadPrevious = backupPrevious()
fs.mkdirSync(path.join(runtime, 'logs'), { recursive: true })
for (const dir of shipped) {
  const src = path.join(root, dir)
  fs.cpSync(src, path.join(runtime, dir), { recursive: true, filter: (file) => !excluded(file) })
  prune(src, path.join(runtime, dir))
}
fs.copyFileSync(path.join(root, 'package.json'), path.join(runtime, 'package.json'))
// Preserve production's fresher catalogue if it has one. The workspace copy
// is gitignored, so a fresh clone simply has none to give.
fs.mkdirSync(path.join(runtime, 'data'), { recursive: true })
const seedCatalogue = path.join(root, 'data', 'cameras.json')
if (!fs.existsSync(path.join(runtime, 'data', 'cameras.json')) && fs.existsSync(seedCatalogue)) {
  fs.copyFileSync(seedCatalogue, path.join(runtime, 'data', 'cameras.json'))
}
const plist = path.join(os.homedir(), 'Library', 'LaunchAgents', `${label}.plist`)
fs.copyFileSync(path.join(root, 'ops', `${label}.plist`), plist)
let installed = false
try { execFileSync('launchctl', ['print', `${domain}/${label}`], { stdio: 'ignore' }); installed = true } catch { /* first deployment */ }
const restart = () => execFileSync('launchctl', installed ? ['kickstart', '-k', `${domain}/${label}`] : ['bootstrap', domain, plist], { stdio: 'inherit' })

/** Wait for /api/health; `expected` null accepts any healthy version. */
async function waitHealthy(expected) {
  for (let attempt = 0; attempt < 120; attempt++) {
    try {
      const health = await (await fetch('http://127.0.0.1:8430/api/health', { signal: AbortSignal.timeout(1000) })).json()
      if (health.ok && (expected === null || health.version === expected)) return health
    } catch { /* allow the restarted process to bind */ }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  return null
}

restart()
const expected = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version
const health = await waitHealthy(expected)
if (health) {
  console.log(`Published ${health.version}: https://vision.nonarkara.org`)
  process.exit(0)
}
if (hadPrevious && restorePrevious()) {
  restart()
  const back = await waitHealthy(null)
  console.error(`Release ${expected} did not become healthy — restored the previous runtime${back ? ` (${back.version})` : ''}.`)
  process.exit(1)
}
throw new Error(`The production service did not become healthy${hadPrevious ? '' : ' (no previous runtime to restore)'}`)
