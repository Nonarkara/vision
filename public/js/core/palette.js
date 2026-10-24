/**
 * THE PALETTE — one definition, read by the gate and by the browser.
 *
 * TONE LADDER. Sanzo Wada's archive is a grid of hues by tone. The site uses four
 * hues and admits no others. Each hue gets three tones built on one shared ladder —
 * the same percentages of black or white mixed into every hue — so a pale Indigo
 * and a pale Ivory Buff are visibly the same *move*. That shared ladder is the rule
 * that keeps four hues from reading as eight arbitrary colours.
 *
 *   deep = 24% hue + 76% black     base = the plate's own value     pale = 22% hue + 78% white
 *
 * Machine light may glow Jasper Red — the same hue, soft, only on what the machine
 * sees. That glow is not a new pairing and not a fifth hue.
 * One job per colour still holds: tone changes emphasis, never meaning. Jasper Red
 * is only ever what the machine sees, at any tone.
 *
 * This file was extracted from scripts/palette-measure.mjs, which said plainly in its
 * own header that it measured "the ladder defined below, not public/css/vision.css".
 * The ladder now lives with the site it describes, so the instrument that certifies a
 * pairing and the page that paints it cannot drift apart. The colour study on /colour
 * imports the same numbers and is therefore graded by the same rules that built it.
 *
 * ONE JOB PER HUE — AND THREE HUES ON A SCREEN.
 *
 * A screen that carries two of these reads as two colours however well it is laid
 * out, and the two the site never really used were gray and jasper: measured over
 * fifteen rooms, they were under half a percent of a first screen, and the
 * instrument's frame was black, which is 1.03:1 from indigo — the same colour
 * twice. So the rule is:
 *
 *   Every room's first screen carries at least three of the four hues, each at a
 *   size a reader can see, and each doing its own job:
 *     ivory  — the paper the room sits on
 *     indigo — the words a person wrote
 *     gray   — the quiet: the parts nobody is meant to read first
 *     jasper — the signal: what the machine sees, and only that
 *
 * "A size a reader can see" is a number and not a taste: SCREEN_FLOOR, half a
 * per cent of the first screen. At 1440×900 that is a 76×76 block; at 390×844,
 * a 41×40 one. The house's own hairlines measure 0.01%–0.15% of a screen, so
 * the floor stands an order of magnitude above a rule and far below a surface:
 * it is the size of a chip you can see without looking for it, and nothing
 * smaller. It is exported so there is one number and not two.
 *
 * The quiet hue is where the machine has not answered yet — an instrument's
 * frame, a label nobody reads first. The signal hue is where it has. A fifth
 * hue, or a hue without its job, is not a version of this. The hues stay the
 * same four and the ladder stays the same ladder; what changes is how much of
 * each one a screen is allowed to be.
 *
 * THE PHOTOGRAPH CLAUSE. A photograph's colours are the world's, not the
 * house's. On a room that leads with a photograph — the story — the pixels are
 * a control room, and a census of them measures the photographer, not the
 * design. So the house is measured on what it PAINTS: an opaque surface by its
 * own pixels, and a scrim over a photograph by its DECLARED colour and its own
 * area. The story's veil was the hardware's black, which is not one of the four
 * hues and credits nothing; it is the site's ink now, at 70%, and the loudest
 * page reads as the house's own paper on the house's own ground. A scrim
 * credits only the pixels under it that no house tone already claimed — the
 * photograph coming through — so the house's own type standing on the scrim
 * keeps its own hue and nothing is counted twice.
 *
 * MEASURED BY the colour census, one room at a time, at 1440×900 and 390×844,
 * in Thai. It is a browser instrument, so it lives with the other browser
 * instruments and is run by hand before a release, the way the linter is. What
 * the repository holds is the stylesheet's own declarations — the pins are in
 * tests/colour-law.test.js, and each one was proved by changing the
 * stylesheet and watching the pin fail.
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
  ivory: '#ebd3a2',
  indigo: '#051230',
  gray: '#b6bfc1',
  jasper: '#eb5324',
}

/**
 * The floor of the "three hues on a screen" law: the least of a hue a first
 * screen may carry and still be carrying it. Half a per cent of the screen —
 * a 76×76 block at 1440×900, a 41×40 one at 390×844. The house's own
 * hairlines measure 0.01%–0.15%, so this is a chip you can see, not a rule
 * you can guess at.
 *
 * It lives here, with the hues it measures, so the census that reads it and
 * the stylesheet that obeys it cannot drift apart.
 */
export const SCREEN_FLOOR = 0.5

/**
 * The story hero's veil — the ground the page's biggest type stands on.
 *
 * The veil is the site's ink at 70% over a photograph, so the ground the type
 * actually reads against is neither the ink nor the picture: it is the two
 * blended, and the blend changes with every patch of the picture. The worst
 * one is rgb(80,89,110) — measured over the crop the hero really shows, at
 * 1440 and at 390, with the browser instruments.
 *
 * That number is a fact about THIS photograph, so it goes stale if the
 * photograph changes. Re-derive it with the veil measurement and change it
 * here together with the veil — the pin in tests/colour-law.test.js holds the
 * two together, and the certificate below refuses the page if they drift.
 */
