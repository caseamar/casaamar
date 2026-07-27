(function(){
 "use strict";
 const VERSION="1.0.0";
 const URL="/registry/assets.json";
 let cache=null;
 const clone=value=>JSON.parse(JSON.stringify(value));
 async function load(options={}){
  if(cache&&!options.force)return cache;
  const response=await fetch(`${URL}?_assets=${Date.now()}`,{cache:"no-store"});
  if(!response.ok)throw new Error(`Asset Intelligence returned HTTP ${response.status}`);
  cache=await response.json();
  const report=validate(cache);
  if(!report.consistent)throw new Error(`Asset Intelligence is inconsistent: ${report.errors.map(x=>x.code).join(", ")}`);
  const detail={...snapshot(),validation:report};
  window.CasaEvents?.publish?.("asset-intelligence:ready",detail);
  window.dispatchEvent(new CustomEvent("casa:asset-intelligence:ready",{detail}));
  return cache;
 }
 function all(filter={}){return (cache?.items||[]).filter(item=>(!filter.type||item.type===filter.type)&&(!filter.status||item.lifecycle_status===filter.status)&&(!filter.orphanOnly||item.standalone===true)).map(clone);}
 function get(id){const item=(cache?.items||[]).find(x=>x.id===id);return item?clone(item):null;}
 function search(query,options={}){const term=String(query||"").trim().toLowerCase();if(!term)return [];return (cache?.items||[]).filter(item=>[item.id,item.title,item.path,item.type].filter(Boolean).some(v=>String(v).toLowerCase().includes(term))).slice(0,options.limit||50).map(clone);}
 function issues(){return (cache?.items||[]).flatMap(item=>{const out=[];if(item.lifecycle_status==="active"&&item.type==="image"&&!String(item.alt_text||"").trim())out.push({asset_id:item.id,severity:"warning",code:"missing-alt-text"});if(item.type==="image"&&(!item.width||!item.height))out.push({asset_id:item.id,severity:"info",code:"missing-dimensions"});if(item.standalone)out.push({asset_id:item.id,severity:"info",code:"standalone-asset"});return out;});}
 function validate(data=cache){const errors=[],ids=new Set(),paths=new Set();for(const item of data?.items||[]){if(!item.id||!item.type||!item.path)errors.push({code:"incomplete-asset",id:item.id||null});if(ids.has(item.id))errors.push({code:"duplicate-asset-id",id:item.id});ids.add(item.id);if(paths.has(item.path))errors.push({code:"duplicate-asset-path",path:item.path});paths.add(item.path);if(!(data?.asset_types||[]).includes(item.type))errors.push({code:"unknown-asset-type",id:item.id,type:item.type});}return {consistent:errors.length===0,errors,asset_count:data?.items?.length||0,issue_count:issues().length};}
 function impact(id){const item=get(id);if(!item)return null;return {asset:item,usage_count:item.usage_count||0,relation_count:item.relation_count||0,standalone:Boolean(item.standalone),issues:issues().filter(x=>x.asset_id===id)};}
 function snapshot(){const report=validate();const list=cache?.items||[];return {version:VERSION,registry_version:cache?.version||null,ready:Boolean(cache),asset_count:list.length,active_count:list.filter(x=>x.lifecycle_status==="active").length,standalone_count:list.filter(x=>x.standalone).length,issue_count:report.issue_count,consistent:report.consistent};}
 window.CasaAssetIntelligence={version:VERSION,load,all,get,search,issues,impact,validate,snapshot,get data(){return cache}};
 window.CasaCore?.modules?.register?.({id:"asset-intelligence",version:VERSION,capabilities:["assets.inventory","assets.search","assets.issues","assets.impact","assets.validate","assets.snapshot"]});
 load().catch(error=>window.CasaEvents?.publish?.("asset-intelligence:error",{message:error.message}));
})();
