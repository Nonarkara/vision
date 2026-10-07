// The eight things a gesture may do — every one of them inside this tab,
// because that is all a browser page is allowed to touch. When an API is
// missing, asleep, or refuses, fire() returns an honest sentence instead of
// pretending something happened.

import { t } from '../core/i18n.js'

export const ACTIONS = [
  { id: 'beep', th: 'เสียงสั้น', en: 'A short beep' },
  { id: 'buzz', th: 'สั่น (มือถือ)', en: 'Vibrate (a phone)' },
  { id: 'fullscreen', th: 'เข้า/ออกจากเต็มจอ', en: 'Enter / leave full screen' },
  { id: 'flash', th: 'จอวาบขาว', en: 'Flash the screen' },
  { id: 'lamp1', th: 'หลอดไฟ 1', en: 'Lamp 1' },
  { id: 'lamp2', th: 'หลอดไฟ 2', en: 'Lamp 2' },
  { id: 'media', th: 'เล่น/หยุดโทนเสียง', en: 'Play / pause the tone' },
  { id: 'link', th: 'เปิดหน้าต่างคู่มือ', en: 'Open the handbook window' },
]

/** What a class gets before the visitor picks anything. */
export const DEFAULT_ACTIONS = ['beep', 'buzz', 'flash', 'lamp1']

/**
 * A 1.6-second three-note loop, written as WAV bytes by the page itself —
 * the media action plays a file nothing fetched, so the CSP never comes
 * into it. 16-bit PCM mono, fades at every note edge so looping is click-free.
 */
export function toneWav({ hz = 8000, seconds = 1.6 } = {}) {
  const samples = Math.round(hz * seconds)
  const notes = [392, 523.25, 659.25] // G4 C5 E5
  const bytes = new Uint8Array(44 + samples * 2)
  const dv = new DataView(bytes.buffer)
  const ascii = (off, s) => { for (let i = 0; i < s.length; i++) bytes[off + i] = s.charCodeAt(i) }
  ascii(0, 'RIFF')
  dv.setUint32(4, 36 + samples * 2, true)
  ascii(8, 'WAVE')
  ascii(12, 'fmt ')
  dv.setUint32(16, 16, true)          // fmt chunk size
  dv.setUint16(20, 1, true)           // PCM
  dv.setUint16(22, 1, true)           // mono
  dv.setUint32(24, hz, true)          // sample rate
  dv.setUint32(28, hz * 2, true)      // byte rate
  dv.setUint16(32, 2, true)           // block align
  dv.setUint16(34, 16, true)          // bits per sample
  ascii(36, 'data')
  dv.setUint32(40, samples * 2, true)
  const seg = seconds / notes.length
  for (let i = 0; i < samples; i++) {
    const at = i / hz
    const inSeg = at % seg
    const env = Math.max(0, Math.min(1, inSeg / 0.02, (seg - inSeg) / 0.02))
    const f = notes[Math.floor(at / seg) % notes.length]
    dv.setInt16(44 + i * 2, Math.round(Math.sin(2 * Math.PI * f * at) * 0.28 * env * 32767), true)
  }
  return bytes
}

const ok = (th, en) => ({ ok: true, th, en })
const refuse = (th, en) => ({ ok: false, th, en })

/**
 * room: the element to take full screen · flash: the white overlay ·
 * lamps: the two <circle data-lamp> elements · spot: the fallback link box.
 * Everything is passed in; the module touches nothing until you call it.
 */
