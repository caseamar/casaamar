(()=>{
'use strict';
const VERSION="1.0.0", REGISTRY="/registry/workspace-context.json";let registry=null;const listeners=new Set();
const clone=x=>JSON.parse(JSON.stringify(x));const now=()=>new Date().toISOString();
const fetchJson=async p=>{const r=await fetch(`${p}?_=${Date.now()}`,{cache:'no-store'});if(!r.ok)throw new Error(`Workspace Context registry kunne ikke indlæses (${r.status})`);return r.json()};
const key=()=>registry?.storage?.key||'casa:workspace-context:v1';
const read=()=>{try{const x=JSON.parse(sessionStorage.getItem(key())||'null');if(!x)return null;if(x.expiresAt&&Date.parse(x.expiresAt)<Date.now()){sessionStorage.removeItem(key());return null}return x}catch(_){return null}};
const validate=input=>{if(!registry)throw new Error('Workspace Context er ikke initialiseret');const allowed=new Set(registry.allowed_fields);for(const k of Object.keys(input||{}))if(!allowed.has(k)&&!['schemaVersion','updatedAt','expiresAt'].includes(k))throw new Error(`Ukendt workspace-felt: ${k}`);const solution=(registry.solutions||[]).find(x=>x.id===input.solutionId);if(!solution)throw new Error(`Ukendt løsning: ${input.solutionId}`);if(input.domainId!==solution.domainId)throw new Error('Løsning og domæne er ikke konsistente');return true};
const persist=(ctx,eventType='workspace.contextupdated')=>{validate(ctx);const ttl=(registry.storage.ttl_minutes||480)*60000;const next={...ctx,schemaVersion:'1.0',updatedAt:now(),expiresAt:new Date(Date.now()+ttl).toISOString()};sessionStorage.setItem(key(),JSON.stringify(next));listeners.forEach(fn=>fn(clone(next)));window.dispatchEvent(new CustomEvent('casa:workspace-context:changed',{detail:clone(next)}));window.CasaEvents?.publish?.(eventType,{workspace_id:next.workspaceId,solution_id:next.solutionId,domain_id:next.domainId});return clone(next)};
const load=async()=>{if(!registry)registry=await fetchJson(REGISTRY);let ctx=read();if(!ctx)ctx=persist({...registry.default_context},'workspace.contextcreated');window.dispatchEvent(new CustomEvent('casa:workspace-os:ready',{detail:{version:VERSION,context:clone(ctx)}}));return snapshot()};
const get=()=>clone(read()||registry?.default_context||{});
const update=patch=>persist({...get(),...patch},patch.solutionId?'workspace.selectionchanged':'workspace.contextupdated');
const selectSolution=id=>{const s=(registry.solutions||[]).find(x=>x.id===id);if(!s||s.status!=='active')throw new Error('Løsningen er ikke aktiv');return update({solutionId:s.id,domainId:s.domainId,activeEntity:{type:'solution',id:s.id}})};
const clear=()=>{sessionStorage.removeItem(key());window.CasaEvents?.publish?.('workspace.contextcleared',{workspace_id:'primary'});return true};
const subscribe=fn=>{listeners.add(fn);return()=>listeners.delete(fn)};
const snapshot=()=>({version:VERSION,loaded:!!registry,context:get(),solutions:clone(registry?.solutions||[]),rules:clone(registry?.rules||{})});
window.CasaWorkspaceOS={version:VERSION,load,get,update,selectSolution,clear,subscribe,snapshot};
window.CasaCore?.registerModule?.('workspace-operating-system',{version:VERSION,ready:()=>!!registry,health:()=>({status:registry?'ok':'waiting',detail:registry?'Shared workspace context active':'Workspace context registry not loaded'})});
})();
