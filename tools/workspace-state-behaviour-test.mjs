import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const source=read('core/casa-workspace-state.js');
const control=read('control/index.html');
let pass=0;
const check=(ok,msg)=>{if(!ok)throw new Error(msg);pass++};

check(source.includes("const VERSION='1.6.0'"),'Workspace State Manager version must be current');
check(source.includes("const RELEASE='v2026.07.24.172'"),'Return state must be bound to the current release');
check(source.includes("state.returnRequested===true"),'Restoration must require an explicit one-time return request');
check(!source.includes("location.hash==='#ai-workspace'"),'A URL hash must not trigger restoration');
check(source.includes("x.release!==RELEASE"),'State from another release must be rejected');
check(source.includes("MAX_AGE_MS=10*60*1000"),'Return state must expire quickly');
check(source.includes("if(location.pathname.startsWith('/control')&&isFreshEntry()&&!shouldRestore())clear()"),'Fresh direct opens and reloads must clear stale return state');
check(source.includes("clear();\n   window.dispatchEvent"),'State must be consumed after successful restoration');
check(source.includes("history.scrollRestoration='auto'"),'Native browser Back/Forward restoration must remain enabled');
check(source.includes('saveOrigin'),'Control must save origin position before navigation');
check(source.includes('requestReturn'),'Operational pages must mark explicit returns');
check(source.includes('workspace-fallback'),'A stable workspace fallback must exist');
check(control.includes('navType==="back_forward" || window.CasaWorkspaceState?.shouldRestore?.()'),'Control may skip top only for browser history or a verified return transaction');
check(control.includes('if(location.hash==="#ai-workspace")history.replaceState'),'Legacy workspace hashes must be removed on fresh entry');
check(!control.includes('navType==="back_forward" || location.hash==="#ai-workspace"'),'Legacy hash must not bypass normal top positioning');
for(const page of ['recommendation-engine.html','asset-intelligence.html','knowledge-graph.html','experience-engine.html','release-governance.html']){
 const html=read(page);
 check(html.includes('/core/casa-workspace-state.js?v=20260724.172'),page+' must load workspace state manager');
 check(html.includes('href="/control/"'),page+' must return to canonical control URL without a persistent anchor');
 check(!html.includes('/control/#ai-workspace'),page+' must not persist workspace anchor across reloads or releases');
}
console.log(`Workspace return session test: ${pass} passed, 0 failed`);
