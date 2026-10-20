import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { CSP, PAGES } from '../server/http.js'
import {
  ANGLES, PHRASES, LOOPS,
  matrixFromEuler, poseFromMatrix, applyRotation, applyTranspose,
  markCoverage, missingAngles, crownVisible, faceWidth,
  canonicalLandmarks, scalpCap, createCloud, observeHead,
  projectPoint, loopEdges, phrase, copyLang,
} from '../public/js/pages/reconstruct.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const html = fs.readFileSync(path.join(root, 'public/reconstruct.html'), 'utf8')
const js = fs.readFileSync(path.join(root, 'public/js/pages/reconstruct.js'), 'utf8')
const css = fs.readFileSync(path.join(root, 'public/css/pages/reconstruct.css'), 'utf8')

function faceAt(matrix) {
  const landmarks = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5, z: 0 }))
  const place = (index, offset) => {
    const p = applyRotation(matrix, offset)
    landmarks[index] = { x: 0.5 + p[0], y: 0.5 + p[1], z: p[2] }
  }
  place(1, [0, 0, 0])
  place(10, [0, -0.15, 0.02])
  place(152, [0, 0.18, 0])
  place(234, [-0.16, 0, 0])
  place(454, [0.16, 0, 0])
  place(33, [-0.08, -0.04, -0.02])
  return landmarks
}

test('pose readings match pure yaw, pitch and roll', () => {
  for (const [yaw, pitch, roll] of [[0, 0, 0], [0.4, 0, 0], [0, 0.3, 0], [0, 0, -0.5], [-0.2, 0, 0]]) {
    const pose = poseFromMatrix(matrixFromEuler(yaw, pitch, roll))
    assert.ok(Math.abs(pose.yaw - yaw) < 1e-9, `yaw ${yaw}`)
    assert.ok(Math.abs(pose.pitch - pitch) < 1e-9, `pitch ${pitch}`)
    assert.ok(Math.abs(pose.roll - roll) < 1e-9, `roll ${roll}`)
  }
  assert.equal(poseFromMatrix(null), null)
  assert.equal(poseFromMatrix([1, 2, 3]), null)
})

test('canonical landmarks undo the camera rotation', () => {
  const matrix = matrixFromEuler(0.4, -0.25, 0.3)
  const offset = [0.1, -0.2, 0.05]
  const moved = applyRotation(matrix, offset)
  const landmarks = Array.from({ length: 8 }, () => ({ x: 1, y: 2, z: 3 }))
  landmarks[4] = { x: 1 + moved[0], y: 2 + moved[1], z: 3 + moved[2] }
  const back = canonicalLandmarks(landmarks, matrix)[4]
  assert.ok(Math.abs(back[0] - offset[0]) < 1e-9)
  assert.ok(Math.abs(back[1] - offset[1]) < 1e-9)
  assert.ok(Math.abs(back[2] - offset[2]) < 1e-9)
  assert.deepEqual(applyTranspose(matrix, applyRotation(matrix, offset)).map((n) => Math.round(n * 1e9) / 1e9), offset.map((n) => Math.round(n * 1e9) / 1e9))
})

test('coverage records an angle without forgetting the others, and does not mutate', () => {
  const seen = { front: true }
  const next = markCoverage(seen, { yaw: -0.5, pitch: 0, roll: 0 })
  assert.equal(seen.left, undefined)
  assert.equal(next.front, true)
  assert.equal(next.left, true)
  assert.deepEqual(missingAngles(next), ['right', 'up', 'down', 'tilt'])
  assert.equal(missingAngles({}).length, ANGLES.length)
})

test('the scalp cap is geometry past the forehead, and only the crown pose asks for it', () => {
  assert.equal(crownVisible(null), false)
  assert.equal(crownVisible({ yaw: 0, pitch: 0.2, roll: 0 }), false)
  assert.equal(crownVisible({ yaw: 0, pitch: 0.3, roll: 0 }), true)
  assert.equal(crownVisible({ yaw: 0, pitch: 0, roll: -0.4 }), true)
  const forehead = [0, -0.2, 0]
  const chin = [0, 0.2, 0]
  const left = [-0.15, 0, 0]
  const right = [0.15, 0, 0]
  const up = [0, -1, 0]
  const pts = scalpCap(forehead, chin, left, right)
  assert.ok(pts.length > 8)
  for (const p of pts) {
    const along = (p[1] - forehead[1]) * up[1]
    assert.ok(along > 0.01, 'cap sits past the forehead, toward the crown')
  }
  assert.equal(scalpCap(null, chin, left, right).length, 0)
})

test('a turned head accumulates face points, and the scalp waits for the crown', () => {
  const yaw = matrixFromEuler(-0.5, 0, 0)
  const cloud = createCloud()
  const first = observeHead({ landmarks: faceAt(yaw), matrix: yaw, seen: {}, cloud })
  assert.equal(first.rejected, false)
  assert.equal(first.seen.left, true)
  assert.equal(first.seen.down, undefined)
  assert.ok(cloud.count('face') > 0)
  assert.equal(cloud.count('scalp'), 0)
  const again = observeHead({ landmarks: faceAt(yaw), matrix: yaw, seen: first.seen, cloud })
  assert.equal(again.added, 0, 'the same view does not invent new points')

  const down = matrixFromEuler(0, 0.45, 0)
  const crown = createCloud()
  const posed = observeHead({ landmarks: faceAt(down), matrix: down, seen: {}, cloud: crown })
  assert.equal(posed.seen.down, true)
  assert.ok(crown.count('scalp') > 0)
  assert.ok(crown.count('face') > 0)
  assert.equal(faceWidth(faceAt(down)) > 0.08, true)
})

