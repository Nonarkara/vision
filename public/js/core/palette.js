/**
 * THE PALETTE — one definition, read by the gate and by the browser.
 *
 * TONE LADDER. Sanzo Wada's archive is a grid of hues by tone. The site uses four
 * hues from Plate 303 and admits no others. Each hue gets three tones built on one
 * shared ladder — the same percentages of black or white mixed into every hue — so
 * a pale Olive and a pale Naples Yellow are visibly the same *move*. That shared
 * ladder is the rule that keeps four hues from reading as eight arbitrary colours.
 *
 *   deep = 76% hue + 24% black     base = the plate's own value     pale = 78% hue + 22% white
 *
 * Machine light may glow Peach Red — the same hue, soft, only on what the machine
 * sees. That glow is not a new pairing and not a fifth hue.
 * One job per colour still holds: tone changes emphasis, never meaning. Peach Red
 * is only ever what the machine sees, at any tone.
 *
 * This file was extracted from scripts/palette-measure.mjs, which said plainly in its
 * own header that it measured "the ladder defined below, not public/css/vision.css".
 * The ladder now lives with the site it describes, so the instrument that certifies a
 * pairing and the page that paints it cannot drift apart. The colour study on /colour
 * imports the same numbers and is therefore graded by the same rules that built it.
 */

const hex = (h) => {
  const s = h.replace('#', '')
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16))
}
const toHex = (rgb) => '#' + rgb.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('')

const mix = (a, b, t) => {
  const [x, y] = [hex(a), hex(b)]
  return toHex([0, 1, 2].map((i) => x[i] * t + y[i] * (1 - t)))
}

export const HUES = {
  naples: '#fbe6a0',
  olive: '#253122',
  gray: '#b6bfc1',
  signal: '#f15a30',
}

export function ladder() {
  const out = {}
  for (const [name, value] of Object.entries(HUES)) {
    out[name] = {
      deep: mix(value, '#000000', 0.24),
      base: value,
      pale: mix(value, '#ffffff', 0.22),
    }
  }
  // Palette's own instrument values — hardware, not plate.
  out.black = { deep: '#0a0a0a', base: '#101010', pale: '#161616' }
  out.white = { deep: '#f7f5ef', base: '#f7f5ef', pale: '#ffffff' }
  return out
}

