import fs from 'node:fs';import vm from 'node:vm';import path from 'node:path';
const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const store=new Map();const localStorage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
const sessionStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};
const window={scrollY:0,localStorage,sessionStorage,location:{href:''}};
const context={window,localStorage,sessionStorage,location:window.location,URLSearchParams,fetch:async()=>({ok:true,json:async()=>({workspace_routes:{'guided-work':'/guided-work.html'}})}),console,Date,JSON,setTimeout,clearTimeout};vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,'core/casa-action-orchestrator.js'),'utf8'),context);
const o=context.window.CasaActionOrchestrator;await o.load();
o.registerMany([{id:'action.old',key:'old',title:'Old completed task',source:'domain-impact',status:'completed',targetWorkspace:'guided-work'}]);
if(o.snapshot().completed!==1)throw new Error('Test precondition failed');
const reset=o.resetSource('domain-impact');if(reset.removed!==1||o.list().length!==0)throw new Error('New analysis did not clear stale completed impact actions');
o.registerMany([{id:'action.new',key:'new',title:'New task',source:'domain-impact',status:'ready',targetWorkspace:'guided-work'}]);
if(o.snapshot().ready!==1)throw new Error('New analysis did not create a ready action');
const html=fs.readFileSync(path.join(root,'domain-intelligence.html'),'utf8');
for(const required of ["addEventListener('click',runImpactAnalysis)","CasaActionOrchestrator.resetSource('domain-impact')","Analysen er startet","Prøv igen","document.querySelector('.executeAction')"]){if(!html.includes(required))throw new Error(`Missing primary CTA runtime safeguard: ${required}`)}
console.log('Primary CTA runtime test: stale-state reset, ready action, binding, feedback and terminal-state safeguards passed');