export function createActions({ room = null, flash = null, lamps = [], spot = null } = {}) {
  let ctx = null
  let held = null
  let tone = null
  let armed = false
  const lampOn = lamps.map(() => false)
  let reduced = false
  try { reduced = matchMedia('(prefers-reduced-motion: reduce)').matches } catch { /* no media queries, no flash */ }

  /** Called from the Arm button's click — the one gesture the browser insists on. */
  async function arm() {
    try {
      ctx = ctx ?? new AudioContext()
      if (ctx.state !== 'running') await ctx.resume()
    } catch { ctx = null }
    try {
      if (!held || held.closed) held = window.open('about:blank')
    } catch { held = null }
    armed = true
    if (spot) spot.hidden = true
    const sound = ctx?.state === 'running'
    const win = !!held && !held.closed
    return {
      ok: sound,
      th: `เปิดใช้แล้ว — เสียง: ${sound ? 'พร้อม' : 'ไม่พร้อม'} · หน้าต่าง: ${win ? 'เปิดรอไว้' : 'ถูกบล็อก จะใช้ปุ่มลิงก์แทน'}`,
      en: `Armed — sound: ${sound ? 'ready' : 'unavailable'} · window: ${win ? 'held open' : 'blocked, the link button will be used'}`,
    }
  }

  function disarm() {
    armed = false
    return ok('พักการกระทำไว้ก่อน', 'Actions are resting')
  }

  function beep() {
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.frequency.value = 880
    o.connect(g).connect(ctx.destination)
    const now = ctx.currentTime
    g.gain.setValueAtTime(0.12, now)
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.18)
    o.start(now)
    o.stop(now + 0.2)
  }

  /** id → { ok, th, en }: what actually happened, honestly. */
  async function fire(id) {
    if (id === 'beep') {
      if (!ctx || ctx.state !== 'running') return refuse('ยังไม่ได้เปิดใช้ —กด “เปิดใช้การกระทำ” ก่อน', 'Not armed yet — press “Arm the actions” first')
      beep()
      return ok('ดังปี๊ป', 'Beeped')
    }
    if (id === 'buzz') {
      if (typeof navigator.vibrate !== 'function') return refuse('เครื่องนี้ไม่มีเข็มสั่น —มือถือเท่านั้น', 'This device has no buzzer — phones only')
      const done = navigator.vibrate([60, 40, 60])
      return done ? ok('สั่นแล้ว (ถ้าเครื่องมีเข็ม)', 'Buzzed (if a buzzer is fitted)') : refuse('เบราว์เซอร์ปฏิเสธการสั่น', 'The browser refused to vibrate')
    }
    if (id === 'fullscreen') {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {})
        return ok('ออกจากเต็มจอแล้ว', 'Left full screen')
      }
      try {
        await room?.requestFullscreen?.()
        return ok('เข้าเต็มจอแล้ว', 'Full screen')
      } catch {
        return refuse('เบราว์เซอร์ไม่ให้เต็มจอโดยไม่มีคลิก —กดปุ่ม ⛶ เอง', 'No full screen without a click — press ⛶ yourself')
      }
    }
    if (id === 'flash') {
      if (reduced) return refuse('ตั้ง “ลดการเคลื่อนไหว” ไว้ —ใช้เสียงแทน', 'Motion is set to reduce — use the beep instead')
      if (!flash) return refuse('ไม่มีแผ่นแสงบนหน้านี้', 'No flash layer on this page')
      flash.classList.add('is-flash')
      setTimeout(() => flash.classList.remove('is-flash'), 260)
      return ok('จอวาบขาวแล้ว', 'The screen flashed')
    }
    if (id === 'lamp1' || id === 'lamp2') {
      const i = id === 'lamp1' ? 0 : 1
      const el = lamps[i]
      if (!el) return refuse('ไม่มีหลอดดวงนี้', 'No such lamp')
      lampOn[i] = !lampOn[i]
      el.classList.toggle('is-on', lampOn[i])
      return lampOn[i] ? ok(`หลอด ${i + 1} เปิดแล้ว`, `Lamp ${i + 1} is on`) : ok(`หลอด ${i + 1} ดับแล้ว`, `Lamp ${i + 1} is off`)
    }
    if (id === 'media') {
      try {
        if (!tone) {
          tone = new Audio(URL.createObjectURL(new Blob([toneWav()], { type: 'audio/wav' })))
          tone.loop = true
          tone.className = 'vh'
          tone.setAttribute('aria-hidden', 'true')
          document.body.append(tone)
          try {
            if ('mediaSession' in navigator) {
              navigator.mediaSession.metadata = new MediaMetadata({ title: t('โทนเสียงของ VISION', 'The VISION tone'), artist: 'vision.nonarkara.org' })
              navigator.mediaSession.setActionHandler('play', () => tone.play().catch(() => {}))
              navigator.mediaSession.setActionHandler('pause', () => tone.pause())
            }
          } catch { /* media keys are a bonus, not a promise */ }
        }
        if (tone.paused) {
          await tone.play()
          return ok('เล่นโทนเสียงแล้ว —ปุ่มสื่อบนคีย์บอร์ดจะคุมแท็บนี้', 'The tone is playing — your media keys now steer this tab')
        }
        tone.pause()
        return ok('หยุดโทนเสียงแล้ว', 'The tone is paused')
      } catch {
        return refuse('เบราว์เซอร์ไม่ยอมเล่นเสียงโดยไม่มีคลิก', 'No sound without a click')
      }
    }
    if (id === 'link') {
      if (held && !held.closed) {
        try {
          held.location.href = new URL('/handbook/actions', location.href).href
          return ok('พาหน้าต่างที่เปิดรอไว้ไปคู่มือแล้ว', 'Steered the window you held open to the handbook')
        } catch { /* fall through to the honest route */ }
      }
      if (spot) spot.hidden = false
      return refuse('เปิดหน้าต่างใหม่ได้เฉพาะตอนคลิก —กดลิงก์ที่หน้านี้เอง', 'A window opens only on a click — press the link on this page')
    }
    return refuse('ไม่รู้จักการกระทำนี้', 'Unknown action')
  }

  return {
    arm,
    disarm,
    fire,
    armed: () => armed,
  }
}
