(function(){
 "use strict";
 const VERSION="1.0.0";
 const URL="/registry/content.json";
 let cache=null;
 const clone=value=>JSON.parse(JSON.stringify(value));
 async function load(options={}){
  if(cache&&!options.force)return cache;
  const response=await fetch(`${URL}?_content=${Date.now()}`,{cache:"no-store"});
  if(!response.ok)throw new Error(`Content Intelligence returned HTTP ${response.status}`);
  const data=await response.json();
  const ids=new Set();
  for(const item of data.items||[]){
   if(!item.id||!item.display_name||!item.type||!item.source||!item.status)throw new Error("Content Registry contains an incomplete record.");
   if(ids.has(item.id))throw new Error(`Duplicate content id: ${item.id}`);
   ids.add(item.id);
  }
  cache=data;
  const validation=validate();
  window.CasaEvents?.publish?.("content:intelligence-ready",{...snapshot(),validation});
  window.dispatchEvent(new CustomEvent("casa:content-intelligence:ready",{detail:{...snapshot(),validation}}));
  return cache;
 }
 function list(filter={}){return (cache?.items||[]).filter(item=>(!filter.type||item.type===filter.type)&&(!filter.status||item.status===filter.status)&&(!filter.owner||item.owner===filter.owner)).map(clone);}
 function get(id){const item=(cache?.items||[]).find(item=>item.id===id);return item?clone(item):null;}
 function relations(id){const item=get(id);return (item?.relations||[]).map(get).filter(Boolean);}
 function snapshot(){const items=cache?.items||[];return {version:VERSION,registry_version:cache?.version||null,ready:Boolean(cache),item_count:items.length,statuses:[...new Set(items.map(item=>item.status))].sort(),types:[...new Set(items.map(item=>item.type))].sort()};}
 function validate(){
  const items=cache?.items||[], ids=new Set(items.map(item=>item.id)), validStatuses=new Set(cache?.status_model||[]), validTypes=new Set(cache?.content_types||[]);
  const errors=[];
  for(const item of items){
   if(!validStatuses.has(item.status))errors.push({id:item.id,field:"status",value:item.status});
   if(!validTypes.has(item.type))errors.push({id:item.id,field:"type",value:item.type});
   for(const relation of item.relations||[])if(!ids.has(relation))errors.push({id:item.id,field:"relation",value:relation});
  }
  return {consistent:errors.length===0,errors,item_count:items.length};
 }
 window.CasaContent={version:VERSION,load,list,get,relations,snapshot,validate,get data(){return cache}};
 window.CasaCore?.modules?.register?.({id:"content-intelligence",version:VERSION,capabilities:["content.registry","content.relations","content.validate","content.snapshot"]});
 load().catch(error=>window.CasaEvents?.publish?.("content:intelligence-error",{message:error.message}));
})();
