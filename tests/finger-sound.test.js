import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createInstrument,voice,MAX_VOICES} from '../public/js/gesture/sound.js'
function setup(t,{suspend=false}={}) {
 const prior=globalThis.window,contexts=[]
 t.after(()=>{if(prior===undefined)delete globalThis.window;else globalThis.window=prior})
 class Audio {
  state=suspend?'suspended':'running';currentTime=0;nodes=[];destination={}
  constructor(){contexts.push(this)}
  async resume(){await Promise.resolve();await this.pending;this.state='running'}
  async close(){this.state='closed'}
  node(){const n={disconnected:false,ended:false,connect(){return this},disconnect(){this.disconnected=true},frequency:{setValueAtTime(){},exponentialRampToValueAtTime(){}},gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},Q:{},start(){},stop(at){if(at===undefined&&!this.ended){this.ended=true;this.onended?.()}}};this.nodes.push(n);return n}
  createGain(){return this.node()};createBiquadFilter(){return this.node()};createOscillator(){const n=this.node();n.osc=true;return n}
 }
 globalThis.window={AudioContext:Audio}
 return {contexts}
}
test('struck note includes bounded attack/decay and three harmonic partials',()=>{
 const v=voice(440);assert.deepEqual(v.partials.map(p=>p.hz),[440,880,1320]);assert.ok(v.attack>0&&v.attack<.03);assert.ok(v.decay<1);assert.ok(v.filterFrom>v.filterTo)
})
test('rapid notes stay bounded and Stop disconnects every oscillator and gain',async t=>{
 const f=setup(t),i=createInstrument();await i.ready()
 for(let n=0;n<20;n++)i.note(440)
 assert.equal(f.contexts[0].nodes.filter(n=>n.osc&&!n.disconnected).length,MAX_VOICES*3)
 i.stop();assert.ok(f.contexts[0].nodes.every(n=>n.disconnected));i.close();assert.equal(f.contexts[0].state,'closed')
})
test('natural note completion disconnects all voice nodes',async t=>{
 const f=setup(t),i=createInstrument();await i.ready();i.note(261.6)
 for(const n of f.contexts[0].nodes.filter(n=>n.osc))n.onended()
 assert.ok(f.contexts[0].nodes.every(n=>n.disconnected));i.close()
})
test('late rejection from a closed context cannot discard a newer working context',async t=>{
 const f=setup(t,{suspend:true}),i=createInstrument()
 let reject;const oldReady=i.ready();f.contexts[0].pending=new Promise((_,r)=>{reject=r})
 // Resume must see the controlled promise before it resolves.
 i.close();const fresh=i.ready();await fresh
 reject(new Error('old resume failed'));await oldReady
 assert.equal(i.running(),true);assert.ok(i.note(440));i.close()
})
test('invalid notes do not allocate nodes or play while audio is closed',async t=>{
 const f=setup(t),i=createInstrument();assert.equal(i.note(440),null);await i.ready()
 for(const n of [0,-1,NaN,Infinity])assert.equal(i.note(n),null)
 assert.equal(f.contexts[0].nodes.length,0);i.close();assert.equal(i.note(440),null)
})