test('the cloud dedupes, separates kinds, and stops at its cap', () => {
  const cloud = createCloud({ voxel: 1, max: 2 })
  assert.equal(cloud.add([[0, 0, 0], [0, 0, 0], [5, 0, 0], [9, 0, 0], [NaN, 1, 1]], 'face'), 2)
  assert.equal(cloud.size, 2)
  assert.equal(cloud.add([[0, 0, 0]], 'scalp'), 0)
  cloud.clear()
  assert.equal(cloud.size, 0)
})

test('a nearer point projects larger than a farther one', () => {
  const view = { yaw: 0, pitch: 0, dist: 2 }
  const layout = { cx: 100, cy: 100, scale: 80 }
  const near = projectPoint({ x: 0, y: 0, z: 0 }, view, layout)
  const far = projectPoint({ x: 0, y: 0, z: 2 }, view, layout)
  assert.ok(near.f > far.f)
  assert.equal(loopEdges(LOOPS).length, Object.values(LOOPS).reduce((n, loop) => n + loop.length, 0))
})

test('every dynamic phrase exists in Thai, English and Chinese', () => {
  for (const [key, row] of Object.entries(PHRASES)) {
    for (const lang of ['th', 'en', 'zh']) {
      const value = phrase(row, lang)
      assert.ok(value, `${key} ${lang}`)
      if (typeof value === 'function') assert.ok(value(1, 2, 3).length > 0, `${key} ${lang}`)
    }
  }
  assert.equal(phrase(PHRASES.idle, 'th'), PHRASES.idle.th)
  assert.equal(phrase(PHRASES.idle, 'xx'), PHRASES.idle.th)
  assert.equal(copyLang('zh'), 'zh')
  assert.equal(copyLang('en'), 'en')
  assert.equal(copyLang('th'), 'th')
  assert.equal(copyLang('xx'), 'th')
})

test('the room page carries Thai, English and Chinese, and only the official reel embed', () => {
  const prose = html.replace(/<svg[\s\S]*?<\/svg>/g, '')
  const span = (c) => (prose.match(new RegExp(`class="[^"]*\\b${c}\\b[^"]*"`, 'g')) ?? []).length
  assert.equal(span('th'), span('en'), `Thai ${span('th')} vs English ${span('en')}`)
  assert.equal(span('zh'), span('en'), `Chinese ${span('zh')} vs English ${span('en')}`)
  assert.ok(span('th') > 20)
  const ariaTh = (html.match(/\bdata-aria-th=/g) ?? []).length
  const ariaEn = (html.match(/\bdata-aria-en=/g) ?? []).length
  assert.equal(ariaTh, ariaEn)
  assert.match(html, /https:\/\/www\.instagram\.com\/reel\/Deav1B_ANwB\/embed\//)
  assert.doesNotMatch(html, /embed\.js/)
  assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)/i)
  assert.doesNotMatch(html, /\sstyle\s*=/i)
  assert.match(html, /69,316/)
  assert.match(html, />96</)
  assert.match(html, /index\.opensource/)
  assert.match(html, /hyun2xyz/)
  assert.match(html, /Johannes L\. Schönberger/)
  assert.match(html, /https:\/\/colmap\.github\.io\//)
  assert.match(html, /https:\/\/github\.com\/colmap\/colmap/)
  assert.match(html, /Structure-from-Motion Revisited/)
  assert.match(html, /Pixelwise View Selection for Unstructured Multi-View Stereo/)
  assert.match(html, /ProtoplasmaKid/)
  assert.match(html, /Sobrevuelo_Castillo_de_Chapultepec\.webm/)
  assert.match(html, /CC0/)
  assert.match(html, /face landmarks cover the face/i)
  assert.doesNotMatch(html, /localStorage|indexedDB/)
  assert.doesNotMatch(html, /data-copy|copy-switch/)
  assert.match(html, /class="en" lang="en" x="52" y="192"[^>]*>cameras<\/text>\s*<text class="zh"/)
})

test('the demo script does not store or upload, and stays inside the plate', () => {
  assert.doesNotMatch(js, /localStorage|sessionStorage|indexedDB|sendBeacon/)
  assert.doesNotMatch(js, /fetch\s*\(/)
  assert.match(js, /\/js\/focus\/worker\.js/)
  const allowed = new Set(['#eb5324', '#b6bfc1', '#ebd3a2', '#101010'])
  for (const hex of js.match(/#[0-9a-fA-F]{3,8}/g) ?? []) assert.ok(allowed.has(hex.toLowerCase()), hex)
  assert.doesNotMatch(css, /#[0-9a-fA-F]{3,8}/)
  const rules = css.replace(/\/\*[\s\S]*?\*\//g, '')
  assert.doesNotMatch(rules, /gradient|box-shadow|border-radius/i)
  assert.doesNotMatch(rules, /\.recon \.zh\s*\{[^}]*display:\s*none/)
  assert.doesNotMatch(rules, /data-copy/)
})

test('the route exists and the frame policy is only the Instagram reel', () => {
  assert.equal(PAGES['/reconstruct'], 'reconstruct')
  assert.match(CSP, /frame-src https:\/\/www\.instagram\.com https:\/\/instagram\.com/)
  assert.match(CSP, /script-src 'self'(;|$)/)
  assert.doesNotMatch(CSP, /script-src[^;]*instagram/)
  assert.match(CSP, /frame-ancestors 'none'/)
  const xml = fs.readFileSync(path.join(root, 'public/sitemap.xml'), 'utf8')
  assert.match(xml, /vision\.nonarkara\.org\/reconstruct</)
  const nav = fs.readFileSync(path.join(root, 'public/partials/nav.html'), 'utf8')
  assert.match(nav, /href="\/reconstruct"/)
})
