import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import vm from 'node:vm'

// Execute the actual page's source/permission and button ownership routines
// with controlled camera and audio promises. No hardware permissions involved.
const page=readFileSync(new URL('../public/js/pages/gesture.js',import.meta.url),'utf8')
const routines=page.slice(page.indexOf('function example(n)'),page.indexOf('function drawExample()'))
function room(){
 let grant, resume
 const camera=new Promise(r=>{grant=r}), soundResume=new Promise(r=>{resume=r})
 const calls=[]
 const context=vm.createContext({console,setTimeout:()=>1,clearTimeout(){},openWebcam:()=>camera,
   audioResume:()=>soundResume,calls,document:{hidden:false},performance:{now:()=>0}})
 vm.runInContext(`
 let mode='music',source=null,worker=null,opening=false,inputTicket=0,ticket=0,sound=false;
 let loadTimer,deadline,ready,busy,count,manual,notes=[];
 const $=()=>({disabled:false,hidden:false}); const trigger={reset(){}};
 const ink={clearRect(){}};const paint=()=>{};const drawExample=()=>{};const clearEffect=()=>{};const silence=()=>{};
 const message=()=>{}; const enableSound=()=>audioResume();const act=(n)=>calls.push(n);
 ${routines}
 globalThis.api={start,stop,example,state:()=>({ticket,sound,opening,source})};`,context)
 return {api:context.api,calls,grant,resume}
}
test('a number choice cancels an unresolved camera permission and closes a late grant',async()=>{
 const r=room();const pending=r.api.start();assert.equal(r.api.state().opening,true)
 r.api.example(1);let closed=0;r.grant({close(){closed++}});await pending
 assert.equal(closed,1);assert.equal(r.api.state().source,null)
 r.resume();await Promise.resolve();await Promise.resolve();assert.deepEqual(r.calls,[1])
})
test('Stop cancels a note awaiting audio activation',async()=>{
 const r=room();r.api.example(2);r.api.stop();r.resume();await Promise.resolve();await Promise.resolve()
 assert.deepEqual(r.calls,[])
})
test('muted number choices never enable sound themselves',async()=>{
 const r=room();r.api.example(3);assert.equal(r.api.state().sound,false)
 r.resume();await Promise.resolve();await Promise.resolve();assert.deepEqual(r.calls,[3])
})
