(()=>{
"use strict";
const VERSION="1.0.0";
const URLS={model:"/registry/platform-capability-model.json",contracts:"/registry/capability-contracts.json",reviews:"/registry/review-capabilities.json",subsystems:"/registry/subsystems.json"};
async function loadJson(url){const r=await fetch(url,{cache:"no-store"});if(!r.ok)throw new Error(`${url}: ${r.status}`);return r.json()}
function index(items){return new Map((items||[]).map(item=>[item.id,item]))}
function validate(model,contracts,reviews,subsystems){
 const errors=[];const warnings=[];const caps=index(model.capabilities),cons=index(contracts.contracts),revs=index(reviews.reviews),subs=index(subsystems.subsystems);
 for(const cap of model.capabilities||[]){
  for(const dep of cap.dependencies||[])if(!caps.has(dep))errors.push({type:"missing-capability-dependency",capability:cap.id,reference:dep});
  for(const contract of cap.contracts||[])if(!cons.has(contract))errors.push({type:"missing-capability-contract",capability:cap.id,reference:contract});
  for(const review of cap.reviews||[])if(!revs.has(review))errors.push({type:"missing-review-capability",capability:cap.id,reference:review});
  for(const service of cap.services||[])if(!subs.has(service))errors.push({type:"missing-registered-service",capability:cap.id,reference:service});
  if(!cap.metrics?.length)warnings.push({type:"missing-metrics",capability:cap.id});
 }
 return {status:errors.length?"fail":warnings.length?"manual_review":"pass",errors,warnings,summary:{capabilities:model.capabilities?.length||0,contracts:contracts.contracts?.length||0,reviews:reviews.reviews?.length||0,services:subsystems.subsystems?.length||0}};
}
function createRuntime(model,contracts,reviews,subsystems){
 const caps=index(model.capabilities),cons=index(contracts.contracts),revs=index(reviews.reviews),subs=index(subsystems.subsystems);
 const get=id=>caps.get(id)||null;
 const trace=id=>{const capability=get(id);if(!capability)return null;return {capability,contracts:(capability.contracts||[]).map(x=>cons.get(x)).filter(Boolean),reviews:(capability.reviews||[]).map(x=>revs.get(x)).filter(Boolean),services:(capability.services||[]).map(x=>subs.get(x)).filter(Boolean),dependencies:(capability.dependencies||[]).map(x=>caps.get(x)).filter(Boolean)}};
 const dependants=id=>(model.capabilities||[]).filter(x=>(x.dependencies||[]).includes(id));
 const assignReview=(reviewId,assigneeRef)=>{const review=revs.get(reviewId);if(!review)throw new Error(`Unknown review capability: ${reviewId}`);return {...review,assignee_ref:assigneeRef||null}};
 return {version:VERSION,model,get,trace,dependants,assignReview,validate:()=>validate(model,contracts,reviews,subsystems)};
}
async function boot(){const [model,contracts,reviews,subsystems]=await Promise.all(Object.values(URLS).map(loadJson));return createRuntime(model,contracts,reviews,subsystems)}
window.CasaCapabilityKernel={VERSION,URLS,boot,createRuntime,validate};
window.dispatchEvent(new CustomEvent("casa:capability-kernel-ready",{detail:{version:VERSION}}));
})();
