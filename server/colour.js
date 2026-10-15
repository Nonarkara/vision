/**
 * THE COLOUR STUDY — counts, and nothing else.
 *
 * The site refuses analytics and tracking in public. This file is the reason that
 * refusal can stay true while the site still learns something from the people who
 * visit it:
 *
 *   A visitor may answer ONE question about ONE plate: "how does this feel?".
 *   The answer is one word from a closed list of ten. The plate is one of the 24
 *   ways the four hues can be dealt to the four roles. That is the entire input.
 *
 * So there is no field a name, an address, a fingerprint or a free-text sentence
 * could arrive in — not because we promise not to store them, but because the
 * store has nowhere to put them. It keeps integers, keyed by two enums whose
 * product is 240 cells. Everything else about a visitor is discarded at the door,
 * including the address the rate limiter used: the limiter is an in-memory counter
 * and is never written down.
 *
 * What comes out is therefore a description, not a study. Anyone may contribute,
 * there are no accounts, and a determined person could skew a cell. The page says
 * so in those words. A number that cannot be wrong is not a result — it is a
 * decoration, and this site does not ship decorations.
 */
import fs from 'node:fs'
import path from 'node:path'
import { assignments } from '../public/js/core/palette.js'

/**
 * The ten words a visitor may choose. Chosen to be feelings rather than judgements:
 * no "good"/"bad", because the point is not that some plates are better. Thai and
 * English are both first-class; the ids are what travels, not the language.
 */
export const FEELINGS = [
  { id: 'calm', th: 'สงบ', en: 'calm' },
  { id: 'urgent', th: 'เร่งด่วน', en: 'urgent' },
  { id: 'warm', th: 'อบอุ่น', en: 'warm' },
  { id: 'cold', th: 'เย็นชา', en: 'cold' },
  { id: 'serious', th: 'จริงจัง', en: 'serious' },
  { id: 'playful', th: 'ขี้เล่น', en: 'playful' },
  { id: 'anxious', th: 'กังวล', en: 'anxious' },
  { id: 'trusting', th: 'น่าเชื่อถือ', en: 'trusting' },
  { id: 'tiring', th: 'เหนื่อยล้า', en: 'tiring' },
  { id: 'clean', th: 'สะอาด', en: 'clean' },
]

const FEELING_IDS = new Set(FEELINGS.map((f) => f.id))
const PLATE_IDS = new Set(assignments().map((a) => a.id))
export const MAX_BODY_BYTES = 512

/**
 * Validate one submitted answer.
 *
 * Returns `{ ok: true, assignment, feeling }` or `{ ok: false, error }`. Anything
 * unrecognised is refused rather than stored as-is: the whole privacy property
 * depends on the stored set being a subset of the enums, so a new key must never
 * be created by a request.
 */
export function validateAnswer(body) {
  if (!body || typeof body !== 'object') return { ok: false, error: 'expected a JSON object' }
  const { assignment, feeling } = body
  if (typeof assignment !== 'string' || !PLATE_IDS.has(assignment)) {
    return { ok: false, error: 'unknown plate' }
  }
  if (typeof feeling !== 'string' || !FEELING_IDS.has(feeling)) {
    return { ok: false, error: 'unknown feeling' }
  }
  return { ok: true, assignment, feeling }
}

/** Read a request body, refusing anything past the cap instead of buffering it. */
export function readBody(req, max = MAX_BODY_BYTES) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (c) => {
      size += c.length
      if (size > max) {
        reject(Object.assign(new Error('body too large'), { status: 413 }))
        req.destroy()
        return
      }
      chunks.push(c)
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'))
      } catch {
        reject(Object.assign(new Error('bad json'), { status: 400 }))
      }
    })
    req.on('error', reject)
  })
}

