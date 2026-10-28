import { t, onLang } from '../core/i18n.js?v=1.24.0'
import { PACK, referenceFrames, drawReference } from './reference.js?v=1.24.0'
import { evaluate } from './metrics.js?v=1.24.0'
export function mountReferenceCheck() {
  const root = document.querySelector('[data-reference-check]')
  if (!root) return
  const run = root.querySelector('[data-reference-run]'), stop = root.querySelector('[data-reference-stop]'), download = root.querySelector('[data-reference-download]'), output = root.querySelector('[data-reference-output]'), canvas = root.querySelector('canvas')
  let running = false, cancelled = false, report = null, error = false
  const frames = referenceFrames().filter(f => f.split === 'evaluation')
  function paint() {
    run.disabled = running; stop.disabled = !running; download.disabled = !report?.records.length || running
    if (error) { output.textContent = t('อ่านโมเดลหรือเฟรมไม่สำเร็จ ลองใหม่ได้', 'Model or frame could not be read. You can retry.', '无法读取模型或画面，可以重试。'); return }
    if (!report) { output.textContent = t('ยังไม่ได้ทดสอบ ไม่มีคะแนนจนกว่าจะรัน', 'Not run. No score is available yet.', '尚未运行，暂无分数。'); return }
    const m = evaluate(frames, report.records)
    const score = value => value === null ? '—' : `${Math.round(value * 100)}%`
    output.textContent = running
      ? t(`กำลังตรวจ ${m.completed}/100 ภาพ · หยุดได้`, `Checking ${m.completed}/100 frames · you can stop`, `正在检查 ${m.completed}/100 帧，可随时停止`)
      : t(`${m.complete ? 'ครบแล้ว' : 'ยังไม่ครบ'} ${m.completed}/100 ภาพ · พบตรง ${m.tp} · เกิน ${m.fp} · พลาด ${m.fn} · precision ${score(m.precision)} · recall ${score(m.recall)} · p95 ${m.p95Ms === null ? '—' : Math.round(m.p95Ms)} ms`, `${m.complete ? 'Complete' : 'Partial'}: ${m.completed}/100 frames · matched ${m.tp} · extra ${m.fp} · missed ${m.fn} · precision ${score(m.precision)} · recall ${score(m.recall)} · p95 ${m.p95Ms === null ? '—' : Math.round(m.p95Ms)} ms`, `${m.complete ? '已完成' : '部分完成'}：${m.completed}/100 帧 · 匹配 ${m.tp} · 多报 ${m.fp} · 漏报 ${m.fn} · 精确率 ${score(m.precision)} · 召回率 ${score(m.recall)} · p95 ${m.p95Ms === null ? '—' : Math.round(m.p95Ms)} ms`)
  }
  run.addEventListener('click', async () => {
    if (running) return
    running = true; cancelled = false; error = false
    report = { pack: PACK.id, split: 'evaluation', model: 'ssdlite_mobilenet_v2', modelInput: 'graph resizes to 300x300', generatedAt: new Date().toISOString(), limitation: PACK.limitation, records: [], runtime: { userAgent: navigator.userAgent, viewport: [innerWidth, innerHeight] } }
    canvas.hidden = false; paint()
    const started = performance.now()
    try {
      const { loadDetector, detect } = await import('../ml/detector.js?v=1.24.0')
      const cold = performance.now(); await loadDetector(); report.loadAndWarmupMs = performance.now() - cold
      report.runtime.backend = window.tf?.getBackend?.() ?? 'unknown'
      for (const frame of frames) {
        if (cancelled || document.hidden || performance.now() - started > 120_000) break
        drawReference(canvas.getContext('2d'), frame)
        const start = performance.now(), answer = await detect(canvas, { minScore: 0.3, maxBoxes: 50 })
        report.records.push({ id: frame.id, ms: performance.now() - start, detections: answer.detections })
        paint()
        await new Promise(resolve => setTimeout(resolve, 0))
      }
      report.tensorMemory = window.tf?.memory?.() ?? null
      report.metrics = evaluate(frames, report.records)
      report.durationMs = performance.now() - started
    } catch (err) {
      error = true
      report.failure = String(err.message || err).slice(0, 300)
    } finally { running = false; paint() }
  })
  stop.addEventListener('click', () => { cancelled = true })
  document.addEventListener('visibilitychange', () => { if (document.hidden && running) cancelled = true })
  window.addEventListener('pagehide', () => { cancelled = true }, { once: true })
  download.addEventListener('click', () => {
    if (!report || running) return
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }))
    const a = document.createElement('a'); a.href = url; a.download = `${PACK.id}-report.json`; a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  })
  onLang(paint); paint()
}
