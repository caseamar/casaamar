(function(){
 "use strict";
 const VERSION="1.0.1";
 const URL="/registry/repository.json";
 let cache=null;
 async function load(options={}){
  if(cache&&!options.force)return cache;
  const response=await fetch(`${URL}?_repository=${Date.now()}`,{cache:"no-store"});
  if(!response.ok)throw new Error(`Repository Intelligence returned HTTP ${response.status}`);
  const data=await response.json();
  const paths=new Set();
  for(const item of data.files||[]){
   if(!item.path||!item.kind||!item.area)throw new Error("Repository registry contains an incomplete file record.");
   if(paths.has(item.path))throw new Error(`Duplicate repository path: ${item.path}`);
   paths.add(item.path);
  }
  cache=data;
  window.CasaEvents?.publish?.("repository:intelligence-ready",snapshot());
  window.dispatchEvent(new CustomEvent("casa:repository:ready",{detail:snapshot()}));
  return cache;
 }
 function list(filter={}){
  return (cache?.files||[]).filter(item=>(!filter.area||item.area===filter.area)&&(!filter.kind||item.kind===filter.kind)&&(!filter.critical||item.critical)).map(item=>({...item}));
 }
 function get(path){return (cache?.files||[]).find(item=>item.path===path)||null;}
 function snapshot(){
  const records=cache?.files||[];
  return {version:VERSION,registry_version:cache?.version||null,ready:Boolean(cache),file_count:records.length,critical_count:records.filter(item=>item.critical).length,areas:[...new Set(records.map(item=>item.area))].sort()};
 }
 function validate(){
  const policy=cache?.policies||{};
  const paths=new Set((cache?.files||[]).map(item=>item.path.replace(/^\//,"")));
  const missing=(policy.critical_files_must_exist||[]).filter(path=>!paths.has(path));
  const duplicateCount=(cache?.files||[]).length-paths.size;
  return {consistent:missing.length===0&&duplicateCount===0,missing,duplicate_count:duplicateCount,file_count:paths.size};
 }
 window.CasaRepository={version:VERSION,load,list,get,snapshot,validate,get data(){return cache}};
 window.CasaCore?.modules?.register?.({id:"repository-intelligence",version:VERSION,capabilities:["repository.inventory","repository.search","repository.validate","repository.snapshot"]});
 load().catch(error=>window.CasaEvents?.publish?.("repository:intelligence-error",{message:error.message}));
})();
