// The course as data: which chapters there are, in what order, which one a
// scroll position puts you in, and what to say about how far someone has come.
//
// Kept apart from the page so the arithmetic can be tested without a browser.
// The page's own picture (a live camera) is the other half of this room; none
// of it needs a camera to work, and none of it should fail without one.

/** Chapter ids in reading order. The page's own markup is the source of truth. */
export const ORDER = [
  'numbers', 'colour', 'threshold', 'convolution', 'edges', 'motion', 'detector', 'limits',
]

const STORAGE_KEY = 'vision_learn_seen_v1'

/**
 * Which chapter a person is looking at, given where each one starts.
 *
 * A chapter counts as current from the moment its top passes a line a little
 * above the middle of the screen, and stays current until the next top passes
 * the same line. `tops` and `line` are both document offsets: the reading line
 * on a phone is the upper third, so a chapter that has only just appeared at
 * the very top of the screen is not what anyone is reading yet.
 *
 * The loop starts at 0 so the first chapter is current above the page, rather
 * than nothing being current until the second chapter scrolls past.
 */
export function currentIndex(tops, line) {
  let index = 0
  for (let i = 0; i < tops.length; i++) if (tops[i] <= line) index = i
  return index
}

/** Chapters already read, oldest first, never more than the page really has. */
export function readSeen() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(raw) ? raw.filter((id) => ORDER.includes(id)) : []
  } catch {
    return []
  }
}

export function rememberSeen(seen) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...new Set(seen)].filter((id) => ORDER.includes(id)))) } catch { /* private mode: progress lasts this visit */ }
}

/**
 * What to say about progress. A first-time visitor is told where to start, not
 * congratulated on zero; someone part-way through is told which chapter they
 * stopped at, because "2 of 8 read" is a fact and "keep going!" is not.
 */
export function progressText(seen, total) {
  const done = seen.length
  if (!done) return ['เริ่มที่บทที่ 1 ด้านบน', 'Start at chapter 1, at the top', '从第 1 章开始']
  if (done >= total) return [`ผ่านครบ ${total} บทแล้ว · ไปห้องถัดไปได้`, `All ${total} chapters read · on to the next room`, `${total} 章全部读完 · 可以去下一个房间`]
  const next = ORDER[done]
  return [`อ่านมาแล้ว ${done} จาก ${total} บท`, `${done} of ${total} chapters read`, `已读 ${done} / ${total} 章`]
}

/** The chapter a returning visitor should be sent back to. */
export function resumeAt(seen) {
  return seen.length && seen.length < ORDER.length ? ORDER[seen.length] : null
}