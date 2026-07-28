(function(){
 "use strict";
 const VERSION="1.2.0";
 const history=[];const MAX_HISTORY=200;let contractRegistry={version:"0",contracts:[]};
 function clone(v){return v===undefined?undefined:JSON.parse(JSON.stringify(v));}
 function now(){return new Date().toISOString()}
 async function loadContracts(){
  try{const r=await fetch(`/registry/event-contracts.json?_=${Date.now()}`,{cache:"no-store"});if(r.ok)contractRegistry=await r.json();}catch{}
  return clone(contractRegistry);
 }
 function validate(type,payload){
  const contract=(contractRegistry.contracts||[]).find(item=>item.type===type);
  if(!contract)return {valid:true,registered:false,missing:[],contract:null};
  const missing=(contract.required_payload||[]).filter(key=>payload?.[key]===undefined);
  return {valid:missing.length===0,registered:true,missing,contract:clone(contract)};
 }
 function publish(type,payload={},meta={}){
  if(!type)throw new Error("Event type is required");
  const validation=validate(type,payload);
  const event={id:`evt_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,schema_version:"1.0",type,payload:clone(payload)||{},meta:{...clone(meta),contract_version:contractRegistry.version||null},validation,created_at:now()};
  history.push(event);if(history.length>MAX_HISTORY)history.splice(0,history.length-MAX_HISTORY);
  window.CasaCore?.emit?.(type,event);window.dispatchEvent(new CustomEvent("casa:event",{detail:clone(event)}));
  if(validation.contract?.audited!==false)window.CasaAudit?.record?.("platform.event",type,{event_id:event.id,valid:validation.valid,missing:validation.missing,payload:event.payload},{owner:validation.contract?.owner||"unregistered"});
  return clone(event);
 }
 function subscribe(type,handler,options={}){const unsubscribe=window.CasaCore?.on?.(type,event=>handler(event))||(()=>{});if(options.replayLatest){const latest=history.filter(item=>item.type===type).at(-1);if(latest)queueMicrotask(()=>handler(clone(latest)));}return unsubscribe;}
 function once(type,handler){const unsubscribe=subscribe(type,event=>{unsubscribe();handler(event)});return unsubscribe;}
 function waitFor(type,options={}){return new Promise((resolve,reject)=>{const timeout=Number(options.timeout||5000);const timer=setTimeout(()=>{unsubscribe();reject(new Error(`Timed out waiting for ${type}`))},timeout);const unsubscribe=subscribe(type,event=>{clearTimeout(timer);unsubscribe();resolve(event)},{replayLatest:options.replayLatest});});}
 function recent(options={}){const limit=Number(options.limit||20);const type=options.type;return clone(history.filter(e=>!type||e.type===type).slice(-limit).reverse());}
 function contracts(){return clone(contractRegistry);}
 function snapshot(){return {version:VERSION,ready:true,event_count:history.length,contract_count:contractRegistry.contracts?.length||0,contract_version:contractRegistry.version||null,types:[...new Set(history.map(e=>e.type))]};}
 window.CasaEvents={version:VERSION,publish,subscribe,once,waitFor,recent,contracts,validate,loadContracts,snapshot,ready:true};
 window.CasaCore?.modules?.register?.({id:"events",version:VERSION,capabilities:["events.publish","events.subscribe","events.once","events.wait","events.history","events.contracts","events.audit"]});
 loadContracts().finally(()=>publish("platform:events-ready",{version:VERSION,contract_version:contractRegistry.version||null}));
})();
