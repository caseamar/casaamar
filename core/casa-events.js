(function(){
 "use strict";
 const VERSION="1.1.0";
 const history=[];
 const MAX_HISTORY=200;
 function now(){return new Date().toISOString()}
 function publish(type,payload={},meta={}){
  if(!type)throw new Error("Event type is required");
  const event={id:`evt_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,type,payload,meta,created_at:now()};
  history.push(event); if(history.length>MAX_HISTORY)history.splice(0,history.length-MAX_HISTORY);
  window.CasaCore?.emit?.(type,event);
  window.dispatchEvent(new CustomEvent("casa:event",{detail:event}));
  return JSON.parse(JSON.stringify(event));
 }
 function subscribe(type,handler,options={}){
  const unsubscribe=window.CasaCore?.on?.(type,event=>handler(event))||(()=>{});
  if(options.replayLatest){const latest=history.filter(item=>item.type===type).at(-1);if(latest)queueMicrotask(()=>handler(JSON.parse(JSON.stringify(latest))));}
  return unsubscribe;
 }
 function once(type,handler){const unsubscribe=subscribe(type,event=>{unsubscribe();handler(event)});return unsubscribe;}
 function waitFor(type,options={}){return new Promise((resolve,reject)=>{const timeout=Number(options.timeout||5000);const timer=setTimeout(()=>{unsubscribe();reject(new Error(`Timed out waiting for ${type}`))},timeout);const unsubscribe=subscribe(type,event=>{clearTimeout(timer);unsubscribe();resolve(event)},{replayLatest:options.replayLatest});});}
 function recent(options={}){const limit=Number(options.limit||20);const type=options.type;return history.filter(e=>!type||e.type===type).slice(-limit).reverse().map(e=>JSON.parse(JSON.stringify(e)));}
 function snapshot(){return {version:VERSION,ready:true,event_count:history.length,types:[...new Set(history.map(e=>e.type))]};}
 window.CasaEvents={version:VERSION,publish,subscribe,once,waitFor,recent,snapshot,ready:true};
 window.CasaCore?.modules?.register?.({id:"events",version:VERSION,capabilities:["events.publish","events.subscribe","events.once","events.wait","events.history"]});
 publish("platform:events-ready",{version:VERSION});
})();
