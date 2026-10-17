// /reconstruct — Structure-from-Motion, explained, then a head-shaped cloud
// built on this device from MediaPipe face landmarks.
//
// The landmark worker is the focus room's worker. WASM compilation stays on
// that one URL. Nothing in this file uploads, writes storage, or keeps a picture.

import { onLang } from '../core/i18n.js'

const SIGNAL = '#f15a30'
const GRAY = '#b6bfc1'
const NAPLES = '#fbe6a0'
const BLACK = '#101010'

/** Face-mesh loops. The oval matches the focus room; the rest are the same mesh. */
export const LOOPS = {
  oval: [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109],
  lip: [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185],
  eyeL: [33, 160, 158, 133, 153, 144],
  eyeR: [263, 387, 385, 362, 380, 373],
  browL: [70, 63, 105, 66, 107],
  browR: [300, 293, 334, 296, 336],
}

export const PHRASES = {
  idle: {
    th: 'กล้องปิด · อ่านคำยินยอมก่อนเริ่ม',
    en: 'Camera off · Read the consent before starting',
    zh: '相机已关闭 · 请先阅读并同意',
  },
  loading: {
    th: 'กำลังเตรียมโมเดลและกล้อง… กดหยุดเพื่อยกเลิกได้',
    en: 'Preparing the model and camera… Stop cancels this.',
    zh: '正在准备模型和相机… 按停止可取消',
  },
  running: {
    th: 'กล้องเปิด · จุดสะสมอยู่ในแท็บนี้เท่านั้น',
    en: 'Camera on · Points accumulate in this tab only',
    zh: '相机已打开 · 点只累积在这个标签页里',
  },
  stopped: {
    th: 'หยุดแล้ว · กล้องปิด จุดยังอยู่ในหน่วยความจำจนคุณล้างหรือปิดหน้า',
    en: 'Stopped · Camera off. Points stay in memory until you clear them or leave.',
    zh: '已停止 · 相机关闭。点留在内存里，直到你清除或离开页面',
  },
  noFace: {
    th: 'ยังไม่เห็นใบหน้าเดียว · หันเข้าหากล้องในที่สว่าง',
    en: 'No single face yet · Face the camera in good light',
    zh: '还没有看到一张脸 · 请在明亮处正对相机',
  },
  twoFaces: {
    th: 'เห็นมากกว่าหนึ่งใบหน้า · ให้เหลือใบหน้าเดียวในภาพ',
    en: 'More than one face · Keep a single face in frame',
    zh: '看到不止一张脸 · 请只留一张脸在画面里',
  },
  small: {
    th: 'ใบหน้าเล็กไป · ขยับเข้าใกล้กล้อง',
    en: 'Face is too small · Move closer to the camera',
    zh: '脸太小 · 请靠近相机',
  },
  cameraFail: {
    th: 'เปิดกล้องหรือโมเดลไม่ได้',
    en: 'Camera or model could not start',
    zh: '相机或模型无法启动',
  },
  modelFail: {
    th: 'โมเดลใบหน้ายังไม่พร้อม ลองอีกครั้ง',
    en: 'The face model did not become ready. Try again.',
    zh: '人脸模型没有准备好。请再试一次。',
  },
  hidden: {
    th: 'ซ่อนแท็บแล้ว · กล้องปิด กดเริ่มต่อเมื่อพร้อม',
    en: 'Tab hidden · Camera off. Start again when you are ready.',
    zh: '标签页已隐藏 · 相机关闭。准备好后再开始',
  },
  counts: {
    th: (face, scalp, frames) => `จุดใบหน้า ${face} · จุดกะโหลกที่ประมาณ ${scalp} · เฟรม ${frames}`,
    en: (face, scalp, frames) => `Face points ${face} · Approximated scalp ${scalp} · Frames ${frames}`,
    zh: (face, scalp, frames) => `脸部点 ${face} · 近似头顶 ${scalp} · 帧 ${frames}`,
  },
  pose: {
    th: (y, p, r) => `หันซ้ายขวา ${y}° · ก้มเงย ${p}° · เอียง ${r}°`,
    en: (y, p, r) => `Yaw ${y}° · Pitch ${p}° · Roll ${r}°`,
    zh: (y, p, r) => `左右 ${y}° · 上下 ${p}° · 倾斜 ${r}°`,
  },
  noPose: {
    th: 'ยังไม่มีมุมศีรษะ',
    en: 'No head angle yet',
    zh: '还没有头部角度',
  },
}

