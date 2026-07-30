(()=>{
"use strict";
const VERSION="1.0.0",REGISTRY_URL="/registry/policies.json";
const clone=v=>v===undefined?undefined:JSON.parse(JSON.stringify(v));
const pathGet=(obj,path)=>String(path||"").split(".").reduce((v,k)=>v==null?undefined:v[k],obj);
const operators={
 eq:(a,b)=>a===b,neq:(a,b)=>a!==b,in:(a,b)=>Array.isArray(b)&&b.includes(a),not_in:(a,b)=>Array.isArray(b)&&!b.includes(a),
 exists:a=>a!==undefined&&a!==null,missing:a=>a===undefined||a===null,gt:(a,b)=>typeof a==="number"&&a>b,gte:(a,b)=>typeof a==="number"&&a>=b,
 lt:(a,b)=>typeof a==="number"&&a<b,lte:(a,b)=>typeof a==="number"&&a<=b,contains:(a,b)=>(Array.isArray(a)||typeof a==="string")&&a.includes(b),
 matches:(a,b)=>typeof a==="string"&&typeof b==="string"&&new RegExp(b).test(a)
};
const precedence={allow:1,require:2,manual_review:3,deny:4};
async function loadJson(url){const r=await fetch(url,{cache:"no-store"});if(!r.ok)throw new Error(`${url}: ${r.status}`);return r.json()}
function validatePolicy(p){const errors=[];if(!p||typeof p!=="object")return ["policy_not_object"];for(const k of ["id","version","status","priority","applies_to","when","effect","reason"])if(p[k]===undefined)errors.push(`missing_${k}`);if(!Array.isArray(p.applies_to)||!p.applies_to.length)errors.push("invalid_applies_to");if(!precedence[p.effect])errors.push("invalid_effect");return errors}
function evalNode(node,facts,trace){if(!node||typeof node!=="object")throw new Error("Invalid condition node");
 if(Array.isArray(node.all)){const results=node.all.map(n=>evalNode(n,facts,trace));return results.every(Boolean)}
 if(Array.isArray(node.any)){const results=node.any.map(n=>evalNode(n,facts,trace));return results.some(Boolean)}
 if(node.not)return !evalNode(node.not,facts,trace);
 const op=operators[node.operator];if(!op)throw new Error(`Unsupported policy operator: ${node.operator}`);const actual=pathGet(facts,node.fact);const result=Boolean(op(actual,node.value));trace.push({fact:node.fact,operator:node.operator,expected:clone(node.value),actual:clone(actual),result});return result}
function createRuntime(registry,{eventPublisher=null,auditRecorder=null}={}){
 const policies=(registry.policies||[]).map(clone),errors=[];const ids=new Set();for(const p of policies){for(const e of validatePolicy(p))errors.push({policy_id:p?.id||null,code:e});if(ids.has(p.id))errors.push({policy_id:p.id,code:"duplicate_policy_id"});ids.add(p.id)}
 const applicable=action=>policies.filter(p=>p.status==="active"&&p.applies_to.includes(action)).sort((a,b)=>b.priority-a.priority||a.id.localeCompare(b.id));
 function emit(type,payload){try{eventPublisher?.(type,payload,{source:{service:"policy-runtime",version:VERSION}})}catch(_){}try{auditRecorder?.({type,payload,source:"policy-runtime"})}catch(_){}}
 function evaluate({action,facts={},context={}}={}){if(!action)throw new Error("Policy action is required");if(errors.length){const result={status:"invalid",decision:"deny",action,reason:"Policy registry integrity failed",errors:clone(errors),matched:[],obligations:[],evidence_required:[],context:clone(context)};emit("policy.registry_invalid",result);return result}
  const evaluated=[],matched=[];for(const p of applicable(action)){const trace=[];let isMatch=false,error=null;try{isMatch=evalNode(p.when,facts,trace)}catch(e){error=e.message}const item={policy_id:p.id,version:p.version,priority:p.priority,effect:p.effect,matched:isMatch&&!error,reason:p.reason,trace,error};evaluated.push(item);if(item.matched)matched.push({...item,obligations:p.obligations||[],evidence_required:p.evidence_required||[]})}
  const winner=matched.slice().sort((a,b)=>precedence[b.effect]-precedence[a.effect]||b.priority-a.priority||a.policy_id.localeCompare(b.policy_id))[0]||null;
  const decision=winner?.effect||"allow",result={status:"evaluated",decision,action,reason:winner?.reason||"No blocking policy matched",winning_policy:winner?.policy_id||null,matched:clone(matched),evaluated:clone(evaluated),obligations:[...new Set(matched.flatMap(x=>x.obligations||[]))],evidence_required:[...new Set(matched.flatMap(x=>x.evidence_required||[]))],context:clone(context)};
  emit("policy.evaluated",{action,decision,winning_policy:result.winning_policy,context:result.context});if(decision==="deny")emit("policy.denied",result);if(decision==="manual_review")emit("policy.manual_review_required",result);return result}
 const explain=result=>({decision:result.decision,reason:result.reason,winning_policy:result.winning_policy,matched_policies:(result.matched||[]).map(x=>({id:x.policy_id,effect:x.effect,reason:x.reason,trace:x.trace})),obligations:clone(result.obligations||[]),evidence_required:clone(result.evidence_required||[])});
 const validate=()=>({status:errors.length?"fail":"pass",errors:clone(errors),summary:{policies:policies.length,active:policies.filter(x=>x.status==="active").length,actions:new Set(policies.flatMap(x=>x.applies_to||[])).size}});
 const snapshot=()=>({version:VERSION,registry_version:registry.version,platform_version:registry.platform_version,health:validate(),effects:Object.keys(precedence),operators:Object.keys(operators)});
 return {version:VERSION,evaluate,explain,validate,snapshot,policies:()=>clone(policies)}
}
async function boot(options={}){return createRuntime(await loadJson(REGISTRY_URL),options)}
window.CasaPolicyRuntime={VERSION,REGISTRY_URL,createRuntime,boot,operators:Object.keys(operators)};
window.dispatchEvent(new CustomEvent("casa:policy-runtime-ready",{detail:{version:VERSION}}));
})();
