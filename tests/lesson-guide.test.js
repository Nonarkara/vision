import { test } from 'node:test'
import assert from 'node:assert/strict'
import { lessonGuide } from '../public/js/train/lesson-guide.js'
const base = { mode:'supervised', counts:[0,0], learned:false, groups:null, pending:null, rounds:0, collecting:false, practice:true, names:['Busy road','Quiet road'], t:(_th,en)=>en }
const guide = overrides => lessonGuide({...base,...overrides})
test('supervised guide follows missing pictures, Learn, then unseen-picture check', () => {
  assert.match(guide({}).title,/3 more Busy road pictures/)
  assert.match(guide({counts:[2,0]}).title,/1 more Busy road picture$/)
  assert.match(guide({counts:[3,1]}).title,/2 more Quiet road pictures/)
  assert.equal(guide({counts:[3,3]}).step,1)
  assert.match(guide({counts:[3,3]}).help,/Press Learn/)
  assert.equal(guide({counts:[3,3],learned:true}).step,2)
  assert.match(guide({learned:true}).help,/before teaching/)
})
test('external camera instructions never ask for unavailable practice scene controls', () => {
  const help = guide({counts:[3,0],practice:false}).help
  assert.match(help,/Wait until the view matches/)
  assert.doesNotMatch(help,/scene|under the picture/)
})
test('unsupervised guide explains automatic capture without asking for labels', () => {
  assert.equal(guide({mode:'unsupervised',collecting:true}).step,1)
  assert.match(guide({mode:'unsupervised'}).help,/switches between both scenes/)
  assert.doesNotMatch(guide({mode:'unsupervised',practice:false}).help,/switches between both scenes/)
  assert.match(guide({mode:'unsupervised',groups:{}}).help,/light or camera angle/)
  assert.equal(guide({mode:'unsupervised',groups:{}}).step,2)
})
test('reward guide names the goal and the human rating step before another action', () => {
  assert.equal(guide({mode:'reinforcement'}).step,0)
  assert.equal(guide({mode:'reinforcement',pending:{}}).step,1)
  assert.equal(guide({mode:'reinforcement',rounds:1}).step,2)
  assert.match(guide({mode:'reinforcement'}).help,/alert for busy traffic; stay quiet/)
  assert.match(guide({mode:'reinforcement'}).help,/picture freezes/)
})
test('every guide state provides Thai, English and Chinese instructions', () => {
  for (const state of [{},{counts:[3,3]},{learned:true},{mode:'unsupervised'},{mode:'unsupervised',groups:{}},{mode:'reinforcement'},{mode:'reinforcement',pending:{}},{learned:true,testPending:{},review:{}},{learned:true,review:{},lastTest:{}},{sourceReady:false}]) {
    const t = (...values) => { assert.equal(values.length,3); values.forEach(v=>assert.ok(v?.length)); return values[1] }
    guide({...state,t})
  }
})

test('held and checked tests ask for the action currently possible', () => {
  const held = guide({learned:true,testPending:{},review:{}})
  assert.match(held.title,/Check this held picture/)
  assert.match(held.help,/Choose the true answer/)
  assert.doesNotMatch(held.help,/Change the picture|press.*Hold/)
  const checked = guide({learned:true,review:{},lastTest:{}})
  assert.match(checked.help,/Continue video/)
})

test('a missing picture asks for a source, not an impossible capture', () => {
 const state=guide({sourceReady:false})
 assert.match(state.title,/Wait for a picture/)
 assert.match(state.help,/buttons become available/)
})
