import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import vm from 'node:vm'

// Execute the actual page's source/permission and button ownership routines
// with controlled camera and audio promises. No hardware permissions involved.
const page=readFileSync(new URL('../public/js/pages/gesture.js',import.meta.url),'utf8')
const routines=page.slice(page.indexOf('function example(n)'),page.indexOf('/** The finger paints'))
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
 const ink={clearRect(){}};const paint=()=>{};const drawExample=()=>{};const clearEffect=()=>{};const silence=()=>{}; const pencil={clearRect(){}};const instrument={stop(){}};let hands=[],tip=null,pulses=[];
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

test('returning from browser back-cache restarts drawing and leaves a fresh audio context available',()=>{
 const events={}, calls=[]
 const context=vm.createContext({events,calls,window:{addEventListener:(name,fn)=>{events[name]=fn}},
   IntersectionObserver:class {observe(){calls.push('observe')}disconnect(){calls.push('disconnect')}},
   requestAnimationFrame:()=>{calls.push('animate');return 1},cancelAnimationFrame:()=>calls.push('cancel')})
 const tail=page.slice(page.indexOf('const observer ='))
 vm.runInContext(`let visible=true,inputTicket=0,animation=0;const $=()=>({});
 const trigger={reset(){}};const silence=()=>{}; const pencil={clearRect(){}};const instrument={stop(){}};let hands=[],tip=null,pulses=[];const clearEffect=()=>{};
 const message=()=>calls.push('camera off');const stop=()=>calls.push('stop');const frame=()=>{};const onLang=()=>{};const paint=()=>{};const drawExample=()=>{};
 instrument.close=()=>calls.push('close audio');
 ${tail}
`,context)
 calls.length=0;events.pagehide()
 assert.deepEqual(calls,['stop','cancel','disconnect','close audio'])
 calls.length=0;events.pageshow({persisted:true});assert.deepEqual(calls,['camera off','observe','animate'])
 calls.length=0;events.pageshow({persisted:false});assert.deepEqual(calls,[])
})

test('mute suppresses the actual music action after audio has already started',()=>{
 const calls=[],context=vm.createContext({calls,performance:{now:()=>10}})
 const act=page.slice(page.indexOf('function act(n'),page.indexOf('function example(n)'))
 vm.runInContext(`let mode='music',sound=true,count=null,manual=false,source=null,hands=[],pulses=[],history=[];
 const instrument={note:n=>calls.push(n)};const NOTES=[261.6,293.7];const $=()=>({hidden:true});
 const paint=()=>{};const clearEffect=()=>{};const reduced=()=>false;const labelFor=n=>String(n);
 ${act}
 act(1,true);sound=false;act(2,true);
 globalThis.historyCount=history.length;`,context)
 assert.deepEqual(calls,[261.6]);assert.equal(context.historyCount,2)
})

test('late failed audio setup cannot mute a newer successful setup',async()=>{
 let finish;const pending=new Promise(r=>{finish=r})
 const context=vm.createContext({document:{hidden:false},pending})
 const routine=page.slice(page.indexOf('async function enableSound()'),page.indexOf('function paintSound()'))
 vm.runInContext(`let sound=true,inputTicket=0;const instrument={ready:()=>pending,stop(){}};const paintSound=()=>{};const message=()=>{};
 ${routine}
 globalThis.waiting=enableSound();inputTicket++;globalThis.isSound=()=>sound;`,context)
 finish(false);await context.waiting;assert.equal(context.isSound(),true)
})

test('switching a live camera to pointer drawing states that the camera is off',()=>{
 const events={},messages=[],context=vm.createContext({events,messages})
 const input=page.slice(page.indexOf('// Pointer input'),page.indexOf("$('[data-camera]').addEventListener"))
 vm.runInContext(`let mode='draw',opening=false,source={},worker=null,manual=false,count=1,tip=null,pointer=null;
 const pencil={clearRect(){}};const $=()=>({hidden:false,addEventListener(){}});
 const drawn={addEventListener:(name,fn)=>events[name]=fn,getBoundingClientRect:()=>({left:0,top:0,width:100,height:100}),setPointerCapture(){}};
 const paint=()=>{};const stop=()=>{source=null};const message=(th,en)=>messages.push(en);
 ${input}
 events.pointerdown({clientX:10,clientY:20,pointerId:1});globalThis.cameraNow=source;`,context)
 assert.equal(context.cameraNow,null);assert.match(messages[0],/Camera off/)
})