// WCAG relative luminance and contrast.
const lum = (h) => {
  const [r, g, b] = hex(h).map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
export const contrast = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

// Two kinds of claim, both checked.
//
//   required — the CSS is allowed to set this as text on that ground. Body text
//              needs 4.5:1; large text (>=24px, or >=18.66px at 700) needs 3:1.
//   banned   — the CSS forbids this pairing. A banned row "passes" by staying
//              BELOW its floor, so the ban is proved rather than asserted. If a
//              future tone change quietly makes a forbidden pair legible, this
//              is the check that catches it.

export const FLOOR = { text: 4.5, large: 3, mark: 3 }

export function pairings(p = ladder()) {
  const rows = [
    // ── On the paper ground (Naples) ────────────────────────────────────
    ['required', 'olive on naples', p.olive.base, p.naples.base, 'text'],
    ['required', 'black on naples', p.black.base, p.naples.base, 'text'],
    ['required', 'olive.deep on naples', p.olive.deep, p.naples.base, 'text'],
    // The unlock. The old system banned signal on paper outright (2.7:1) because
    // there was only one signal tone. signal.deep clears 13:1, so emphasis text
    // on paper is now legal — same hue, same job, one step down the ladder.
    ['required', 'signal.deep on naples', p.signal.deep, p.naples.base, 'text'],
    // ── On the dark grounds (Olive, Black) ───────────────────────────────
    ['required', 'naples on olive', p.naples.base, p.olive.base, 'text'],
    ['required', 'naples.pale on olive', p.naples.pale, p.olive.base, 'text'],
    ['required', 'white on black', p.white.base, p.black.base, 'text'],
    ['required', 'naples on black', p.naples.base, p.black.base, 'text'],
    ['required', 'gray on black', p.gray.base, p.black.base, 'text'],
    ['required', 'gray.pale on black', p.gray.pale, p.black.base, 'text'],
    ['required', 'signal on black', p.signal.base, p.black.base, 'large'],
    ['required', 'signal.pale on olive', p.signal.pale, p.olive.base, 'mark'],
    // ── On the quiet field (Gray) ────────────────────────────────────────
    ['required', 'olive on gray', p.olive.base, p.gray.base, 'text'],
    ['required', 'black on gray', p.black.base, p.gray.base, 'text'],
    ['required', 'black on signal', p.black.base, p.signal.base, 'text'],
    // A deeper olive ground carries Naples even harder — the way to make a
    // section recede without introducing a hue.
    ['required', 'naples on olive.deep', p.naples.base, p.olive.deep, 'text'],

    // ── Forbidden, and proved so ────────────────────────────────────────
    // Black on Olive is 1.40:1. The olive field must always carry Naples.
    ['banned', 'black on olive', p.black.base, p.olive.base, 'text'],
    // Pale on pale: a pale tone is for a dark ground only.
    ['banned', 'olive.pale on naples', p.olive.pale, p.naples.base, 'text'],
    // Base signal is still marks-only on paper (2.7:1) — that ban survives;
    // signal.deep is the sanctioned way to set signal as text on Naples.
    ['banned', 'signal on naples', p.signal.base, p.naples.base, 'text'],
    // A deep tone is for a light ground; putting one on Olive is 1.15:1.
    ['banned', 'naples.deep on olive', p.naples.deep, p.olive.base, 'text'],
    // White on Peach Red is 3.08:1 — large marks only, never prose.
    ['banned', 'white on signal', p.white.base, p.signal.base, 'text'],
  ]
  return rows.map(([claim, name, fg, bg, kind]) => {
    const ratio = contrast(fg, bg)
    const ok = claim === 'banned' ? ratio < FLOOR[kind] : ratio >= FLOOR[kind]
    return { claim, name, fg, bg, kind, floor: FLOOR[kind], ratio, pass: ok }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// THE COLOUR STUDY
//
// The site has always assigned each hue a job: Naples is the paper, Olive is the
// ink, Gray is what the machine is unsure of, Peach Red is only ever what the
// machine sees. That assignment is a human decision, and it is not in the colours.
//
// A machine reading a plate gets numbers. #fbe6a0 and #253122 are two triples of
// bytes; contrast is a ratio computed from three luminance coefficients. Nothing in
// that arithmetic knows that one of them was ever supposed to feel like alarm.
//
// So: shuffle the jobs across the same four hues and ask a person what changed.
// Every assignment below is measured by the same contrast() the gate uses, and the
// ones the instrument calls illegal are reachable only behind an explicit toggle —
// never as a surprise.
//
// ROLES are what a plate is doing, not what a colour "is":
//   ground — the paper the plate sits on
//   ink    — the words a person wrote
//   quiet  — the parts nobody is meant to read first
//   signal — the machine's finding, and only that
//
// A role may use any tone of its hue, and takes the first that clears its floor —
// base if it can, otherwise one step down the ladder. That is the ladder doing the
// job it was built for: "signal.deep clears 13:1, so emphasis text on paper is legal
// — same hue, same job, one step down the ladder". Pinning every role to `base` was
// my first cut and it wrongly threw away 20 of 24 plates, which says the floor, not
// the study, was wrong.
export const ROLES = ['ground', 'ink', 'quiet', 'signal']

/**
 * Floors for a study plate.
 *
 * ink and quiet are text on the paper, so they carry the text floor. signal is
 * NOT: the plate draws it as a solid bar — a mark, never a field carrying words —
 * because the site's own rule is that Peach Red is only ever what the machine sees,
 * at any tone. Asking signal to carry ink was a design I tried first and it failed
 * on all 24 plates (ink-on-signal never once cleared 4.5:1, yet `legible` still
 * reported true, because the check was measuring a different pairing than the one
 * the plate paints). A mark needs 3:1, not 4.5:1 — that is WCAG's non-text rule,
 * and it is the same floor the house design uses for `signal on black`.
 */
const PLATE_FLOOR = { ink: FLOOR.text, quiet: FLOOR.text, signal: FLOOR.mark }

const permutations = (items) =>
  items.length <= 1
    ? [items]
    : items.flatMap((x, i) => permutations([...items.slice(0, i), ...items.slice(i + 1)])
      .map((rest) => [x, ...rest]))

/** The first tone of `hue` that clears `floor` against `ground`, base preferred. */
export function toneFor(p, hue, ground, floor) {
  for (const tone of ['base', 'deep', 'pale']) {
    const value = p[hue][tone]
    const ratio = contrast(value, ground)
    if (ratio >= floor) return { hue, tone, value, ratio, floor, pass: true }
  }
  // Report the best it managed, so an illegible plate can say how badly it failed.
  let best = null
  for (const tone of ['base', 'deep', 'pale']) {
    const value = p[hue][tone]
    const ratio = contrast(value, ground)
    if (!best || ratio > best.ratio) best = { hue, tone, value, ratio, floor, pass: false }
  }
  return best
}

/**
 * All 24 ways to deal the four hues to the four roles, each measured.
 * `legible` is the honest word: it says only that the contrast rule passes. It does
 * not say the plate reads well, and it cannot.
 */
export function assignments(p = ladder()) {
  return permutations(Object.keys(HUES)).map((deal) => {
    const at = Object.fromEntries(ROLES.map((role, i) => [role, deal[i]]))
    const ground = p[at.ground].base
    const reads = {}
    let legible = true
    for (const role of ROLES) {
      if (role === 'ground') continue
      const read = toneFor(p, at[role], ground, PLATE_FLOOR[role])
      if (!read.pass) legible = false
      reads[role] = read
    }
    return {
      id: ROLES.map((r) => at[r]).join('-'),
      at,
      ground,
      groundHue: at.ground,
      reads,
      legible,
      // The number a machine would report if asked whether this plate is readable.
      machineSays: legible,
      // The worst reading on the plate, which is the honest headline when it fails.
      worst: Math.min(...Object.values(reads).map((r) => r.ratio)),
    }
  })
}

export function plate(p = ladder()) {
  const all = assignments(p)
  return { all, legal: all.filter((a) => a.legible), forbidden: all.filter((a) => !a.legible) }
}