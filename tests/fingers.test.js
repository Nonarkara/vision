import { test } from 'node:test'
import assert from 'node:assert/strict'
import { countHand, createCountTrigger, NOTES, saturation } from '../public/js/gesture/fingers.js'

// Joint geometry in palm-relative metres. Deliberately not screenshot-up:
// mirror and rotate fixtures to ensure the counter works for either hand.
function hand(raised) {
  const p = Array.from({ length: 21 }, () => ({ x: 0, y: 0, z: 0 }))
  p[0] = {x:0,y:0,z:0}
  p[1] = {x:-.2,y:.15,z:0}; p[2] = {x:-.4,y:.3,z:0}; p[3] = {x:-.6,y:.45,z:0}; p[4] = {x:-1.1,y:.825,z:0}
  if (raised < 5) { p[3]={x:-.25,y:.5,z:0}; p[4]={x:0,y:.4,z:0} }
  for (const [j, base] of [5,9,13,17].entries()) {
    const x = j * .3
    p[base]={x,y:1,z:0}; p[base+1]={x,y:1.4,z:0}
    p[base+2]={x,y:1.7,z:0}; p[base+3]={x,y:2,z:0}
    if (j >= raised) { p[base+2]={x,y:1.1,z:.2};p[base+3]={x,y:.9,z:.2} }
  }
  return p
}
test('count all zero to five extensions, independent of rotation and handedness', () => {
  for (let n=0;n<=5;n++) for (const angle of [0,Math.PI/2,Math.PI]) for (const mirror of [-1,1]) {
    const p=hand(n).map(p=>({x:mirror*(p.x*Math.cos(angle)-p.y*Math.sin(angle)),y:p.x*Math.sin(angle)+p.y*Math.cos(angle),z:p.z}))
    assert.equal(countHand(p),n,`count ${n} at ${angle}, mirror ${mirror}`)
  }
})
test('invalid/absent landmarks never manufacture a finger', () => {
  assert.equal(countHand([]),0);assert.equal(countHand(null),0)
  const p=hand(5);p[3].x=NaN;assert.equal(countHand(p),0)
})
test('two open palms support ten fingers and seven uses both hands',()=>{
  assert.equal(countHand(hand(5))+countHand(hand(5)),10)
  assert.equal(countHand(hand(5))+countHand(hand(2)),7)
})
test('color endpoints and all ten intermediate steps are linear',()=>{
  assert.equal(saturation(1),1);assert.equal(saturation(10),0)
  for(let n=2;n<=10;n++) assert.ok(Math.abs(saturation(n-1)-saturation(n)-1/9)<1e-10)
  assert.equal(saturation(99),0);assert.equal(saturation(-2),1)
})
test('music spans one diatonic octave in eight ascending notes',()=>{
  assert.equal(NOTES.length,8);assert.ok(Math.abs(NOTES[7]/NOTES[0]-2)<.000001)
  for(let i=1;i<8;i++) assert.ok(NOTES[i]>NOTES[i-1])
})
test('a held count fires once; a brief dropout cannot retrigger it',()=>{
  const c=createCountTrigger()
  assert.equal(c.update(1,0),null);assert.equal(c.update(1,120),1)
  assert.equal(c.update(1,900),null)
  c.update(0,910);c.update(1,950);assert.equal(c.update(1,1080),null)
})
test('release then repeat supports quick rhythmic notes without a long cooldown',()=>{
  const c=createCountTrigger()
  c.update(2,0);assert.equal(c.update(2,120),2)
  c.update(0,130);c.update(0,250);c.update(2,260);assert.equal(c.update(2,380),2)
  c.update(3,390);assert.equal(c.update(3,510),3)
  c.reset();c.update(3,520);assert.equal(c.update(3,640),3)
})

test('real MediaPipe landmarks from public pointing and victory examples count one and two',async()=>{
 const {readFile}=await import('node:fs/promises')
 const fixtures=JSON.parse(await readFile(new URL('./fixtures/hand-landmarks.json',import.meta.url),'utf8'))
 for(const f of fixtures)assert.equal(countHand(f.points),f.expected)
})
