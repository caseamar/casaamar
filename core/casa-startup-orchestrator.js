(function(){
 "use strict";
 const VERSION="1.0.0";
 const states=new Map();
 const clone=v=>JSON.parse(JSON.stringify(v));
 const set=(id,status,detail={})=>{states.set(id,{id,status,updatedAt:new Date().toISOString(),...detail});window.dispatchEvent(new CustomEvent("casa:startup-state",{detail:clone(states.get(id))}));return states.get(id)};
 async function waitForGlobal(name,{timeout=8000}={}){
  const started=Date.now();
  while(!window[name]){
   if(Date.now()-started>timeout)throw new Error(`Startup dependency ${name} was not available within ${timeout} ms`);
   await new Promise(r=>setTimeout(r,20));
  }
  return window[name];
 }
 async function runStep(id,fn){
  set(id,"waiting");
  try{set(id,"starting");const value=await fn();set(id,"ready");return value}
  catch(error){set(id,"failed",{error:error.message});throw error}
 }
 async function bootContentWorkspace(options={}){
  const force=Boolean(options.force);
  set("content-workspace","starting");
  try{
   const events=await runStep("event-contracts",async()=>{const api=await waitForGlobal("CasaEvents");const registry=await api.loadContracts();if(registry.load_error)throw new Error(registry.load_error);return registry});
   if(!events.contracts?.length)throw new Error("Event Registry contains no contracts");
   await runStep("content-studio",async()=>{const api=await waitForGlobal("CasaContentStudio");return api.load({force})});
   await runStep("content-operations",async()=>{const api=await waitForGlobal("CasaContentOperations");return api.load({force})});
   await runStep("content-intelligence",async()=>{const api=await waitForGlobal("CasaContentIntelligence");return api.load({force})});
   set("content-workspace","ready");
   try{window.CasaEvents.publish("platform.startup.ready",{scope:"content-workspace",version:VERSION},{source:{service:"startup-orchestrator",version:VERSION}})}catch(_e){}
   return snapshot();
  }catch(error){
   set("content-workspace","failed",{error:error.message});
   try{window.CasaEvents?.publish?.("platform.startup.failed",{scope:"content-workspace",message:error.message},{source:{service:"startup-orchestrator",version:VERSION}})}catch(_e){}
   throw error;
  }
 }
 function snapshot(){return{version:VERSION,states:[...states.values()].map(clone),ready:states.get("content-workspace")?.status==="ready"};}
 window.CasaStartupOrchestrator={version:VERSION,bootContentWorkspace,snapshot,waitForGlobal};
 window.CasaCore?.modules?.register?.({id:"startup-orchestrator",version:VERSION,capabilities:["startup.dependencies","startup.ordering","startup.timeout","startup.health"]});
})();