export function phrase(row, lang) {
  if (lang === 'zh') return row.zh
  if (lang === 'en') return row.en
  return row.th
}

/** The rail owns the language. Chinese is html[data-lang=zh], not a second switch on this room. */
export function copyLang(current) {
  const l = current ?? (typeof document !== 'undefined' ? document.documentElement.dataset.lang : 'th')
  return l === 'en' || l === 'zh' ? l : 'th'
}

/** Column-major 4×4. R = Rz(roll) Rx(pitch) Ry(yaw), the same reading the focus room uses. */
export function matrixFromEuler(yaw, pitch, roll) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw)
  const cp = Math.cos(pitch), sp = Math.sin(pitch)
  const cr = Math.cos(roll), sr = Math.sin(roll)
  const r00 = cr * cy - sr * sp * sy
  const r01 = -sr * cp
  const r02 = cr * sy + sr * sp * cy
  const r10 = sr * cy + cr * sp * sy
  const r11 = cr * cp
  const r12 = sr * sy - cr * sp * cy
  const r20 = -cp * sy
  const r21 = sp
  const r22 = cp * cy
  return [r00, r10, r20, 0, r01, r11, r21, 0, r02, r12, r22, 0, 0, 0, 0, 1]
}

export function applyRotation(m, v) {
  return [
    m[0] * v[0] + m[4] * v[1] + m[8] * v[2],
    m[1] * v[0] + m[5] * v[1] + m[9] * v[2],
    m[2] * v[0] + m[6] * v[1] + m[10] * v[2],
  ]
}

export function applyTranspose(m, v) {
  return [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[4] * v[0] + m[5] * v[1] + m[6] * v[2],
    m[8] * v[0] + m[9] * v[1] + m[10] * v[2],
  ]
}

/** Yaw, pitch, roll in radians. Same yaw and pitch as the focus room's matrix reading. */
export function poseFromMatrix(m) {
  if (!m || m.length < 16) return null
  const yaw = Math.atan2(m[8], m[10])
  const pitch = Math.atan2(-m[9], Math.hypot(m[8], m[10]))
  const roll = Math.atan2(m[1], m[5])
  if (![yaw, pitch, roll].every(Number.isFinite)) return null
  return { yaw, pitch, roll }
}

/** Angles the visitor is asked to show. Thresholds are radians of head pose. */
export const ANGLES = [
  { id: 'left', test: (p) => p.yaw < -0.35 },
  { id: 'right', test: (p) => p.yaw > 0.35 },
  { id: 'up', test: (p) => p.pitch < -0.28 },
  { id: 'down', test: (p) => p.pitch > 0.28 },
  { id: 'tilt', test: (p) => Math.abs(p.roll) > 0.35 },
  { id: 'front', test: (p) => Math.abs(p.yaw) < 0.18 && Math.abs(p.pitch) < 0.18 && Math.abs(p.roll) < 0.18 },
]

export function markCoverage(seen, pose) {
  const next = { ...seen }
  if (!pose) return next
  for (const angle of ANGLES) if (angle.test(pose)) next[angle.id] = true
  return next
}

export function missingAngles(seen) {
  return ANGLES.filter((angle) => !seen?.[angle.id]).map((angle) => angle.id)
}

/** The crown is in view when the head looks down or rolls far enough to present the scalp. */
export function crownVisible(pose) {
  if (!pose) return false
  return pose.pitch > 0.28 || Math.abs(pose.roll) > 0.35
}

