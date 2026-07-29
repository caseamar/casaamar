(function(){
 "use strict";
 const VERSION="2.0.0";
 const URL="/registry/experiences.json";
 let cache=null;
 async function load(options={}){
  if(cache&&!options.force)return cache;
  const response=await fetch(`${URL}?_registry=${Date.now()}`,{cache:"no-store"});
  if(!response.ok)throw new Error(`Experience Registry returned HTTP ${response.status}`);
  cache=await response.json();
  const validation=validate(cache);
  if(!validation.valid)throw new Error(`Experience Registry invalid: ${validation.issues.join("; ")}`);
  window.CasaEvents?.publish?.("platform:experience-engine-ready",snapshot());
  window.dispatchEvent(new CustomEvent("casa:experience-engine:ready",{detail:snapshot()}));
  return cache;
 }
 function listStages(){return (cache?.journey_stages||[]).slice().sort((a,b)=>a.order-b.order).map(x=>({...x}));}
 function listTouchpoints(stage){return (cache?.touchpoints||[]).filter(x=>!stage||x.stage===stage).map(x=>({...x}));}
 function journey(){return listStages().map(stage=>({...stage,touchpoints:listTouchpoints(stage.id)}));}
 function validate(data=cache){
  const issues=[]; const stages=new Set(); const touchpoints=new Set();
  for(const stage of data?.journey_stages||[]){if(!stage.id||!stage.display_name)issues.push("Incomplete journey stage");if(stages.has(stage.id))issues.push(`Duplicate stage ${stage.id}`);stages.add(stage.id);}
  for(const point of data?.touchpoints||[]){if(!point.id||!point.stage)issues.push("Incomplete touchpoint");if(touchpoints.has(point.id))issues.push(`Duplicate touchpoint ${point.id}`);touchpoints.add(point.id);if(!stages.has(point.stage))issues.push(`Unknown stage ${point.stage}`);}
  for(const required of data?.quality_rules?.required_stage_coverage||[])if(!(data?.touchpoints||[]).some(x=>x.stage===required))issues.push(`Missing required stage coverage ${required}`);
  return {valid:issues.length===0,issues};
 }
 function snapshot(){const validation=validate();return {version:VERSION,registry_version:cache?.version||null,ready:Boolean(cache),stages:(cache?.journey_stages||[]).length,touchpoints:(cache?.touchpoints||[]).length,valid:validation.valid,issues:validation.issues};}
 window.CasaExperience={version:VERSION,load,listStages,listTouchpoints,journey,validate,snapshot,get data(){return cache}};
 window.CasaCore?.modules?.register?.({id:"experience-engine",version:VERSION,capabilities:["experience.journey","experience.touchpoints","experience.validation","experience.snapshot"]});
 load().catch(error=>window.CasaEvents?.publish?.("platform:experience-engine-error",{message:error.message}));
})();
