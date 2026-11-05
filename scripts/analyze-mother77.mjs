// Reproducible descriptive analysis of retained artifacts, not participant data.
import fs from 'node:fs'
import crypto from 'node:crypto'
import { referenceFrames } from '../public/js/evaluation/reference.js'
import { evaluate } from '../public/js/evaluation/metrics.js'
const records = [
 ['R1','2026-10-20','READABILITY-2026-10-20.md','Accessibility','Inert language controls','Shared navigation boot and readable multilingual text','Shared navigation boot added to the head.'],
 ['R2','2026-10-20','RESEARCH-OPENING-2026-10-20.md','Spatial composition','Catalogue counts competed with the visual lesson','Lesson first; catalogue details on demand','camera\ncatalogue counts and scattered links competed with the visual lesson.'],
 ['R3','2026-10-23','CHROME-2026-10-23.md','Spatial composition','Repeated navigation and instructions delayed the teaching action','One 44px rail and action beside picture','That action started at y=1233 on the phone'],
 ['R4','2026-10-29','GESTURE-2026-10-29.md','State and action','Idle source labelled Studying; action readiness unclear','Instruction derived from source and example readiness','The next-step instruction is derived from actual picture/example readiness.'],
 ['R5','2026-10-30','PAGE-BLEED-2026-10-30.md','Spatial composition','Picture separated from source/actions by bands','Regroup instruments and remove empty gallery demand','two empty thumbnail strips each reserved52px'],
 ['R6','2026-11-03','STICKER-LESSON-2026-11-03.md','Concept explanation','Need a concrete explanation of three learning methods','Actual sticker-teaching film with method comparison','194.733s'],
 ['R7','2026-11-03','DRIVE-MSH-2026-11-03.md','Spatial composition','Road hidden behind an unrelated teaching exercise','Road first; optional exercise retained','first-screen gate occupied792 px'],
 ['R8','2026-11-03','GLANCE-GRID-2026-11-03.md','Spatial composition','Picture, explanation and next action separated','Picture leads to adjacent explanation and action','next link872px down'],
].map(([id,date,file,primaryTheme,problem,response,anchor])=>{
 const source='ops/'+file, text=fs.readFileSync(source,'utf8')
 if(!text.includes(anchor)) throw Error(`Evidence anchor missing: ${id}`)
 return {id,date,source,primaryTheme,problem,response,anchor,sha256:crypto.createHash('sha256').update(text).digest('hex')}
})
const geometry = [
 {source:'R3',item:'Teach: closed top chrome',width:390,height:844,before:145,after:44},
 {source:'R3',item:'Teach: first teaching action y',width:390,height:844,before:1233,after:672},
 {source:'R8',item:'Home: picture y',width:390,height:844,before:328,after:117},
 {source:'R8',item:'Home: next lesson link y',width:390,height:844,before:872,after:556},
].map(r=>({...r,recoveredPx:r.before-r.after,reductionPct:Math.round(1000*(r.before-r.after)/r.before)/10}))
const exportPath='docs/evaluation/ssdlite-synthetic-baseline.json', report=JSON.parse(fs.readFileSync(exportPath,'utf8'))
const result=evaluate(referenceFrames().filter(f=>f.split==='evaluation'),report.records)
const output={schema:1,analysisDate:'2026-11-06',period:'2026-10-20 to 2026-11-03',studyStatus:'Artifact analysis completed; participant study proposed, not conducted.',selection:'Eight purposively selected, retained UX audit records. One author-assigned primary theme per document; not an exhaustive feedback corpus or independent qualitative coding.',participantLearningDataset:null,participantOutcomes:null,records,themeCounts:Object.fromEntries([...new Set(records.map(r=>r.primaryTheme))].map(t=>[t,records.filter(r=>r.primaryTheme===t).length])),geometry,synthetic:{source:exportPath,generatedAt:report.generatedAt,sha256:crypto.createHash('sha256').update(fs.readFileSync(exportPath)).digest('hex'),...result,limitation:report.limitation,interpretation:'Regression fixture result only. Not real-camera accuracy, a current device benchmark, or evidence of human learning.'}}
fs.writeFileSync('public/papers/mother77-data.json',JSON.stringify(output,null,2)+'\n')
console.log(JSON.stringify({records:records.length,themes:output.themeCounts,geometry,synthetic:{completed:result.completed,tp:result.tp,fp:result.fp,fn:result.fn,medianMs:result.medianMs,p95Ms:result.p95Ms}},null,2))