export function faceWidth(landmarks) {
  let min = Infinity, max = -Infinity
  for (const lm of landmarks ?? []) {
    if (!lm || typeof lm.x !== 'number') continue
    if (lm.x < min) min = lm.x
    if (lm.x > max) max = lm.x
  }
  return Number.isFinite(min) ? max - min : 0
}

/** Landmarks moved into a head frame: undo the pose, keep offsets from the nose. */
export function canonicalLandmarks(landmarks, matrix) {
  const nose = landmarks?.[1]
  if (!nose || typeof nose.x !== 'number' || !matrix) return []
  return landmarks.map((lm) => {
    if (!lm || typeof lm.x !== 'number') return null
    return applyTranspose(matrix, [lm.x - nose.x, lm.y - nose.y, (lm.z || 0) - (nose.z || 0)])
  })
}

function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]] }
function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]] }
function scale(a, s) { return [a[0] * s, a[1] * s, a[2] * s] }
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] }
function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
}
function norm(a) {
  const n = Math.hypot(a[0], a[1], a[2]) || 1
  return [a[0] / n, a[1] / n, a[2] / n]
}
function dist(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) }

/**
 * A cap past the forehead. These points are not landmarks. They are a shape
 * placed along the direction from chin to forehead, only after the pose says
 * the crown is the part the camera would be seeing.
 */
export function scalpCap(forehead, chin, leftTemple, rightTemple) {
  if (!forehead || !chin || !leftTemple || !rightTemple) return []
  const up = norm(sub(forehead, chin))
  let across = norm(sub(rightTemple, leftTemple))
  across = norm(sub(across, scale(up, dot(across, up))))
  const forward = norm(cross(across, up))
  const height = dist(forehead, chin)
  const width = dist(leftTemple, rightTemple)
  const pts = []
  for (let ring = 1; ring <= 4; ring++) {
    const t = ring / 4
    const lift = t * 0.62 * height
    const radius = Math.cos(t * Math.PI / 2) * 0.46 * width
    for (let s = 0; s < 8; s++) {
      const a = (s / 8) * Math.PI * 2
      pts.push(add(forehead, add(scale(up, lift), add(scale(across, radius * Math.cos(a)), scale(forward, radius * Math.sin(a) * 0.72)))))
    }
  }
  pts.push(add(forehead, scale(up, 0.62 * height)))
  return pts
}

export function createCloud({ voxel = 0.007, max = 8000 } = {}) {
  const cells = new Map()
  return {
    get size() { return cells.size },
    count(kind) {
      let n = 0
      for (const cell of cells.values()) if (cell.kind === kind) n++
      return n
    },
    add(points, kind) {
      let added = 0
      for (const p of points) {
        if (!p || p.length < 3 || !p.every(Number.isFinite)) continue
        const key = `${kind}:${Math.round(p[0] / voxel)}:${Math.round(p[1] / voxel)}:${Math.round(p[2] / voxel)}`
        if (cells.has(key)) continue
        if (cells.size >= max) return added
        cells.set(key, { x: p[0], y: p[1], z: p[2], kind })
        added++
      }
      return added
    },
    clear() { cells.clear() },
    list() { return [...cells.values()] },
  }
}

/**
 * One accepted frame. Face landmarks become canonical points. The scalp cap
 * is added only when the crown is presented, and it is stored as its own kind.
 */
export function observeHead({ landmarks, matrix, seen, cloud }) {
  const pose = poseFromMatrix(matrix)
  if (!pose || !landmarks || landmarks.length < 468 || faceWidth(landmarks) < 0.08) {
    return { pose, seen: seen ?? {}, added: 0, rejected: true }
  }
  const canon = canonicalLandmarks(landmarks, matrix)
  let added = cloud.add(canon.filter((p) => p), 'face')
  const next = markCoverage(seen, pose)
  if (crownVisible(pose)) {
    added += cloud.add(scalpCap(canon[10], canon[152], canon[234], canon[454]), 'scalp')
  }
  return { pose, seen: next, added, rejected: false }
}

