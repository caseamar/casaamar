
(function(){
 "use strict";
 const VERSION="1.1.0";
 const MANIFEST_URL="/config/configuration-manifest.json";
 let state=null;
 let loading=null;

 function clone(value){
  return value===undefined?undefined:JSON.parse(JSON.stringify(value));
 }
 function pathGet(object,path,fallback=null){
  if(!path)return object;
  const parts=Array.isArray(path)?path:String(path).split(".").filter(Boolean);
  let current=object;
  for(const part of parts){
   if(current===null||current===undefined||!(part in Object(current)))return fallback;
   current=current[part];
  }
  return current;
 }
 async function fetchJson(url,fallback={}){
  try{
   const response=await fetch(`${url}${url.includes("?")?"&":"?"}_cfg=${Date.now()}`,{cache:"no-store"});
   if(!response.ok)return fallback;
   return await response.json();
  }catch{return fallback}
 }
 function merge(base,override){
  if(Array.isArray(base)||Array.isArray(override))return clone(override??base);
  if(typeof base!=="object"||base===null)return clone(override??base);
  const result={...base};
  for(const [key,value] of Object.entries(override||{})){
   result[key]=typeof value==="object"&&value!==null&&!Array.isArray(value)
    ?merge(result[key]||{},value)
    :clone(value);
  }
  return result;
 }
 async function load(force=false){
  if(state&&!force)return state;
  if(loading&&!force)return loading;
  loading=(async()=>{
   const manifest=await fetchJson(MANIFEST_URL,{sources:{},default_tenant:"casa-amar"});
   const entries=await Promise.all(Object.entries(manifest.sources||{}).map(async([key,url])=>[key,await fetchJson(url,{})]));
   const sources=Object.fromEntries(entries);
   const tenantId=manifest.default_tenant||"casa-amar";
   const tenantRegistry=sources.tenants?.tenants||[];
   const tenantMeta=tenantRegistry.find(item=>item.id===tenantId)||null;
   const tenantConfig=tenantMeta?.config_path?await fetchJson(tenantMeta.config_path,{}):{};
   state={
    version:VERSION,
    loaded_at:new Date().toISOString(),
    manifest,
    sources,
    tenant:{id:tenantId,meta:tenantMeta,config:tenantConfig},
    effective:{
     features:merge(
      Object.fromEntries((sources.features?.features||[]).map(item=>[item.id,item.enabled])),
      tenantConfig.features||{}
     ),
     security:sources.security||{},
     compliance:sources.compliance||{},
     seo:sources.seo||{},
     design_system:sources.design_system||{},
     access_control:sources.access_control||{},
     commerce:sources.commerce||{},
     hospitality_intelligence:sources.hospitality_intelligence||{}
    }
   };
   window.CasaCore?.emit?.("config:ready",snapshot());
   loading=null;
   return state;
  })();
  return loading;
 }
 function snapshot(){
  if(!state)return null;
  return {
   version:VERSION,
   loaded_at:state.loaded_at,
   tenant:state.tenant.id,
   source_count:Object.keys(state.sources).length,
   enabled_features:Object.entries(state.effective.features).filter(([,enabled])=>enabled===true).map(([id])=>id),
   configuration_rules:state.manifest.rules||{}
  };
 }
 async function get(path,fallback=null){
  await load();
  return clone(pathGet(state,path,fallback));
 }
 async function getSource(name,path="",fallback=null){
  await load();
  return clone(pathGet(state.sources?.[name],path,fallback));
 }
 async function feature(id){
  await load();
  return state.effective.features?.[id]===true;
 }
 async function tenant(){
  await load();
  return clone(state.tenant);
 }
 async function explain(path){
  await load();
  const value=pathGet(state,path,undefined);
  return {
   path,
   found:value!==undefined,
   value:clone(value),
   tenant:state.tenant.id,
   loaded_at:state.loaded_at,
   source:"Casa Configuration Service"
  };
 }
 async function validate(){
  await load();
  const issues=[];
  if(!state.tenant.meta)issues.push("Standard-tenanten findes ikke i tenant-registeret.");
  if(!state.manifest.sources?.platform)issues.push("Platformmanifestet er ikke registreret.");
  if(!state.manifest.rules?.modules_must_not_fetch_config_directly)issues.push("Reglen om central konfiguration er ikke aktiveret.");
  const result={
   valid:issues.length===0,
   issues,
   checked_at:new Date().toISOString(),
   tenant:state.tenant.id,
   source_count:Object.keys(state.sources).length
  };
  window.CasaCore?.emit?.("config:validated",result);
  return result;
 }

 window.CasaConfig={
  version:VERSION,
  load,
  reload:()=>load(true),
  get,
  getSource,
  feature,
  tenant,
  explain,
  validate,
  snapshot
 };
 load();
})();
