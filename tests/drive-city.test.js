import {test} from 'node:test'
import assert from 'node:assert/strict'
import {buildTrack,at,STEP} from '../public/js/drive/track.js'
import {createWorld,step,DT} from '../public/js/drive/sim.js'
import {tickSignals,queues} from '../public/js/drive/control.js'
import {stepStreet} from '../public/js/drive/street.js'
import {projectFace} from '../public/js/drive/perspective.js'
import {decide} from '../public/js/drive/decide.js'
import {ASOK} from '../public/js/drive/asok.js'
import fs from 'node:fs'

test('continuous route poses move below the half-metre sample spacing and wrap continuously',()=>{
 const {A}=buildTrack('two');const a=at(A,40),b=at(A,40.05)
 assert.ok(Math.hypot(a.x-b.x,a.y-b.y)>.04)
 assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<.06)
 const c=at(A,A.len-.01),d=at(A,.01)
 assert.ok(Math.hypot(c.x-d.x,c.y-d.y)<STEP)
 assert.ok(Number.isFinite(at(A,-1).h))
})
test('footway walkers keep a walking pace after hours, rather than integrating absolute time',()=>{
 const w=createWorld({layout:'city'}), walkers=w.street.items.filter(o=>o.walker)
 assert.ok(walkers.length)
 const initial=walkers.map(o=>[o.x,o.y]);stepStreet(w.street,w)
 for(const [i,o]of walkers.entries())assert.ok(Math.hypot(o.x-initial[i][0],o.y-initial[i][1])<1e-8,'no first-frame jump')
 for(const t of [0,1,120,7200]){
  w.t=t;stepStreet(w.street,w);const before=walkers.map(o=>[o.x,o.y])
  w.t=t+DT;stepStreet(w.street,w)
  for(const [i,o] of walkers.entries())assert.ok(Math.hypot(o.x-before[i][0],o.y-before[i][1])<.15)
 }
})
test('responsive lights bound green time, preserve clearance and never give conflicting greens',()=>{
 const w=createWorld({layout:'asok',control:'responsive',traffic:32})
 // A standing queue in A; no queue in B.
 w.cars.forEach(c=>{c.v=10})
 const c=w.cars.find(c=>c.route.lightGroup==='A');c.v=0;c.s=c.route.stopS-5
 assert.deepEqual(queues(w),{A:1,B:0})
 let prior=0,last=0;const spans=[]
 for(let i=0;i<1200;i++){
  tickSignals(w,.1)
  assert.ok(!(w.light.A==='green'&&w.light.B==='green'))
  assert.equal(w.controlState.green,w.light.A==='green'?'A':w.light.B==='green'?'B':null)
  if(w.phase!==prior){spans.push([prior,(i+1)*.1-last]);last=(i+1)*.1;prior=w.phase}
 }
 assert.ok(spans.some(([p,t])=>p===0&&t>=17.9&&t<18.2))
 assert.ok(spans.some(([p,t])=>p===3&&t>=8.9&&t<9.2),'opposing side is served')
 for(const[p,t]of spans){if([1,4].includes(p))assert.ok(Math.abs(t-2.5)<.11);if([2,5].includes(p))assert.ok(Math.abs(t-1.5)<.11)}
})
test('clear-exit rule uses the selected car’s tracks and disappears when its camera is covered',()=>{
 const w=createWorld({layout:'practice',keepClear:true,people:'none',dogs:'none'})
 const c=w.cars[0];c.s=c.route.stopS-12;Object.assign(c,at(c.route,c.s));c.v=5;c.tracks.clear()
 const p=at(c.route,c.route.stopS+12),o={...p,id:999,kind:'car',v:0,frozen:0,dims:{L:4.4,W:1.8,H:1.5}}
 c.tracks.set(o.id,{obj:o,last:w.t,confidence:1});w.light.A='green'
 assert.equal(decide(c,w).reason,'blocked_exit')
 o.frozen=3;assert.equal(decide(c,w).reason,'blocked_exit','crashed cars still occupy the exit')
 c.blind=true;assert.notEqual(decide(c,w).reason,'blocked_exit')
 c.blind=false;c.tracks.clear();assert.notEqual(decide(c,w).reason,'blocked_exit')
})
test('Asok geometry is reproducible with source, scale and explicit modelling assumptions',()=>{
 const data=JSON.parse(fs.readFileSync(new URL('../public/data/asok-study.json',import.meta.url)))
 assert.deepEqual(data.routes,ASOK);assert.match(data.source,/openstreetmap/);assert.match(data.note,/assum|illustrat|teaching/i)
 const track=buildTrack('asok');assert.equal(Object.keys(track).length,6)
 for(const r of Object.values(track)){assert.ok(['A','B'].includes(r.lightGroup));assert.ok(r.stopS>0&&r.stopS<r.len);assert.ok(!at(r,r.stopS).junction);for(const p of r.pts)assert.ok(Number.isFinite(p.x+p.y+p.h))}
})
test('near-plane clipping keeps the visible part of a passing vehicle finite',()=>{
 const view={x:0,y:0,h:0};const face=[{x:1,y:-1,z:0},{x:3,y:-1,z:0},{x:3,y:1,z:1},{x:1,y:1,z:1}]
 const p=projectFace(view,face,800,450);assert.equal(p.length,4);assert.ok(p.every(p=>Number.isFinite(p.x+p.y)&&p.depth>=1.8-1e-9))
 assert.deepEqual(projectFace(view,face.map(p=>({...p,x:p.x-5})),800,450),[])
})

test('stopped vehicle-time includes crash downtime',()=>{
 const w=createWorld({layout:'two',people:'none',dogs:'none'});w.cars.forEach(c=>{c.frozen=3;c.v=0})
 step(w);assert.ok(Math.abs(w.statistics.stoppedSeconds-w.cars.length*DT)<1e-9)
})

test('Asok clear-exit looks beyond the conflict zone, not just beyond the stop line',()=>{
 const w=createWorld({layout:'asok',keepClear:true});const c=w.cars[0],r=c.route
 assert.ok(r.exitS>r.stopS+25);assert.ok(!at(r,r.exitS).junction)
 c.s=r.stopS-12;Object.assign(c,at(r,c.s));c.v=5;c.tracks.clear();w.light.A='green'
 const p=at(r,r.exitS+2),obj={...p,route:r,s:r.exitS+2,id:999,kind:'car',v:0,frozen:0,dims:{L:4.4,W:1.8,H:1.5}}
 c.tracks.set(obj.id,{obj,last:w.t,confidence:1})
 assert.equal(decide(c,w).reason,'blocked_exit')
})
