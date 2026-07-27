(function(){
 "use strict";
 const VERSION="1.0.0";
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
 function subscribe(type,handler){return window.CasaCore?.on?.(type,event=>handler(event))||(()=>{});}
 function recent(options={}){const limit=Number(options.limit||20);const type=options.type;return history.filter(e=>!type||e.type===type).slice(-limit).reverse().map(e=>JSON.parse(JSON.stringify(e)));}
 function snapshot(){return {version:VERSION,ready:true,event_count:history.length,types:[...new Set(history.map(e=>e.type))]};}
 window.CasaEvents={version:VERSION,publish,subscribe,recent,snapshot,ready:true};
 window.CasaCore?.modules?.register?.({id:"events",version:VERSION,capabilities:["events.publish","events.subscribe","events.history"]});
 publish("platform:events-ready",{version:VERSION});
})();
