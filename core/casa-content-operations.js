(function(){
 "use strict";
 const VERSION="1.1.0"; const URL="/registry/content-operations.json"; let cache=null;
 const clone=v=>JSON.parse(JSON.stringify(v));
 async function load(options={}){if(cache&&!options.force)return cache;const r=await fetch(`${URL}?_content_ops=${Date.now()}`,{cache:"no-store"});if(!r.ok)throw new Error(`Content Operations returned HTTP ${r.status}`);cache=await r.json();const validation=validate();window.CasaEvents?.publish?.("content.operations.ready",{...snapshot(),validation});return cache;}
 function queue(name){return clone(cache?.queues?.[name]||[]);}
 function validate(){const errors=[],ids=new Set();for(const [name,items] of Object.entries(cache?.queues||{}))for(const item of items){if(!item.id||!item.page_id||!item.title||!item.status||!item.action_href)errors.push({queue:name,id:item.id||"unknown",code:"incomplete"});if(ids.has(item.id))errors.push({queue:name,id:item.id,code:"duplicate-id"});ids.add(item.id);}return{consistent:errors.length===0,errors,item_count:ids.size};}
 function snapshot(){const c=queue("content"),r=queue("review"),p=queue("publish");return{version:VERSION,ready:Boolean(cache),content_count:c.length,review_count:r.length,publish_ready:p.filter(x=>x.status==="ready").length,publish_blocked:p.filter(x=>x.status==="blocked").length};}
 window.CasaContentOperations={version:VERSION,load,queue,validate,snapshot,get data(){return cache}};window.CasaCore?.modules?.register?.({id:"content-operations",version:VERSION,capabilities:["content.queue","review.queue","publish.queue","impact.analysis","ai.actions"]});load().catch(e=>{try{window.CasaEvents?.publish?.("content.operations.error",{message:e.message})}catch(_ignored){}});
})();
