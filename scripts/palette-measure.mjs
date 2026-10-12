// Derive and measure the site's colour system.
//
// The design system claims measured contrast ratios in its header comment. This
// prints them, so the claim is checkable instead of asserted — the same rule the
// handbook follows with its worked numbers.
//
//   node scripts/palette-measure.mjs           print the table
//   node scripts/palette-measure.mjs --check   fail if a pairing drops below its floor
//
// TONE LADDER. Sanzo Wada's archive is a grid of hues by tone. The site uses four
// hues from Plate 303 and admits no others. Each hue gets three tones built on one
// shared ladder — the same percentages of black or white mixed into every hue — so
// a pale Olive and a pale Naples Yellow are visibly the same *move*. That shared
// ladder is the rule that keeps four hues from reading as eight arbitrary colours.
//
//   deep = 76% hue + 24% black     base = the plate's own value     pale = 78% hue + 22% white
//
// Machine light may glow Peach Red — the same hue, soft, only on what the
// machine sees. That glow is not a new pairing and not a fifth hue.
// One job per colour still holds: tone changes emphasis, never meaning. Peach Red
// is only ever what the machine sees, at any tone.

const hex = (h) => {
  const s = h.replace('#', '')
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16))
}
const toHex = (rgb) => '#' + rgb.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('')

const mix = (a, b, t) => {
  const [x, y] = [hex(a), hex(b)]
  return toHex([0, 1, 2].map((i) => x[i] * t + y[i] * (1 - t)))
}

const HUES = {
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

const FLOOR = { text: 4.5, large: 3, mark: 3 }

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

const isMain = process.argv[1] && process.argv[1].endsWith('palette-measure.mjs')
if (isMain) {
  const p = ladder()
  const rows = pairings(p)
  console.log('\n  TONE LADDER — every hue on one shared ladder\n')
  console.log('  hue      deep      base      pale')
  for (const [name, t] of Object.entries(p)) {
    console.log(`  ${name.padEnd(8)}  ${t.deep}   ${t.base}   ${t.pale}`)
  }
  console.log('\n  PAIRINGS — measured, not asserted\n')
  for (const r of rows) {
    const mark = r.claim === 'banned' ? (r.pass ? '⊘' : '✗') : r.pass ? '✓' : '✗'
    const need = r.claim === 'banned' ? `stays under ${r.floor}` : `needs ${r.floor}`
    console.log(
      `  ${mark} ${r.ratio.toFixed(2).padStart(6)}:1  (${need.padEnd(19)})  ${r.name.padEnd(24)} ${r.fg} on ${r.bg}`,
    )
  }
  const failed = rows.filter((r) => !r.pass)
  const req = rows.filter((r) => r.claim === 'required').length
  console.log('')
  if (process.argv.includes('--check') && failed.length) {
    console.error(`  ${failed.length} claim(s) broken: ${failed.map((f) => `${f.name} ${f.ratio.toFixed(2)}:1`).join(', ')}\n`)
    process.exit(1)
  }
  console.log(`  ${req} required pairings clear their floor · ${rows.length - req} forbidden pairings stay illegible.\n`)
}