export function projectPoint(p, view, { cx, cy, scale }) {
  const cyaw = Math.cos(view.yaw), syaw = Math.sin(view.yaw)
  const cp = Math.cos(view.pitch), sp = Math.sin(view.pitch)
  const x0 = p.x, y0 = -p.y, z0 = p.z
  const x1 = x0 * cyaw + z0 * syaw
  const z1 = -x0 * syaw + z0 * cyaw
  const y2 = y0 * cp - z1 * sp
  const z2 = y0 * sp + z1 * cp
  const f = view.dist / (view.dist + z2 + 1)
  return { x: cx + x1 * scale * f, y: cy + y2 * scale * f, depth: z2, f }
}

export function loopEdges(loops = LOOPS) {
  const edges = []
  for (const loop of Object.values(loops)) {
    for (let i = 0; i < loop.length; i++) edges.push([loop[i], loop[(i + 1) % loop.length]])
  }
  return edges
}

const EDGES = loopEdges()

async function boot() {
  await import('../core/site.js?v=1.17.4')
  const root = document.querySelector('[data-reconstruct]')
  if (!root) return
  const el = (name) => root.querySelector(`[data-${name}]`)
  const camera = el('camera')
  const cloudCanvas = el('cloud')
  const camCtx = camera.getContext('2d')
  const cloudCtx = cloudCanvas.getContext('2d')
  let phase = 'idle'
  let reason = ''
  let source = null
  let worker = null
  let timer = null
  let raf = 0
  let ticket = 0
  let busy = false
  let cloud = createCloud()
  let seen = {}
  let frames = 0
  let mesh = []
  let pose = null
  const view = { yaw: -0.55, pitch: 0.32, dist: 1.7 }
  let userMoved = false
  let pointer = null

  function say(row) {
    return phrase(row, copyLang())
  }

  function fit(canvas) {
    const rect = canvas.getBoundingClientRect()
    if (rect.width < 2 || rect.height < 2) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const w = Math.max(2, Math.round(rect.width * dpr))
    const h = Math.max(2, Math.round(rect.height * dpr))
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h }
  }

  function paintCopy() {
    const lang = copyLang()
    const iframe = el('reel')
    if (!iframe) return
    const name = lang === 'zh' ? iframe.dataset.ariaZh : lang === 'en' ? iframe.dataset.ariaEn : iframe.dataset.ariaTh
    if (name) iframe.setAttribute('aria-label', name)
  }

  function paint() {
    const active = phase === 'loading' || phase === 'running'
    const agreed = el('consent').checked
    el('start').disabled = !agreed || active
    el('stop').disabled = !active
    el('clear').disabled = active || (cloud.size === 0 && frames === 0)
    const status = reason || say(PHRASES[phase] || PHRASES.idle)
    if (el('status').textContent !== status) el('status').textContent = status
    const faceN = cloud.count('face')
    const scalpN = cloud.count('scalp')
    el('counts').textContent = phrase(PHRASES.counts, copyLang())(faceN, scalpN, frames)
    const deg = (rad) => Math.round(rad * 180 / Math.PI)
    el('pose').textContent = pose
      ? phrase(PHRASES.pose, copyLang())(deg(pose.yaw), deg(pose.pitch), deg(pose.roll))
      : say(PHRASES.noPose)
    for (const item of root.querySelectorAll('[data-angle]')) {
      item.classList.toggle('is-seen', !!seen[item.dataset.angle])
    }
    const missing = missingAngles(seen)
    el('missing').textContent = missing.join(' ')
    el('camera-note').hidden = phase === 'running' || phase === 'loading'
    el('cloud-note').hidden = cloud.size > 0
    paintCopy()
  }

  function drawCloud() {
    fit(cloudCanvas)
    const ctx = cloudCtx
    const w = cloudCanvas.width, h = cloudCanvas.height
    ctx.fillStyle = BLACK
    ctx.fillRect(0, 0, w, h)
    const layout = { cx: w / 2, cy: h / 2, scale: Math.min(w, h) * 2.1 }
    const pts = cloud.list().map((p) => ({ ...p, ...projectPoint(p, view, layout) }))
    pts.sort((a, b) => b.depth - a.depth)
    for (const p of pts) {
      const s = Math.max(2, 3.2 * p.f)
      ctx.fillStyle = p.kind === 'scalp' ? GRAY : SIGNAL
      ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s)
    }
    if (mesh.length) {
      ctx.strokeStyle = NAPLES
      ctx.lineWidth = Math.max(1, Math.min(w, h) / 480)
      ctx.beginPath()
      for (const [a, b] of EDGES) {
        const pa = mesh[a], pb = mesh[b]
        if (!pa || !pb) continue
        const A = projectPoint({ x: pa[0], y: pa[1], z: pa[2] }, view, layout)
        const B = projectPoint({ x: pb[0], y: pb[1], z: pb[2] }, view, layout)
        ctx.moveTo(A.x, A.y)
        ctx.lineTo(B.x, B.y)
      }
      ctx.stroke()
    }
  }

  function frameMotion() {
    cancelAnimationFrame(raf)
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    const spin = () => {
      if (!userMoved && !reduce && cloud.size > 0 && !pointer) view.yaw += 0.004
      drawCloud()
      raf = requestAnimationFrame(spin)
    }
    raf = requestAnimationFrame(spin)
  }

  function release() {
    ticket++
    clearTimeout(timer)
    timer = null
    busy = false
    source?.close()
    source = null
    worker?.terminate()
    worker = null
    camCtx.fillStyle = BLACK
    fit(camera)
    camCtx.fillRect(0, 0, camera.width, camera.height)
  }

  function halt(next, message = '') {
    release()
    phase = next
    reason = message
    paint()
    drawCloud()
  }

  function drawCamera(rect, landmarks) {
    if (!rect || !landmarks) return
    camCtx.fillStyle = SIGNAL
    const loops = [LOOPS.oval, LOOPS.lip, LOOPS.eyeL, LOOPS.eyeR, LOOPS.browL, LOOPS.browR]
    for (const loop of loops) {
      for (const index of loop) {
        const lm = landmarks[index]
        if (!lm) continue
        const x = rect.x + lm.x * rect.w
        const y = rect.y + lm.y * rect.h
        camCtx.fillRect(x - 2, y - 2, 4, 4)
      }
    }
  }

  async function start() {
    if (!el('consent').checked || document.hidden) return
    phase = 'loading'
    reason = ''
    paint()
    const mine = ++ticket
    let opened = null
    try {
      const { openWebcam } = await import('../core/source.js?v=1.17.4')
      const w = worker = new Worker('/js/focus/worker.js')
      await new Promise((resolve, reject) => {
        const watchdog = setTimeout(() => reject(new Error('timeout')), 45000)
        w.onerror = () => reject(new Error('worker'))
        w.onmessage = ({ data }) => {
          if (data.type === 'ready') { clearTimeout(watchdog); resolve() }
          else if (data.type === 'error') reject(new Error('model'))
        }
        w.postMessage({ type: 'load' })
      })
      if (mine !== ticket) return
      opened = await openWebcam({ facing: 'user' })
      if (mine !== ticket) { opened.close(); return }
      source = opened
      source.onended = () => { if (mine === ticket) halt('stopped', say(PHRASES.cameraFail)) }
      phase = 'running'
      reason = ''
      paint()
      w.onmessage = ({ data }) => {
        if (mine !== ticket) return
        busy = false
        if (data.type !== 'result') return
        const faces = data.result?.faceLandmarks ?? []
        const rect = source?.drawTo(camCtx, camera.width, camera.height)
        if (faces.length !== 1) {
          reason = say(faces.length > 1 ? PHRASES.twoFaces : PHRASES.noFace)
          paint()
          schedule()
          return
        }
        const landmarks = faces[0]
        const matrix = data.result?.facialTransformationMatrixes?.[0]?.data
        if (faceWidth(landmarks) < 0.08) {
          reason = say(PHRASES.small)
          paint()
          schedule()
          return
        }
        const outcome = observeHead({
          landmarks,
          matrix: matrix ? Array.from(matrix) : null,
          seen,
          cloud,
        })
        if (!outcome.rejected) {
          pose = outcome.pose
          seen = outcome.seen
          frames++
          mesh = canonicalLandmarks(landmarks, matrix ? Array.from(matrix) : null)
          reason = ''
          if (rect) drawCamera(rect, landmarks)
        }
        paint()
        schedule()
      }
      schedule()
    } catch (err) {
      opened?.close?.()
      if (mine !== ticket) return
      const lang = copyLang()
      const detail = err?.en || err?.message || ''
      const message = detail === 'timeout' || detail === 'worker' || detail === 'model'
        ? say(PHRASES.modelFail)
        : lang === 'zh'
          ? `${say(PHRASES.cameraFail)}${err?.en ? ` (${err.en})` : ''}`
          : (err?.text || say(PHRASES.cameraFail))
      halt('stopped', message)
    }
  }

  function schedule() {
    clearTimeout(timer)
    timer = setTimeout(grab, 140)
  }

  async function grab() {
    if (!source || busy || phase !== 'running') return
    if (document.hidden) return halt('stopped', say(PHRASES.hidden))
    fit(camera)
    const mine = ticket
    busy = true
    try {
      const bitmap = await createImageBitmap(source.canvas(480))
      if (mine !== ticket) { bitmap.close(); return }
      worker.postMessage({ type: 'frame', bitmap, time: performance.now() }, [bitmap])
    } catch {
      if (mine === ticket) halt('stopped', say(PHRASES.cameraFail))
    }
  }

  el('consent').addEventListener('change', () => {
    if (!el('consent').checked && (phase === 'loading' || phase === 'running')) halt('stopped')
    paint()
  })
  el('start').addEventListener('click', start)
  el('stop').addEventListener('click', () => halt('stopped'))
  el('clear').addEventListener('click', () => {
    cloud.clear()
    seen = {}
    frames = 0
    mesh = []
    pose = null
    reason = ''
    paint()
    drawCloud()
  })
  cloudCanvas.addEventListener('pointerdown', (event) => {
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, yaw: view.yaw, pitch: view.pitch }
    userMoved = true
    cloudCanvas.setPointerCapture(event.pointerId)
  })
  cloudCanvas.addEventListener('pointermove', (event) => {
    if (!pointer || pointer.id !== event.pointerId) return
    view.yaw = pointer.yaw + (event.clientX - pointer.x) * 0.008
    view.pitch = Math.max(-1.2, Math.min(1.2, pointer.pitch + (event.clientY - pointer.y) * 0.008))
  })
  const endPointer = (event) => { if (pointer?.id === event.pointerId) pointer = null }
  cloudCanvas.addEventListener('pointerup', endPointer)
  cloudCanvas.addEventListener('pointercancel', endPointer)
  cloudCanvas.addEventListener('keydown', (event) => {
    const step = event.shiftKey ? 0.12 : 0.06
    if (event.key === 'ArrowLeft') view.yaw -= step
    else if (event.key === 'ArrowRight') view.yaw += step
    else if (event.key === 'ArrowUp') view.pitch -= step
    else if (event.key === 'ArrowDown') view.pitch += step
    else return
    userMoved = true
    event.preventDefault()
  })

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && (phase === 'loading' || phase === 'running')) halt('stopped', say(PHRASES.hidden))
  })
  window.addEventListener('pagehide', () => { cloud.clear(); mesh = []; halt('idle') })
  addEventListener('resize', () => { fit(camera); drawCloud() })
  onLang(paint)
  fit(camera)
  camCtx.fillStyle = BLACK
  camCtx.fillRect(0, 0, camera.width, camera.height)
  paint()
  frameMotion()
}

if (typeof document !== 'undefined' && document.querySelector('[data-reconstruct]')) boot()
