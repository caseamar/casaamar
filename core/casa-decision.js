(function(){
 "use strict";
 const VERSION="1.2.0";let registry=null;const HISTORY_KEY="casaDecisionHistoryV1";
 async function fetchJson(path,fallback={}){try{const r=await fetch(`${path}${path.includes("?")?"&":"?"}_decision=${Date.now()}`,{cache:"no-store"});return r.ok?await r.json():fallback}catch{return fallback}}
 function clone(v){return v===undefined?undefined:JSON.parse(JSON.stringify(v));}
 function resolvePath(source,path){return String(path||"").split(".").reduce((value,key)=>value?.[key],source);}
 function evaluateRule(rule,context){const actual=resolvePath(context,rule.path);const expected=rule.value;const ops={equals:()=>actual===expected,not_equals:()=>actual!==expected,exists:()=>actual!==undefined&&actual!==null,truthy:()=>Boolean(actual),includes:()=>Array.isArray(actual)&&actual.includes(expected)};const passed=(ops[rule.operator||"equals"]||(()=>false))();return {type:"rule",id:rule.id||rule.path,path:rule.path,operator:rule.operator||"equals",expected,actual,passed,message:rule.message||null};}
 function history(){try{return JSON.parse(localStorage.getItem(HISTORY_KEY)||"[]")}catch{return []}}
 function saveHistory(entry){const items=history();items.push(entry);localStorage.setItem(HISTORY_KEY,JSON.stringify(items.slice(-200)));}
 async function load(){if(registry)return registry;registry=await fetchJson("/registry/decisions.json",{decisions:[]});window.CasaEvents?.publish?.("decision:ready",snapshot());return registry;}
 function snapshot(){return {version:VERSION,loaded:Boolean(registry),decision_count:registry?.decisions?.length||0,history_count:history().length};}
 function buildExplanation({allowed,reasons,evidence,definition}){
  const failed=evidence.filter(item=>item.passed===false);
  const passed=evidence.filter(item=>item.passed===true);
  return {
   schema_version:"1.0",outcome:allowed?"allowed":"blocked",
   summary:allowed?"All registered requirements were satisfied.":"One or more registered requirements blocked the action.",
   primary_reason:reasons[0]||null,reasons:[...new Set(reasons)],
   evidence_summary:{passed:passed.length,failed:failed.length,total:evidence.length},
   failed_checks:clone(failed),policy_references:clone(definition?.policies||[])
  };
 }
 async function evaluate(id,context={}){
  await load();const definition=registry.decisions.find(item=>item.id===id);const startedAt=new Date().toISOString();
  if(!definition){const reasons=["Decision is not registered in Decision Registry."];const missing={id,allowed:false,status:"blocked",headline:"Handlingen er ikke registreret",explanation:buildExplanation({allowed:false,reasons,evidence:[],definition:null}),reasons,evidence:[],policies:[],context:clone(context),engine_version:VERSION,registry_version:registry?.version||"1.0",started_at:startedAt,evaluated_at:new Date().toISOString(),duration_ms:0};saveHistory(missing);window.CasaAudit?.record?.("decision.evaluated",id,missing);window.CasaEvents?.publish?.("decision.evaluated",missing);return missing;}
  const reasons=[];const evidence=[];let allowed=true;
  for(const capability of definition.requires_capabilities||[]){const has=window.CasaGovernance?.hasCapability?.(capability)===true;evidence.push({type:"capability",id:capability,passed:has});if(!has){allowed=false;reasons.push(`Capability mangler: ${capability}`);}}
  const governance=await window.CasaGovernance?.evaluate?.(id,context);if(governance){evidence.push({type:"governance",passed:governance.allowed,policies:governance.policies||[]});if(!governance.allowed){allowed=false;reasons.push(...(governance.reasons||[]));}}
  if(id==="cookies.enable_nonessential"&&context.consent!==true){allowed=false;reasons.push("Brugeren har ikke givet samtykke.");evidence.push({type:"consent",passed:false});}
  for(const rule of definition.rules||[]){const evaluated=evaluateRule(rule,context);evidence.push(evaluated);if(!evaluated.passed){allowed=false;reasons.push(evaluated.message||`Regel ikke opfyldt: ${evaluated.id}`);}}
  const result={id,label:definition.label,category:definition.category,allowed,status:allowed?"allowed":"blocked",headline:allowed?definition.experience.allowed:definition.experience.blocked,reasons:[...new Set(reasons)],evidence,policies:definition.policies||[],context:clone(context),engine_version:VERSION,registry_version:registry?.version||"1.0",started_at:startedAt,evaluated_at:new Date().toISOString()};
  result.explanation=buildExplanation({allowed,reasons:result.reasons,evidence,definition});result.duration_ms=new Date(result.evaluated_at)-new Date(startedAt);saveHistory(result);window.CasaAudit?.record?.("decision.evaluated",id,result,{engine_version:VERSION});window.CasaEvents?.publish?.("decision.evaluated",result);return result;
 }
 async function can(id,context={}){return (await evaluate(id,context)).allowed;}
 function explain(id){const item=history().filter(x=>x.id===id).at(-1);return clone(item?.explanation||null);}
 function recent(limit=10){return clone(history().slice(-limit).reverse());}
 function clearHistory(){localStorage.removeItem(HISTORY_KEY);window.CasaEvents?.publish?.("decision:history-cleared",{at:new Date().toISOString()});}
 window.CasaDecision={version:VERSION,load,evaluate,can,explain,recent,clearHistory,snapshot};load();
})();
