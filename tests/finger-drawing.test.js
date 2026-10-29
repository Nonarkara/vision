import {test} from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import {readFileSync} from 'node:fs'
import {brush} from '../public/js/gesture/screen.js'
const page=readFileSync(new URL('../public/js/pages/gesture.js',import.meta.url),'utf8')
function room(){
 const events=[],context=vm.createContext({brush,events})
 const drawing=page.slice(page.indexOf('function paintDrawing'),page.indexOf('function drawExample'))
 vm.runInContext(`let mode='draw',hands=[],tip=null;
 const pencil={clearRect:()=>events.push('clear'),beginPath(){},moveTo(){},lineTo(){},stroke:()=>events.push('stroke')};
 ${drawing}
 globalThis.api={paintDrawing,drawSample,hand:p=>hands=p?[Array.from({length:21},()=>p)]:[]};`,context)
 return {api:context.api,events}
}
test('a missing hand lifts the pen; a fist clears only when a hand exists',()=>{
 const r=room();r.api.hand(null);r.api.paintDrawing(0);assert.deepEqual(r.events,[])
 r.api.hand({x:.5,y:.5});r.api.paintDrawing(0);assert.deepEqual(r.events,['clear'])
})
test('drawing connects nearby fingertip positions and avoids cross-hand jumps',()=>{
 const r=room();r.api.hand({x:.2,y:.5});r.api.paintDrawing(1)
 r.api.hand({x:.25,y:.5});r.api.paintDrawing(1);assert.deepEqual(r.events,['stroke'])
 r.api.hand({x:.9,y:.5});r.api.paintDrawing(1);assert.deepEqual(r.events,['stroke'])
})
test('camera-free brush choices produce a real sample stroke at all ten widths',()=>{
 for(let n=1;n<=10;n++){const r=room();r.api.drawSample(n);assert.deepEqual(r.events,['clear','stroke'])}
})
