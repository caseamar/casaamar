
(function(){
 "use strict";
 const VERSION="1.0.0";
 let registry=null;
 const HISTORY_KEY="casaDecisionHistoryV1";

 async function fetchJson(path,fallback={}){
  try{
   const response=await fetch(`${path}${path.includes("?")?"&":"?"}_decision=${Date.now()}`,{cache:"no-store"});
   return response.ok?await response.json():fallback;
  }catch{return fallback}
 }
 function clone(value){
  return value===undefined?undefined:JSON.parse(JSON.stringify(value));
 }
 function history(){
  try{return JSON.parse(localStorage.getItem(HISTORY_KEY)||"[]")}catch{return []}
 }
 function saveHistory(entry){
  const items=history();
  items.push(entry);
  localStorage.setItem(HISTORY_KEY,JSON.stringify(items.slice(-100)));
 }
 async function load(){
  if(registry)return registry;
  registry=await fetchJson("/registry/decisions.json",{decisions:[]});
  window.CasaCore?.emit?.("decision:ready",snapshot());
  return registry;
 }
 function snapshot(){
  return {
   version:VERSION,
   loaded:Boolean(registry),
   decision_count:registry?.decisions?.length||0,
   history_count:history().length
  };
 }
 async function evaluate(id,context={}){
  await load();
  const definition=registry.decisions.find(item=>item.id===id);
  const startedAt=new Date().toISOString();
  if(!definition){
   const missing={
    id,
    allowed:false,
    status:"blocked",
    headline:"Handlingen er ikke registreret",
    explanation:"Platformen kender ikke denne handling endnu.",
    reasons:["Beslutningen findes ikke i Decision Registry."],
    policies:[],
    evaluated_at:new Date().toISOString(),
    duration_ms:0
   };
   saveHistory(missing);
   return missing;
  }

  const reasons=[];
  const evidence=[];
  let allowed=true;

  for(const capability of definition.requires_capabilities||[]){
   const has=window.CasaGovernance?.hasCapability?.(capability)===true;
   evidence.push({type:"capability",id:capability,passed:has});
   if(!has){
    allowed=false;
    reasons.push(`Capability mangler: ${capability}`);
   }
  }

  const governance=await window.CasaGovernance?.evaluate?.(id,context);
  if(governance){
   evidence.push({type:"governance",passed:governance.allowed,policies:governance.policies||[]});
   if(!governance.allowed){
    allowed=false;
    reasons.push(...(governance.reasons||[]));
   }
  }

  if(id==="cookies.enable_nonessential"&&context.consent!==true){
   allowed=false;
   reasons.push("Brugeren har ikke givet samtykke.");
   evidence.push({type:"consent",passed:false});
  }

  const result={
   id,
   label:definition.label,
   category:definition.category,
   allowed,
   status:allowed?"allowed":"blocked",
   headline:allowed?definition.experience.allowed:definition.experience.blocked,
   explanation:allowed
    ?"Alle relevante regler og forudsætninger er opfyldt."
    :"Én eller flere regler eller forudsætninger blokerer handlingen.",
   reasons:[...new Set(reasons)],
   evidence,
   policies:definition.policies||[],
   context:clone(context),
   started_at:startedAt,
   evaluated_at:new Date().toISOString()
  };
  result.duration_ms=new Date(result.evaluated_at)-new Date(startedAt);
  saveHistory(result);
  window.CasaCore?.emit?.("decision:evaluated",result);
  return result;
 }
 async function can(id,context={}){
  return (await evaluate(id,context)).allowed;
 }
 function explain(id){
  const items=history().filter(item=>item.id===id);
  return clone(items.at(-1)||null);
 }
 function recent(limit=10){
  return clone(history().slice(-limit).reverse());
 }
 function clearHistory(){
  localStorage.removeItem(HISTORY_KEY);
  window.CasaCore?.emit?.("decision:history-cleared",{at:new Date().toISOString()});
 }

 window.CasaDecision={
  version:VERSION,
  load,
  evaluate,
  can,
  explain,
  recent,
  clearHistory,
  snapshot
 };
 load();
})();
