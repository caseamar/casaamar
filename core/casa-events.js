(function(){
 "use strict";
 const VERSION="2.0.0";
 const MAX_HISTORY=500;
 const history=[];
 const subscribers=new Map();
 const idempotency=new Map();
 let registry={version:"0",contracts:[],principles:{}};
 const clone=v=>v===undefined?undefined:JSON.parse(JSON.stringify(v));
 const iso=()=>new Date().toISOString();
 const uid=p=>`${p}_${Date.now()}_${crypto?.randomUUID?.()||Math.random().toString(36).slice(2)}`;
 async function loadContracts(){
  try{const r=await fetch(`/registry/event-contracts.json?_=${Date.now()}`,{cache:"no-store"});if(!r.ok)throw new Error(`HTTP ${r.status}`);registry=await r.json();}
  catch(error){registry={version:"unavailable",contracts:[],principles:{},load_error:error.message};}
  return clone(registry);
 }
 function contractFor(type){return (registry.contracts||[]).find(x=>x.type===type)||null;}
 function validate(type,payload={}){
  const contract=contractFor(type);const errors=[];
  if(!/^[a-z][a-z0-9]*(\.[a-z0-9]+)+$/.test(type||""))errors.push("Event type must use channel-neutral dot notation.");
  if(!contract)errors.push("Event type is not registered.");
  for(const key of contract?.required_payload||[])if(payload?.[key]===undefined)errors.push(`Missing payload field: ${key}`);
  return {valid:errors.length===0,registered:Boolean(contract),errors,contract:clone(contract)};
 }
 function build(type,payload={},options={}){
  const validation=validate(type,payload);const contract=validation.contract;
  return Object.freeze({
   id:options.id||uid("evt"),type,schema_version:"2.0",occurred_at:options.occurred_at||iso(),
   source:{service:options.source?.service||"unknown",version:options.source?.version||"unknown"},
   subject:clone(options.subject||null),payload:clone(payload)||{},context:clone(options.context||{}),
   privacy:{classification:options.privacy?.classification||contract?.privacy_class||"operational",retention:options.privacy?.retention||contract?.retention||"policy"},
   trace:{correlation_id:options.trace?.correlation_id||uid("corr"),causation_id:options.trace?.causation_id||null},
   idempotency_key:options.idempotency_key||null,validation:{valid:validation.valid,registered:validation.registered,errors:validation.errors}
  });
 }
 function publish(type,payload={},options={}){
  const event=build(type,payload,options);
  if(!event.validation.valid&&!options.allow_unregistered)throw new Error(event.validation.errors.join(" "));
  if(event.idempotency_key&&idempotency.has(event.idempotency_key))return clone(idempotency.get(event.idempotency_key));
  history.push(event);if(history.length>MAX_HISTORY)history.splice(0,history.length-MAX_HISTORY);
  if(event.idempotency_key)idempotency.set(event.idempotency_key,event);
  for(const handler of subscribers.get(type)||[])queueMicrotask(()=>handler(clone(event)));
  for(const handler of subscribers.get("*")||[])queueMicrotask(()=>handler(clone(event)));
  window.CasaCore?.emit?.(type,event);window.dispatchEvent(new CustomEvent("casa:event",{detail:clone(event)}));
  if(contractFor(type)?.audited!==false)window.CasaAudit?.record?.("platform.event",type,{event_id:event.id,valid:true,trace:event.trace,privacy:event.privacy},{owner:contractFor(type)?.owner||"event-platform"});
  return clone(event);
 }
 function subscribe(type,handler,{replayLatest=false}={}){if(!subscribers.has(type))subscribers.set(type,new Set());subscribers.get(type).add(handler);if(replayLatest){const e=[...history].reverse().find(x=>type==="*"||x.type===type);if(e)queueMicrotask(()=>handler(clone(e)));}return()=>subscribers.get(type)?.delete(handler);}
 function once(type,handler){const off=subscribe(type,e=>{off();handler(e)});return off;}
 function waitFor(type,{timeout=5000,replayLatest=false}={}){return new Promise((resolve,reject)=>{let off=()=>{};const timer=setTimeout(()=>{off();reject(new Error(`Timed out waiting for ${type}`));},timeout);off=subscribe(type,e=>{clearTimeout(timer);off();resolve(e)},{replayLatest});});}
 function recent({limit=20,type,correlation_id}={}){return clone(history.filter(e=>(!type||e.type===type)&&(!correlation_id||e.trace.correlation_id===correlation_id)).slice(-limit).reverse());}
 function snapshot(){return {version:VERSION,ready:true,contract_version:registry.version||null,contract_count:registry.contracts?.length||0,event_count:history.length,subscriber_types:subscribers.size,idempotency_entries:idempotency.size,channel_neutral:Boolean(registry.principles?.channel_neutral),privacy_by_design:Boolean(registry.principles?.privacy_by_design)};}
 window.CasaEvents={VERSION,version:VERSION,loadContracts,contractFor,validate,build,publish,subscribe,once,waitFor,recent,snapshot,get registry(){return clone(registry)},ready:true};
 window.CasaCore?.modules?.register?.({id:"event-platform",version:VERSION,capabilities:["events.registered","events.publish","events.subscribe","events.trace","events.idempotency","events.privacy","events.audit"]});
 loadContracts().then(()=>publish("platform.events.ready",{version:VERSION,contract_version:registry.version},{source:{service:"event-platform",version:VERSION},idempotency_key:`event-platform-ready-${VERSION}`})).catch(()=>{});
})();
