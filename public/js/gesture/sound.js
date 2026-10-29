// A bounded struck-string voice. All contexts and nodes belong to this tab.
export const PARTIALS = [{ ratio: 1, gain: 1 }, { ratio: 2, gain: 0.34 }, { ratio: 3, gain: 0.15 }]
export const MAX_VOICES = 4
export function voice(freq, { peak = 0.14, decay = 0.62, close = 0.22 } = {}) {
  return { freq, peak, decay, close, attack: 0.012,
    partials: PARTIALS.map(p => ({ hz: freq * p.ratio, gain: p.gain })),
    filterFrom: Math.min(8000, freq * 9), filterTo: Math.max(240, freq * 1.6) }
}
export function createInstrument() {
  let ctx = null, generation = 0
  const live = new Set()
  async function ready() {
    let requested
    const id = generation
    try {
      const Audio = window.AudioContext || window.webkitAudioContext
      if (!Audio) return false
      ctx ??= new Audio()
      requested = ctx
      if (requested.state !== 'running') await requested.resume()
      return id === generation && requested === ctx && requested.state === 'running'
    } catch {
      if (id === generation && requested === ctx) {
        ctx = null
        requested?.close?.().catch(() => {})
      }
      return false
    }
  }
  function release(struck, stop = false) {
    if (!live.delete(struck)) return
    for (const osc of struck.oscs) {
      if (stop) { try { osc.stop() } catch { /* already ended */ } }
      osc.disconnect()
    }
    for (const gain of struck.gains) gain.disconnect()
    struck.out.disconnect(); struck.filter.disconnect()
  }
  function note(freq) {
    if (!ctx || ctx.state !== 'running' || !Number.isFinite(freq) || freq <= 0) return null
    if (live.size >= MAX_VOICES) release(live.values().next().value, true)
    const v = voice(freq), now = ctx.currentTime
    const filter = ctx.createBiquadFilter(), out = ctx.createGain()
    filter.type = 'lowpass'; filter.Q.value = 0.6
    filter.frequency.setValueAtTime(v.filterFrom, now)
    filter.frequency.exponentialRampToValueAtTime(v.filterTo, now + v.close)
    out.gain.value = v.peak; out.connect(filter); filter.connect(ctx.destination)
    const struck = { oscs: [], gains: [], out, filter }
    live.add(struck)
    let remaining = v.partials.length
    for (const p of v.partials) {
      const osc = ctx.createOscillator(), gain = ctx.createGain()
      osc.type = 'sine'; osc.frequency.value = p.hz
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(p.gain, now + v.attack)
      gain.gain.exponentialRampToValueAtTime(0.0008, now + v.attack + v.decay)
      osc.connect(gain); gain.connect(out)
      struck.oscs.push(osc); struck.gains.push(gain)
      osc.onended = () => { if (--remaining === 0) release(struck) }
      osc.start(now); osc.stop(now + v.attack + v.decay + 0.05)
    }
    return v
  }
  function stop() { for (const struck of [...live]) release(struck, true) }
  return { ready, note, stop, running: () => ctx?.state === 'running',
    close() { generation++; stop(); const old = ctx; ctx = null; old?.close?.().catch(() => {}) } }
}
