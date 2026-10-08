// A looping, locally drawn traffic clip: one stable camera, changing traffic.
export function practiceVideo() {
  const canvas = document.createElement('canvas')
  canvas.width = 640
  canvas.height = 360
  const g = canvas.getContext('2d')
  let closed = false,
    t = 0,
    last = performance.now()
  function draw(now) {
    if (closed) return
    const dt = Math.min(0.2, (now - last) / 1000)
    last = now
    if (!document.hidden) t += dt
    g.fillStyle = '#b7c9cf'
    g.fillRect(0, 0, 640, 130)
    g.fillStyle = '#788a89'
    for (let i = 0; i < 18; i++)
      g.fillRect(i * 40, 80 + ((i * 13) % 32), 30, 60)
    g.fillStyle = '#5f696e'
    g.fillRect(0, 130, 640, 230)
    g.strokeStyle = '#ece5c4'
    g.lineWidth = 3
    for (const x of [180, 320, 460]) {
      g.beginPath()
      g.moveTo(320 + (x - 320) * 0.25, 130)
      g.lineTo(x, 360)
      g.stroke()
    }
    const busy = Math.floor(t / 8) % 2 === 0,
      n = busy ? 12 : 1
    for (let i = 0; i < n; i++) {
      const z = (t * 0.13 + i / n) % 1,
        lane = [-0.8, -0.25, 0.3, 0.8][i % 4],
        s = 8 + z * 48,
        x = 320 + lane * (35 + z * 260),
        y = 135 + z * 225
      g.fillStyle = ['#eee3c7', '#c5ac66', '#769aaf', '#b77360'][i % 4]
      g.fillRect(x - s * 0.6, y - s * 0.55, s * 1.2, s * 0.55)
      g.fillRect(x - s * 0.4, y - s * 0.9, s * 0.8, s * 0.45)
      g.fillStyle = '#28353f'
      g.fillRect(x - s * 0.3, y - s * 0.8, s * 0.6, s * 0.22)
    }
  }
  draw(last)
  return {
    kind: 'practice',
    moving: true,
    get ready() {
      return !closed
    },
    width: 640,
    height: 360,
    get frameAt() {
      return t
    },
    drawTo(ctx, w, h) {
      draw(performance.now())
      const s = Math.min(w / 640, h / 360),
        dw = 640 * s,
        dh = 360 * s
      ctx.drawImage(canvas, (w - dw) / 2, (h - dh) / 2, dw, dh)
      return { x: (w - dw) / 2, y: (h - dh) / 2, w: dw, h: dh }
    },
    close() {
      closed = true
    },
  }
}
