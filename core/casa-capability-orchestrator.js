(()=>{
"use strict";
const VERSION="1.0.0";
const TERMINAL=new Set(["completed","failed","cancelled"]);
const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
const now=()=>new Date().toISOString();
const uid=prefix=>`${prefix}_${Date.now()}_${globalThis.crypto?.randomUUID?.()||Math.random().toString(36).slice(2)}`;
function createOrchestrator({kernel,policy,events,audit}={}){
 if(!kernel)throw new Error("Capability Kernel is required.");
 const executions=new Map();const adapters=new Map();const idempotency=new Map();
 const transitions=policy?.status_transitions||{};
 function emit(type,execution,extra={}){
  const payload={execution_id:execution.id,capability_id:execution.capability_id,contract_id:execution.contract_id,status:execution.status,updated_at:now(),...extra};
  try{events?.publish?.(type,payload,{source:{service:"capability-orchestrator",version:VERSION},trace:execution.trace,idempotency_key:`${execution.id}:${type}:${execution.status}`});}catch(error){execution.errors.push({code:"event_publish_failed",message:error.message,at:now()});}
  try{audit?.record?.("capability.execution",type,{...payload,trace:execution.trace},{owner:"capability-orchestrator"});}catch{}
 }
 function transition(execution,next,detail={}){
  const allowed=transitions[execution.status]||[];
  if(!allowed.includes(next))throw new Error(`Invalid capability execution transition: ${execution.status} -> ${next}`);
  execution.status=next;
  if(next==="running")execution.started_at=now();
  if(TERMINAL.has(next)||next==="manual_review")execution.completed_at=now();
  execution.history.push({status:next,at:now(),detail:clone(detail)});
  return execution;
 }
 function registerAdapter(serviceId,handler,{priority=100,mutates=false}={}){
  if(typeof handler!=="function")throw new Error("Capability adapter handler must be a function.");
  const list=adapters.get(serviceId)||[];list.push({handler,priority,mutates});list.sort((a,b)=>a.priority-b.priority);adapters.set(serviceId,list);
  return ()=>adapters.set(serviceId,(adapters.get(serviceId)||[]).filter(x=>x.handler!==handler));
 }
 function plan(capabilityId){
  const trace=kernel.trace(capabilityId);if(!trace)throw new Error(`Unknown capability: ${capabilityId}`);
  const services=trace.services.map(service=>({id:service.id,available:(adapters.get(service.id)||[]).length>0,adapter_count:(adapters.get(service.id)||[]).length}));
  return {capability_id:capabilityId,contract_id:trace.contracts[0]?.id||null,dependencies:trace.dependencies.map(x=>x.id),reviews:trace.reviews.map(x=>x.id),services,executable:services.some(x=>x.available)};
 }
 function request(capabilityId,input={},options={}){
  const trace=kernel.trace(capabilityId);if(!trace)throw new Error(`Unknown capability: ${capabilityId}`);
  const contract=trace.contracts[0];if(!contract)throw new Error(`Capability has no contract: ${capabilityId}`);
  if(options.idempotency_key&&idempotency.has(options.idempotency_key))return clone(idempotency.get(options.idempotency_key));
  const execution={id:options.id||uid("capx"),capability_id:capabilityId,contract_id:contract.id,status:"requested",requested_at:now(),started_at:null,completed_at:null,input:clone(input)||{},output:null,context:clone(options.context)||{},trace:{correlation_id:options.correlation_id||uid("corr"),causation_id:options.causation_id||null},evidence:[],reviews:[],errors:[],idempotency_key:options.idempotency_key||null,history:[{status:"requested",at:now(),detail:{}}]};
  executions.set(execution.id,execution);if(execution.idempotency_key)idempotency.set(execution.idempotency_key,execution);emit("capability.execution.requested",execution);return clone(execution);
 }
 async function execute(executionOrId,options={}){
  const id=typeof executionOrId==="string"?executionOrId:executionOrId.id;const execution=executions.get(id);if(!execution)throw new Error(`Unknown execution: ${id}`);
  if(execution.status!=="requested")return clone(execution);
  const trace=kernel.trace(execution.capability_id);const candidates=[];
  for(const service of trace.services)for(const adapter of adapters.get(service.id)||[])candidates.push({...adapter,service_id:service.id});
  candidates.sort((a,b)=>a.priority-b.priority);
  if(!candidates.length){transition(execution,"blocked",{reason:"no_registered_adapter"});execution.errors.push({code:"no_registered_adapter",message:"No executable service adapter is registered.",at:now()});emit("capability.execution.blocked",execution,{reason:"no_registered_adapter"});return clone(execution);}
  const selected=candidates[0];
  if(selected.mutates&&policy?.execution_policy?.idempotency_required_for_mutations&&!execution.idempotency_key){transition(execution,"blocked",{reason:"idempotency_required"});execution.errors.push({code:"idempotency_required",message:"Mutating capability execution requires an idempotency key.",at:now()});emit("capability.execution.blocked",execution,{reason:"idempotency_required"});return clone(execution);}
  transition(execution,"running",{service_id:selected.service_id});emit("capability.execution.started",execution,{service_id:selected.service_id});
  try{
   const result=await selected.handler({execution:clone(execution),input:clone(execution.input),context:clone(execution.context),capability:trace.capability,contract:trace.contracts[0],signal:options.signal});
   const status=result?.status||"success";execution.output=clone(result?.output??result??{});execution.evidence=clone(result?.evidence||[]);execution.reviews=clone(result?.reviews||[]);
   if(status==="manual_review"){
    if(!result?.reason)throw new Error("Manual review result requires a reason.");
    transition(execution,"manual_review",{service_id:selected.service_id,reason:result.reason});emit("capability.execution.reviewrequired",execution,{service_id:selected.service_id,reason:result.reason});
   }else{
    if(policy?.evidence_policy?.completed_requires_evidence&&execution.evidence.length===0)throw new Error("Completed capability execution requires evidence.");
    transition(execution,"completed",{service_id:selected.service_id});emit("capability.execution.completed",execution,{service_id:selected.service_id,evidence_count:execution.evidence.length});
   }
  }catch(error){execution.errors.push({code:"execution_failed",message:error.message,at:now()});transition(execution,"failed",{service_id:selected.service_id});emit("capability.execution.failed",execution,{service_id:selected.service_id,error:error.message});}
  return clone(execution);
 }
 function get(id){return clone(executions.get(id)||null)}
 function list({capability_id,status,correlation_id}={}){return [...executions.values()].filter(x=>(!capability_id||x.capability_id===capability_id)&&(!status||x.status===status)&&(!correlation_id||x.trace.correlation_id===correlation_id)).map(clone)}
 function snapshot(){return {version:VERSION,executions:executions.size,adapters:[...adapters.values()].reduce((n,x)=>n+x.length,0),idempotency_entries:idempotency.size,status_counts:[...executions.values()].reduce((a,x)=>(a[x.status]=(a[x.status]||0)+1,a),{})}}
 return {version:VERSION,registerAdapter,plan,request,execute,get,list,snapshot};
}
async function boot(){const kernel=await window.CasaCapabilityKernel.boot();const response=await fetch("/registry/capability-orchestration.json",{cache:"no-store"});if(!response.ok)throw new Error(`Capability orchestration policy: ${response.status}`);const policy=await response.json();return createOrchestrator({kernel,policy,events:window.CasaEvents,audit:window.CasaAudit});}
window.CasaCapabilityOrchestrator={VERSION,createOrchestrator,boot};
window.dispatchEvent(new CustomEvent("casa:capability-orchestrator-ready",{detail:{version:VERSION}}));
})();
