// Observable signals only. Counts are sustained episodes, never frame counts.
export function faceSignals(result) {
  if (result.faceLandmarks?.length !== 1) return null
  const categories = result.faceBlendshapes?.[0]?.categories ?? []
  const b = Object.fromEntries(categories.map((c) => [c.categoryName, c.score]))
  const m = result.facialTransformationMatrixes?.[0]?.data
  if (!m || m.length !== 16) return null
  return {
    yaw: Math.atan2(m[8], m[10]), pitch: Math.atan2(-m[9], Math.hypot(m[8], m[10])),
    gaze: ((b.eyeLookOutLeft ?? 0) + (b.eyeLookInRight ?? 0) - (b.eyeLookInLeft ?? 0) - (b.eyeLookOutRight ?? 0)) / 2,
    eyes: ((b.eyeBlinkLeft ?? 0) + (b.eyeBlinkRight ?? 0)) / 2,
    smile: ((b.mouthSmileLeft ?? 0) + (b.mouthSmileRight ?? 0)) / 2,
    jaw: b.jawOpen ?? 0, brow: b.browInnerUp ?? 0,
  }
}
export function createSession({ threshold = 3 } = {}) {
  let last = null, candidate = null, candidateTime = 0, counted = false
  const data = { observed: 0, facing: 0, away: 0, absent: 0, eyes: 0, awayEvents: 0, absentEvents: 0, eyeEvents: 0, samples: 0, timeline: [], moods: [] }
  let closedTime = 0, closedCounted = false
  return {
    data,
    gap() { last = null; candidate = null; candidateTime = 0; counted = false; closedTime = 0; closedCounted = false },
    observe(signal, baseline, now) {
      const raw = last == null ? 0 : Math.max(0, (now - last) / 1000)
      last = now
      if (raw > 2.5) { closedTime = 0; closedCounted = false }
      const dt = raw <= 2.5 ? raw : 0 // suspended tab/device is unobserved
      const state = !signal ? 'absent' : (Math.abs(signal.yaw - baseline.yaw) > 0.35 || Math.abs(signal.pitch - baseline.pitch) > 0.3 || Math.abs(signal.gaze - baseline.gaze) > 0.45) ? 'away' : 'facing'
      data.samples++; data.observed += dt; data[state] += dt
      if (candidate !== state || !dt) { candidate = state; candidateTime = 0; counted = false }
      candidateTime += dt
      if (state !== 'facing' && candidateTime >= threshold && !counted) { data[state === 'away' ? 'awayEvents' : 'absentEvents']++; counted = true }
      if (signal && signal.eyes > 0.65) {
        data.eyes += dt; closedTime += dt
        if (closedTime >= 1 && !closedCounted) { data.eyeEvents++; closedCounted = true }
      } else { closedTime = 0; closedCounted = false }
      const minute = Math.floor(data.observed / 60)
      let bucket = data.timeline[minute]
      if (!bucket && minute < 481) bucket = data.timeline[minute] = { minute, facing: 0, away: 0, absent: 0 }
      if (bucket) bucket[state] += dt
      return { state, sustained: candidateTime >= threshold }
    },
    mood(value) { if (data.moods.length < 100) data.moods.push({ observedSeconds: Math.round(data.observed), value }) },
  }
}
