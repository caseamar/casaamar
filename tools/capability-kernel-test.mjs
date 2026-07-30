import fs from 'node:fs';
const root=new URL('..',import.meta.url).pathname;
const json=p=>JSON.parse(fs.readFileSync(root+p,'utf8'));
const model=json('registry/platform-capability-model.json');
const contracts=json('registry/capability-contracts.json');
const reviews=json('registry/review-capabilities.json');
const subsystems=json('registry/subsystems.json');
const constitution=json('platform/brain/PLATFORM-CONSTITUTION.json');
const runtime=fs.readFileSync(root+'core/casa-capability-kernel.js','utf8');
const fail=[];const check=(ok,msg)=>{if(!ok)fail.push(msg)};
const caps=new Map(model.capabilities.map(x=>[x.id,x]));
const cons=new Set(contracts.contracts.map(x=>x.id));
const revs=new Set(reviews.reviews.map(x=>x.id));
const subs=new Set(subsystems.subsystems.map(x=>x.id));
check(model.schema_version==='1.0','capability model schema');
check(model.capabilities.length>=13,'strategic capability coverage');
for(const id of ['understanding','assessment','guidance','decision','execution','evidence','learning','experience','governance','configuration','integration','observability','release'])check(caps.has(id),`missing capability ${id}`);
for(const cap of model.capabilities){
 check(cap.mission?.length>=20,`${cap.id}: mission`);
 check(cap.outcomes?.length>0,`${cap.id}: outcomes`);
 check(cap.metrics?.length>0,`${cap.id}: metrics`);
 check(cap.services?.length>0,`${cap.id}: services`);
 for(const dep of cap.dependencies||[])check(caps.has(dep),`${cap.id}: unresolved dependency ${dep}`);
 for(const contract of cap.contracts||[])check(cons.has(contract),`${cap.id}: unresolved contract ${contract}`);
 for(const review of cap.reviews||[])check(revs.has(review),`${cap.id}: unresolved review ${review}`);
 for(const service of cap.services||[])check(subs.has(service),`${cap.id}: unresolved service ${service}`);
}
check(reviews.assignment_policy.includes('without changing architecture'),'role-independent assignment policy');
check(reviews.reviews.every(x=>Object.hasOwn(x,'assignee_ref')),'review assignment is configurable');
check(constitution.articles.some(x=>x.id==='ARTICLE-34'),'constitution capability traceability');
check(constitution.articles.some(x=>x.id==='ARTICLE-35'),'constitution role independence');
check(runtime.includes('function createRuntime')&&runtime.includes('assignReview')&&runtime.includes('missing-registered-service'),'capability runtime functions');
const audit=json('platform/brain/repository-audit-v323.json');
check(audit.decision.includes('Do not rebuild'),'evolution decision recorded');
check(audit.findings.some(x=>x.classification==='reuse'),'reuse evidence recorded');
check(audit.findings.some(x=>x.classification==='refactor'),'refactor evidence recorded');
if(fail.length){console.error('Capability Kernel FAILED\n- '+fail.join('\n- '));process.exit(1)}
console.log(`Capability Kernel VERIFIED: ${model.capabilities.length} strategic capabilities, ${contracts.contracts.length} contracts, ${reviews.reviews.length} review capabilities`);