export const VEIL = { css: 'rgba(5, 18, 48, 0.70)', worst: '#50596e' }

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
    // ── On the paper ground (Ivory Buff) ─────────────────────────────────
    ['required', 'indigo on ivory', p.indigo.base, p.ivory.base, 'text'],
    ['required', 'black on ivory', p.black.base, p.ivory.base, 'text'],
    ['required', 'indigo.deep on ivory', p.indigo.deep, p.ivory.base, 'text'],
    // The unlock. The old system banned signal on paper outright (2.48:1) because
    // there was only one signal tone. jasper.deep clears 11.30:1, so emphasis text
    // on paper is now legal — same hue, same job, one step down the ladder.
    ['required', 'jasper.deep on ivory', p.jasper.deep, p.ivory.base, 'text'],
    // ── On the dark grounds (Indigo, Black) ──────────────────────────────
    ['required', 'ivory on indigo', p.ivory.base, p.indigo.base, 'text'],
    ['required', 'ivory.pale on indigo', p.ivory.pale, p.indigo.base, 'text'],
    ['required', 'white on black', p.white.base, p.black.base, 'text'],
    ['required', 'ivory on black', p.ivory.base, p.black.base, 'text'],
    ['required', 'gray on black', p.gray.base, p.black.base, 'text'],
    ['required', 'gray.pale on black', p.gray.pale, p.black.base, 'text'],
    ['required', 'jasper on black', p.jasper.base, p.black.base, 'large'],
    ['required', 'jasper.pale on indigo', p.jasper.pale, p.indigo.base, 'mark'],
    // ── On the story hero's veil (Indigo over a photograph) ──────────────
    // The loudest page's type stands on a blend, not on a ladder tone, so the
    // pairing the site really paints is certified against the worst patch of
    // the picture underneath. Ivory Buff on that is 4.80:1 — over the 4.5:1
    // the eyebrow and the caption need as small text, and far over the 3:1
    // the headline and the lede need as large text.
    ['required', 'ivory on the story veil', p.ivory.base, VEIL.worst, 'text'],
    // ── On the quiet field (Gray) ────────────────────────────────────────
    ['required', 'indigo on gray', p.indigo.base, p.gray.base, 'text'],
    ['required', 'black on gray', p.black.base, p.gray.base, 'text'],
    ['required', 'black on jasper', p.black.base, p.jasper.base, 'text'],
    // A deeper indigo ground carries Ivory Buff even harder — the way to make a
    // section recede without introducing a hue.
    ['required', 'ivory on indigo.deep', p.ivory.base, p.indigo.deep, 'text'],

    // ── Forbidden, and proved so ────────────────────────────────────────
    // Black on Indigo is 1.03:1. The indigo field must always carry Ivory Buff.
    ['banned', 'black on indigo', p.black.base, p.indigo.base, 'text'],
    // Pale on pale: a pale tone is for a dark ground only.
    ['banned', 'indigo.pale on ivory', p.indigo.pale, p.ivory.base, 'text'],
    // Base signal is still marks-only on paper (2.48:1) — that ban survives;
    // jasper.deep is the sanctioned way to set signal as text on Ivory Buff.
    ['banned', 'jasper on ivory', p.jasper.base, p.ivory.base, 'text'],
    // A deep tone is for a light ground; putting one on Indigo is 1.47:1.
    ['banned', 'ivory.deep on indigo', p.ivory.deep, p.indigo.base, 'text'],
    // White on Jasper Red is 3.32:1 — large marks only, never prose.
    ['banned', 'white on jasper', p.white.base, p.jasper.base, 'text'],
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
// The site has always assigned each hue a job: Ivory Buff is the paper, Indigo is
// the ink, Gray is what the machine is unsure of, Jasper Red is only ever what the
// machine sees. That assignment is a human decision, and it is not in the colours.
//
// A machine reading a plate gets numbers. #ebd3a2 and #051230 are two triples of
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
// job it was built for: "jasper.deep clears 11.30:1, so emphasis text on paper is
// legal — same hue, same job, one step down the ladder". Pinning every role to
// `base` was my first cut and it wrongly threw away 20 of 24 plates, which says the
// floor, not the study, was wrong.
export const ROLES = ['ground', 'ink', 'quiet', 'signal']

/**
 * Floors for a study plate.
 *
 * ink and quiet are text on the paper, so they carry the text floor. signal is
 * NOT: the plate draws it as a solid bar — a mark, never a field carrying words —
 * because the site's own rule is that Jasper Red is only ever what the machine
 * sees, at any tone. Asking signal to carry ink was a design I tried first and it
 * failed on all 24 plates (ink-on-signal never once cleared 4.5:1, yet `legible`
 * still reported true, because the check was measuring a different pairing than
 * the one the plate paints). A mark needs 3:1, not 4.5:1 — that is WCAG's non-text
 * rule, and it is the same floor the house design uses for `jasper on black`.
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