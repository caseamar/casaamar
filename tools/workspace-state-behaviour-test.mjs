import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const source=read('core/casa-workspace-state.js');
const control=read('control/index.html');
let pass=0;const check=(ok,msg)=>{if(!ok)throw new Error(msg);pass++};
check(source.includes("history.scrollRestoration='auto'"),'Native browser scroll restoration must be enabled');
check(source.includes("location.hash==='#ai-workspace'"),'Explicit workspace return must be recognised');
check(source.includes("requestReturn"),'Operational pages must mark explicit returns');
check(source.includes("saveOrigin"),'Control must save origin position before navigation');
check(source.includes("workspace-fallback"),'A stable workspace anchor fallback must exist');
check(control.includes('navType==="back_forward"'),'Control must not force top on browser Back/Forward');
check(control.includes('location.hash==="#ai-workspace"'),'Control must not force top for explicit workspace returns');
for(const page of ['recommendation-engine.html','asset-intelligence.html','knowledge-graph.html','experience-engine.html','release-governance.html']){
 const html=read(page);check(html.includes('/core/casa-workspace-state.js?v=20260724.144'),page+' must load workspace state manager');
 check(html.includes('/control/#ai-workspace'),page+' must expose a stable workspace return destination');
}
console.log(`Workspace return integration test: ${pass} passed, 0 failed`);