export function createColourStore({ file, legalOnly = true, log = () => {} }) {
  // Only legible plates can be *dealt*; an illegible one is deliberately shown to a
  // visitor who asked for it, and its answers are recorded too — that is the whole
  // teaching moment, so refusing to count it would throw away the most interesting
  // data on the page. The flag exists so tests can pin which set is in play.
  const plates = assignments()
  const legal = new Set(plates.filter((p) => p.legible).map((p) => p.id))
  const forbidden = new Set(plates.filter((p) => !p.legible).map((p) => p.id))
  const byId = new Map(plates.map((p) => [p.id, p]))

  let counts = Object.create(null)
  let total = 0
  let shared = null
  let busy = false

  const load = () => {
    try {
      const raw = JSON.parse(fs.readFileSync(file, 'utf8'))
      // Re-adopted through the same validator as a live request. A hand-edited or
      // truncated file must not be able to inject a key that a request could not.
      const next = Object.create(null)
      let n = 0
      for (const [plate, byFeeling] of Object.entries(raw?.counts ?? {})) {
        if (!byId.has(plate)) continue
        for (const [feeling, count] of Object.entries(byFeeling ?? {})) {
          if (!FEELING_IDS.has(feeling)) continue
          const c = Math.max(0, Math.floor(Number(count) || 0))
          if (!c) continue
          next[plate] ??= Object.create(null)
          next[plate][feeling] = (next[plate][feeling] ?? 0) + c
          n += c
        }
      }
      counts = next
      total = n
      if (raw?.shared && byId.has(raw.shared.id)) shared = raw.shared
      log('info', 'colour study loaded', { total })
    } catch (err) {
      log('warn', 'colour study starts empty', { error: String(err.message ?? err) })
    }
  }

  const persist = () => {
    if (busy) return
    busy = true
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true })
      // Same temp-then-rename as the catalogue: a half-written file read by a
      // restart would look like fewer answers than people actually gave.
      const tmp = `${file}.${process.pid}.tmp`
      fs.writeFileSync(tmp, JSON.stringify({ counts, total, shared }))
      fs.renameSync(tmp, file)
    } catch (err) {
      log('warn', 'colour study could not persist', { error: String(err.message ?? err) })
    } finally {
      busy = false
    }
  }

  load()

  return {
    get total() { return total },

    /** Record one answer. Returns the new total, or null if the answer was refused. */
    record({ assignment, feeling }) {
      const plate = byId.get(assignment)
      if (!plate || !FEELING_IDS.has(feeling)) return null
      counts[assignment] ??= Object.create(null)
      counts[assignment][feeling] = (counts[assignment][feeling] ?? 0) + 1
      total += 1
      persist()
      return total
    },

    /**
     * The aggregate for one plate, sorted by count. Ties break on the fixed feeling
     * order rather than on object key order, so the same data always renders the
     * same way — a leaderboard that reshuffles between two equal answers is a bug
     * that looks like a result.
     */
    summary(assignment) {
      const rows = FEELINGS.map((f) => ({
        ...f,
        count: counts[assignment]?.[f.id] ?? 0,
      }))
        .filter((r) => r.count > 0)
        .sort((a, b) => b.count - a.count || FEELING_IDS_order(a.id) - FEELING_IDS_order(b.id))
      const n = rows.reduce((sum, r) => sum + r.count, 0)
      return { assignment, rows, n, total }
    },

    /** Every plate that has been answered at least once, with its summary. */
    board() {
      return Object.keys(counts)
        .filter((id) => byId.has(id))
        .map((id) => this.summary(id))
        .filter((s) => s.n > 0)
        .sort((a, b) => b.n - a.n || a.assignment.localeCompare(b.assignment))
    },

    get shared() { return shared },

    /** Roll the one plate everybody is looking at. */
    dealShared(allowForbidden = false) {
      const pool = [...(allowForbidden ? plates : plates.filter((p) => p.legible))].map((p) => p.id)
      shared = { id: pool[Math.floor(Math.random() * pool.length)], at: Date.now() }
      persist()
      return shared
    },

    legal,
    forbidden,
    plates,
    legalOnly,
    _reset() { counts = Object.create(null); total = 0; shared = null },
  }
}

function FEELING_IDS_order(id) {
  return FEELINGS.findIndex((f) => f.id === id)
}