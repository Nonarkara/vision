// Publish the checked workspace to the launchd runtime on this Mac.
// Tunnel credentials stay in ~/.cloudflared; photo originals are excluded.
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const runtime = path.join(os.homedir(), 'Library', 'Application Support', 'Vision')
const label = 'org.nonarkara.vision'
const domain = `gui/${process.getuid()}`
execFileSync('npm', ['run', 'check'], { cwd: root, stdio: 'inherit' })
fs.mkdirSync(path.join(runtime, 'logs'), { recursive: true })
for (const dir of ['server', 'public']) {
  fs.cpSync(path.join(root, dir), path.join(runtime, dir), {
    recursive: true,
    filter: (file) => !['.DS_Store', 'CCTV photos'].includes(path.basename(file)),
  })
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
execFileSync('launchctl', installed ? ['kickstart', '-k', `${domain}/${label}`] : ['bootstrap', domain, plist], { stdio: 'inherit' })
for (let attempt = 0; attempt < 120; attempt++) {
  try {
    const health = await (await fetch('http://127.0.0.1:8430/api/health', { signal: AbortSignal.timeout(1000) })).json()
    const expected = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version
    if (health.version === expected && health.ok) {
      console.log(`Published ${health.version}: https://vision.nonarkara.org`)
      process.exit(0)
    }
  } catch { /* allow the restarted process to bind */ }
  await new Promise((resolve) => setTimeout(resolve, 500))
}
throw new Error('The production service did not become healthy')
