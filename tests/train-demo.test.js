// The demo set /train offers to visitors with no camera. The drawing is pure
// arithmetic, so it is tested against a fake canvas: same seed → same frame,
// busy → more vehicles than empty, and nothing throws.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { demoFrames, roadScene, DEMO_PER_CLASS } from '../public/js/train/demo.js'

function fakeCanvas() {
  const ops = []
  let style = ''
  const ctx = {
    ops,
    set fillStyle(v) { style = String(v); ops.push(['fillStyle', style]) },
    get fillStyle() { return style },
    createLinearGradient: () => ({ addColorStop: (...a) => ops.push(['grad', ...a]) }),
    createRadialGradient: () => ({ addColorStop: (...a) => ops.push(['grad', ...a]) }),
    fillRect: (...a) => ops.push(['fillRect', ...a]),
    beginPath: () => ops.push(['beginPath']),
    arc: (...a) => ops.push(['arc', ...a]),
    fill: () => ops.push(['fill']),
    getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h }),
    putImageData: (d) => ops.push(['putImageData', d.width, d.height]),
  }
  return {
    width: 0,
    height: 0,
    ops,
    getContext: () => ctx,
  }
}

globalThis.document = {
  createElement(tag) {
    assert.equal(tag, 'canvas', 'roadScene must draw into a canvas')
    return fakeCanvas()
  },
}

const arcs = (canvas) => canvas.ops.filter((o) => o[0] === 'arc').length

test('the demo set is 16 frames: busy then empty, alternating', () => {
  const frames = demoFrames()
  assert.equal(frames.length, DEMO_PER_CLASS * 2)
  assert.equal(DEMO_PER_CLASS, 8)
  frames.forEach(({ y, canvas }, i) => {
    assert.equal(y, i % 2, 'frames alternate busy (0) then empty (1)')
    assert.equal(canvas.width, 320)
    assert.equal(canvas.height, 180)
    assert.ok(canvas.ops.length > 20, `frame ${i} drew almost nothing`)
  })
})

test('the same seed draws the same frame, so the demo is reproducible', () => {
  const a = roadScene('busy', 42)
  const b = roadScene('busy', 42)
  assert.deepEqual(a.ops, b.ops)
  assert.notDeepEqual(roadScene('busy', 42).ops, roadScene('busy', 43).ops, 'a different seed must differ')
})

test('busy frames carry more vehicles than empty ones', () => {
  const frames = demoFrames()
  const busy = frames.filter((f) => f.y === 0).reduce((n, f) => n + arcs(f.canvas), 0)
  const empty = frames.filter((f) => f.y === 1).reduce((n, f) => n + arcs(f.canvas), 0)
  assert.ok(busy > empty, `busy drew ${busy} wheel arcs, empty drew ${empty}`)
  assert.ok(busy >= 5 * 8 * 2, 'every busy frame should draw at least five vehicles')
  assert.ok(empty <= 8 * 2 * 2, 'empty frames must stay nearly empty')
})

test('the two classes do not draw the same picture for one seed', () => {
  assert.notDeepEqual(roadScene('busy', 7).ops, roadScene('empty', 7).ops)
})
