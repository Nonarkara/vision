import {test} from 'node:test'
import assert from 'node:assert/strict'
import {fade,fadeCss,brush,noteStrip,fall,pulse} from '../public/js/gesture/screen.js'
test('color and brush mappings have real endpoints and progress monotonically',()=>{
 assert.equal(fade(1).saturate,1);assert.equal(fade(10).saturate,0)
 assert.match(fadeCss(10),/saturate\(0.000\)/)
 for(let n=2;n<=10;n++){assert.ok(fade(n).saturate<fade(n-1).saturate);assert.ok(brush(n)>brush(n-1))}
 assert.equal(brush(1),2);assert.ok(Math.abs(brush(10)-25.4)<1e-9)
})
test('rhythm strip retains only recent notes and bounds long and negative time gaps',()=>{
 const events=Array.from({length:100},(_,i)=>({name:String(i),at:i*2000}))
 const strip=noteStrip(events);assert.equal(strip.length,12);assert.equal(strip[0].name,'88');assert.equal(strip[0].gap,0);assert.equal(strip[1].gap,1)
 assert.equal(noteStrip([{at:20},{at:0}])[1].gap,0)
})
test('paper falls, and a note pulse expires without growing forever',()=>{
 const p={x:20,y:0,vx:2,vy:20,spin:3,phase:0,w:8,h:14}
 assert.ok(fall(p,2).y>fall(p,1).y);assert.ok(fall(p,2).w<=8)
 assert.equal(pulse(10).alpha,0);assert.equal(pulse(10).radius,pulse(.9).radius)
})
