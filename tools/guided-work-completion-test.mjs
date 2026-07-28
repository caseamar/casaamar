import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('core/casa-action-orchestrator.js','utf8');
const page=fs.readFileSync('domain-intelligence.html','utf8');
const store=new Map();
const localStorage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
const sessionStorage={setItem(){},getItem(){return null}};
const context={window:{scrollY:0},localStorage,sessionStorage,fetch:async()=>({ok:true,json:async()=>({workspace_routes:{'guided-work':'/guided-work.html'}})}),URLSearchParams,location:{href:''},console,Date,setTimeout};
context.window=context;
vm.createContext(context);
vm.runInContext(source,context);
await context.CasaActionOrchestrator.load();
context.CasaActionOrchestrator.registerMany([
 {id:'a1',key:'a1',title:'A1',targetWorkspace:'guided-work',status:'ready'},
 {id:'a2',key:'a2',title:'A2',targetWorkspace:'guided-work',status:'ready'}
]);
context.CasaActionOrchestrator.startBatch(['a1','a2']);
localStorage.setItem('casa.action-completion',JSON.stringify({actionId:'a1',message:'done'}));
context.CasaActionOrchestrator.consumeCompletion();
if(context.CasaActionOrchestrator.batchProgress()?.remaining!==1) throw new Error('Batch skal fortsætte efter første opgave');
localStorage.setItem('casa.action-completion',JSON.stringify({actionId:'a2',message:'done'}));
context.CasaActionOrchestrator.consumeCompletion();
if(context.CasaActionOrchestrator.batchProgress()!==null) throw new Error('Batch skal afsluttes automatisk efter sidste opgave');
const receipt=context.CasaActionOrchestrator.consumeBatchCompletion();
if(!receipt||receipt.total!==2) throw new Error('Completion receipt mangler');
if(!/Alle \$\{batchDone\.total\} forbedringer er gennemført/.test(page)) throw new Error('Synlig completion summary mangler');
if(!/Gå til Udgivelsescenter/.test(page)) throw new Error('Næste skridt til Udgivelsescenter mangler');
console.log('Guided Work Automatic Completion: 6 kontroller bestået.');
