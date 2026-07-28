import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const registry=JSON.parse(fs.readFileSync(path.join(root,'registry/behaviour-contracts.json'),'utf8'));
const pass=[];const fail=[];const check=(ok,msg)=>(ok?pass:fail).push(msg);
check(Array.isArray(registry.contracts)&&registry.contracts.length>0,'Behaviour registry contains contracts');
const ids=new Set();
for(const c of registry.contracts){
 check(Boolean(c.id&&c.capability&&c.owner),`${c.id||'unknown'} identity is complete`);
 check(!ids.has(c.id),`${c.id} is unique`);ids.add(c.id);
 check(Array.isArray(c.expected_behaviour)&&c.expected_behaviour.length>0,`${c.id} has expected behaviour`);
 check(Array.isArray(c.forbidden_behaviour)&&c.forbidden_behaviour.length>0,`${c.id} has forbidden behaviour`);
 check(Array.isArray(c.impact_areas)&&c.impact_areas.length>0,`${c.id} declares impact areas`);
 check(Array.isArray(c.automated_evidence)&&c.automated_evidence.length>0,`${c.id} declares automated evidence`);
 for(const dep of c.dependencies||[])check(fs.existsSync(path.join(root,dep.replace(/^\//,''))),`${c.id} dependency resolves: ${dep}`);
 for(const ev of c.automated_evidence||[])check(fs.existsSync(path.join(root,ev.replace(/^\//,''))),`${c.id} evidence resolves: ${ev}`);
 for(const e of c.expected_behaviour||[])check(Boolean(e.id&&e.given&&e.then),`${c.id}/${e.id||'expected'} expected scenario is complete`);
 for(const e of c.forbidden_behaviour||[])check(Boolean(e.id&&e.given&&e.then),`${c.id}/${e.id||'forbidden'} forbidden scenario is complete`);
}
// Reference flow must cover both positive and negative navigation semantics.
const ws=registry.contracts.find(x=>x.id==='workspace-return-navigation');
const expected=new Set((ws?.expected_behaviour||[]).map(x=>x.id));
const forbidden=new Set((ws?.forbidden_behaviour||[]).map(x=>x.id));
for(const id of ['explicit-return-restores','browser-back-restores'])check(expected.has(id),`Workspace flow includes ${id}`);
for(const id of ['refresh-does-not-restore','direct-open-does-not-restore','release-change-does-not-restore'])check(forbidden.has(id),`Workspace flow includes ${id}`);
if(fail.length){console.error(`Behaviour Governance FAIL: ${fail.length}`);for(const x of fail)console.error(' - '+x);process.exit(1)}
console.log(`Behaviour Governance PASS: ${pass.length} checks`);
