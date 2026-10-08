import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createSession, faceSignals } from '../public/js/focus/session.js'
const baseline = { yaw:0, pitch:0, gaze:0 }
const face = { ...baseline, eyes:0 }
test('counts sustained look-away episodes once, and distinguishes missing faces', () => {
  const s=createSession({threshold:3})
  for(let i=0;i<=20;i++) s.observe({...face,yaw:0.6},baseline,i*500)
  assert.equal(s.data.awayEvents,1)
  assert.equal(s.data.absentEvents,0)
  s.observe(face,baseline,10500)
  for(let i=22;i<=32;i++) s.observe(null,baseline,i*500)
  assert.equal(s.data.absentEvents,1)
  for(let i=33;i<=45;i++) s.observe({...face,yaw:0.6},baseline,i*500)
  assert.equal(s.data.awayEvents,2)
})
test('brief blinks do not become long closures and paused or suspended time is excluded', () => {
  const s=createSession(); s.observe(face,baseline,0)
  s.observe({...face,eyes:0.9},baseline,500); s.observe(face,baseline,1000)
  assert.equal(s.data.eyeEvents,0)
  for(let i=3;i<=8;i++) s.observe({...face,eyes:0.9},baseline,i*500)
  assert.equal(s.data.eyeEvents,1)
  const before=s.data.observed; s.gap(); s.observe(face,baseline,3600000)
  assert.equal(s.data.observed,before)
  s.observe(null,baseline,7200000)
  assert.equal(s.data.observed,before)
  assert.equal(s.data.absentEvents,0)
})
test('personal calibration changes look-away threshold; multiple faces yield no individual signal', () => {
  const s=createSession(); const own={yaw:0.6,pitch:0.2,gaze:0.1}
  assert.equal(s.observe({...face,...own},own,0).state,'facing')
  assert.equal(s.observe({...face,yaw:1.1},own,500).state,'away')
  assert.equal(faceSignals({faceLandmarks:[[],[]]}),null)
  assert.equal(faceSignals({faceLandmarks:[]}),null)
})
test('summaries stay bounded over an eight-hour session and mood is self-reported', () => {
  const s=createSession()
  for(let i=0;i<=28800;i++) s.observe(face,baseline,i*1000)
  assert.ok(s.data.timeline.length<=481)
  for(let i=0;i<200;i++) s.mood('okay')
  assert.equal(s.data.moods.length,100)
  assert.equal(s.data.awayEvents,0)
})
