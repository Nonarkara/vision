// Why detection failed, in a sentence a person can act on.
//
// The neural network is the only thing on this site that needs the network to
// be reachable and a working graphics backend, so it is also the only thing
// that fails on a locked-down school wifi, a blocked CDN, a phone out of data,
// or a browser without WebGL. When it fails the visitor used to be told only
// "Detection is unavailable" — which names the symptom but not the cause and
// not the way out. Every other failure on the site (no camera, empty list,
// nothing found) already explains and offers a next step; this brings the
// detector in line with them.
//
// The classification reads the error's own text and stays honest about being a
// guess: it says "the network could not reach…" or "this browser could not…" as
// a likely cause, and always points at the lenses that still work, because the
// other four lenses never touch the model.

const KIND = {
  script: /could not load .*tf|Loading failed|tf\.min/i,
  weights: /could not load .*\.(json|bin)|fetch|network|Failed to fetch|ERR_/i,
  backend: /backend|webgl|WebGL|context/i,
  memory: /out of memory|memory allocation|allocation failed|\bOOM\b/i,
}

/**
 * A short, human explanation of a detector-load failure, in the page's language.
 * `t` is i18n's translator so this stays testable without a DOM.
 */
export function detectorFailure(err, t) {
  const message = String(err?.message ?? err ?? '')
  let why
  if (KIND.script.test(message)) {
    why = t(
      'เบราว์เซอร์โหลดไลบรารีของเครื่องไม่ได้ (มักเป็นเพราะเครือข่ายหรือนโยบายกั้นสคริปต์)',
      'the browser could not fetch the model library — often a network or script policy blocks it',
    )
  } else if (KIND.weights.test(message)) {
    why = t(
      'โหลดน้ำหนักแบบจำลอง (18 MB) ไม่สำเร็จ มักเป็นเพราะอินเทอร์เน็ตหยุดหรือถูกบล็อก',
      'the model weights (18 MB) did not finish downloading — often the connection dropped or was blocked',
    )
  } else if (KIND.backend.test(message)) {
    why = t(
      'เบราว์เซอร์นี้เปิดการคำนวณกราฟิกไม่ได้',
      'this browser could not start its graphics engine',
    )
  } else if (KIND.memory.test(message)) {
    why = t(
      'เครื่องนี้แรมไม่พอสำหรับแบบจำลอง',
      'this device ran out of memory for the model',
    )
  } else {
    why = t(
      'มีอะไรบางอย่างผิดพลาดขณะเปิดใช้การตรวจจับ',
      'something went wrong while starting detection',
    )
  }
  const next = t(
    'เลนส์อื่นยังใช้ได้ตามปกติ (ภาพ ตัวเลข ขอบ การเคลื่อนไหว) — ลองกดปุ่ม 1–4 หรือรีเฟรชแล้วลองอีกครั้ง',
    'the other lenses still work (picture, numbers, edges, motion) — try buttons 1–4, or refresh and try again',
  )
  return `${why}. ${next}`
}

/** The classifier returns a mid-sentence clause; capitalise it when it starts a line. */
export function detectorFailureSentence(err, t) {
  const text = detectorFailure(err, t)
  return text.charAt(0).toUpperCase() + text.slice(1)
}