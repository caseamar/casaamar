(function(){
 "use strict";
 const VERSION="1.0.0";
 const STORAGE_KEY="casaAuditHistoryV1";
 const LIMIT=500;
 function clone(value){return value===undefined?undefined:JSON.parse(JSON.stringify(value));}
 function read(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]")}catch{return []}}
 function write(items){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(items.slice(-LIMIT)))}catch{}}
 function record(type,subject,payload={},meta={}){
  const entry={
   id:`aud_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
   schema_version:"1.0",
   type:String(type||"platform.activity"),
   subject:String(subject||"platform"),
   payload:clone(payload)||{},
   meta:clone(meta)||{},
   platform_version:window.CASA_PLATFORM_MANIFEST?.platform_version||null,
   created_at:new Date().toISOString()
  };
  const items=read();items.push(entry);write(items);
  window.dispatchEvent(new CustomEvent("casa:audit",{detail:clone(entry)}));
  return clone(entry);
 }
 function recent(options={}){
  const limit=Math.max(1,Number(options.limit||20));
  const type=options.type;const subject=options.subject;
  return clone(read().filter(item=>(!type||item.type===type)&&(!subject||item.subject===subject)).slice(-limit).reverse());
 }
 function clear(){localStorage.removeItem(STORAGE_KEY);return true;}
 function snapshot(){const items=read();return {version:VERSION,ready:true,entry_count:items.length,latest_at:items.at(-1)?.created_at||null};}
 window.CasaAudit={version:VERSION,record,recent,clear,snapshot,ready:true};
 window.CasaCore?.modules?.register?.({id:"audit",version:VERSION,capabilities:["audit.record","audit.history","audit.snapshot"]});
 record("platform.module.ready","audit",{version:VERSION});
})();
