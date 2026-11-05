import { t, onLang } from '../core/i18n.js?v=1.27.3'
// One real PDF page in memory, fetched/rendered only when the paper is opened.
let started = false, refresh = () => {}
export async function openPaperReader() {
  if (started) { refresh(); return }
  started = true
  const root = document.querySelector('[data-pdf-reader]'),
    $ = selector => root.querySelector(selector),
    view = $('.paper-page'), canvas = $('[data-pdf-canvas]'), status = $('[data-pdf-status]')
  let doc, loading, render, page = 1, zoom = 1, ticket = 0, resizeFrame = 0, stopped = false
  function controls() {
    $('[data-pdf-prev]').disabled = !doc || page <= 1
    $('[data-pdf-next]').disabled = !doc || page >= doc.numPages
    $('[data-pdf-out]').disabled = !doc || zoom <= .75
    $('[data-pdf-in]').disabled = !doc || zoom >= 2
    $('[data-pdf-fit]').disabled = !doc
    $('[data-pdf-page]').textContent = doc ? `${page}/${doc.numPages}` : '1/5'
  }
  async function paint() {
    if (!doc || stopped || root.closest('[hidden]')) return
    const current = ++ticket
    render?.cancel()
    try {
      if (render) await render.promise.catch(() => {})
      const sheet = await doc.getPage(page)
      if (current !== ticket || stopped) return
      const base = sheet.getViewport({scale:1})
      const width = Math.min(900, Math.max(200, view.clientWidth - 24)) * zoom
      const viewport = sheet.getViewport({scale:width / base.width})
      const ratio = Math.min(devicePixelRatio || 1, 2, Math.sqrt(8_000_000 / (viewport.width * viewport.height)))
      canvas.width = Math.round(viewport.width * ratio)
      canvas.height = Math.round(viewport.height * ratio)
      canvas.style.width = `${viewport.width}px`
      canvas.style.height = `${viewport.height}px`
      render = sheet.render({canvasContext:canvas.getContext('2d'), viewport, transform:[ratio,0,0,ratio,0,0]})
      await render.promise
      if (current !== ticket || stopped) return
      $('[data-pdf-preview]').hidden = true
      canvas.hidden = false
      status.textContent = t(`หน้า ${page} จาก ${doc.numPages} · ${zoom === 1 ? 'พอดีความกว้าง' : `ขยาย ${zoom} เท่า`}`, `Page ${page} of ${doc.numPages} · ${zoom === 1 ? 'fit width' : `${zoom}× fitted size`}`, `第 ${page} / ${doc.numPages} 页 · ${zoom === 1 ? '适应宽度' : `适配尺寸的 ${zoom} 倍`}`)
      controls()
    } catch (error) {
      if (current === ticket && error.name !== 'RenderingCancelledException') status.textContent = t('แสดง PDF ไม่ได้ ดาวน์โหลดหรืออ่านข้อความแทนได้', 'Could not render the PDF. Download it or choose Read as text.', '无法显示 PDF。可下载或选择文字版。')
    }
  }
  refresh = paint
  for (const [selector, act] of [
    ['[data-pdf-prev]', () => {page = Math.max(1,page-1)}],
    ['[data-pdf-next]', () => {page = Math.min(doc.numPages,page+1)}],
    ['[data-pdf-out]', () => {zoom = Math.max(.75,zoom-.25)}],
    ['[data-pdf-in]', () => {zoom = Math.min(2,zoom+.25)}],
    ['[data-pdf-fit]', () => {zoom = 1}],
  ]) $(selector).addEventListener('click', () => {
    if (!doc) return
    act(); controls(); view.scrollTop = 0; view.scrollLeft = 0; paint()
  })
  let lastWidth = 0
  const observer = new ResizeObserver(() => {
    if (view.clientWidth === lastWidth || !view.clientWidth) return
    lastWidth = view.clientWidth
    cancelAnimationFrame(resizeFrame)
    resizeFrame = requestAnimationFrame(paint)
  })
  observer.observe(view)
  onLang(() => { if (doc && !root.closest('[hidden]')) paint() })
  window.addEventListener('pagehide', event => {
    ticket++; cancelAnimationFrame(resizeFrame); render?.cancel()
    // A frozen Back/Forward entry keeps its document and worker. Repaint on
    // restoration; destroying them here would leave a permanently dead reader.
    if (event.persisted) return
    stopped = true; observer.disconnect(); loading?.destroy().catch(() => {})
  })
  window.addEventListener('pageshow', event => { if (event.persisted) paint() })
  status.textContent = t('กำลังเปิด PDF… อ่านภาพหน้าแรกระหว่างรอได้', 'Opening PDF… The first-page preview is available while it loads.', '正在打开 PDF…加载时可先看第一页预览。')
  try {
    const pdf = await import('/vendor/pdfjs-6.5.438/pdf.min.mjs?v=1.27.3')
    if (stopped) return
    pdf.GlobalWorkerOptions.workerSrc = '/vendor/pdfjs-6.5.438/pdf.worker.min.mjs?v=1.27.3'
    // Glyph paths preserve the site's closed font/eval policy. No remote assets,
    // document JavaScript, PDF actions, annotation scripts or file upload.
    loading = pdf.getDocument({url:root.dataset.pdfUrl, isEvalSupported:false, disableFontFace:true, useSystemFonts:false, useWasm:false})
    doc = await loading.promise
    if (!stopped) {controls(); await paint()}
  } catch {
    if (!stopped) status.textContent = t('เปิดตัวอ่านไม่ได้ ดาวน์โหลด PDF หรืออ่านข้อความได้', 'The reader could not open. Download the PDF or choose Read as text.', '阅读器无法打开。可下载 PDF 或选择文字版。')
  }
}
