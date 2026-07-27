(function(){
 "use strict";
 const VERSION="1.8.0";
 const URL="/registry/subsystems.json";
 let cache=null;
 const normalize=value=>String(value||"").trim().toLowerCase();
 async function load(options={}){
  if(cache&&!options.force)return cache;
  const response=await fetch(`${URL}?_registry=${Date.now()}`,{cache:"no-store"});
  if(!response.ok)throw new Error(`Subsystem Registry returned HTTP ${response.status}`);
  const data=await response.json();
  const ids=new Set(),names=new Set();
  for(const item of data.subsystems||[]){
   if(!item.id||!item.display_name||!item.version)throw new Error("Subsystem Registry contains an incomplete record.");
   if(ids.has(item.id))throw new Error(`Duplicate subsystem id: ${item.id}`);
   if(names.has(normalize(item.display_name)))throw new Error(`Duplicate subsystem display name: ${item.display_name}`);
   ids.add(item.id);names.add(normalize(item.display_name));
  }
  cache=data;
  window.CasaEvents?.publish?.("platform:subsystem-registry-ready",snapshot());
  window.dispatchEvent(new CustomEvent("casa:subsystem-registry:ready",{detail:snapshot()}));
  return cache;
 }
 function list(){return (cache?.subsystems||[]).map(item=>({...item}));}
 function get(idOrAlias){
  const key=normalize(idOrAlias);
  const alias=cache?.naming_policy?.aliases?.[key]||key;
  return (cache?.subsystems||[]).find(item=>normalize(item.id)===alias)||null;
 }
 function snapshot(){return {version:VERSION,registry_version:cache?.version||null,ready:Boolean(cache),count:(cache?.subsystems||[]).length,source_of_truth:Boolean(cache?.source_of_truth)};}
 function expectedManifestKeys(manifest={}){
  return Array.isArray(manifest.subsystem_registry?.managed_manifest_keys)?[...manifest.subsystem_registry.managed_manifest_keys]:[];
 }
 function validateCoverage(manifest={}){
  const registered=new Set((cache?.subsystems||[]).map(item=>item.manifest_key));
  const expected=expectedManifestKeys(manifest);
  const missing=expected.filter(key=>!registered.has(key));
  return {consistent:missing.length===0,expected,registered:[...registered],missing};
 }
 function validateManifest(manifest={}){
  const results=[];
  for(const item of cache?.subsystems||[]){
   let actual=null;
   if(item.manifest_key==="platform_version")actual=manifest.platform_version;
   else actual=manifest[item.manifest_key]?.version;
   results.push({id:item.id,display_name:item.display_name,expected:item.version,actual,consistent:String(item.version)===String(actual)});
  }
  const coverage=validateCoverage(manifest);return {consistent:results.every(item=>item.consistent)&&coverage.consistent,results,coverage};
 }
 window.CasaSubsystemRegistry={version:VERSION,load,list,get,snapshot,validateManifest,validateCoverage,get data(){return cache}};
 window.CasaCore?.modules?.register?.({id:"subsystem-registry",version:VERSION,capabilities:["registry.subsystems","registry.naming","registry.versions","registry.consistency"]});
 load().catch(error=>window.CasaEvents?.publish?.("platform:subsystem-registry-error",{message:error.message}));
})();