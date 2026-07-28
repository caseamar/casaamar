
(function(){
 "use strict";
 const VERSION="1.0.0";
 let cache=null;

 async function fetchJson(path,fallback){
  try{
   const response=await fetch(`${path}${path.includes("?")?"&":"?"}_gov=${Date.now()}`,{cache:"no-store"});
   return response.ok?await response.json():fallback;
  }catch{return fallback}
 }
 async function load(){
  if(cache)return cache;
  const [capabilities,features,tenants,policies,design]=await Promise.all([
   fetchJson("/registry/capabilities.json",{capabilities:[]}),
   fetchJson("/registry/features.json",{features:[]}),
   fetchJson("/registry/tenants.json",{tenants:[]}),
   fetchJson("/registry/policies.json",{policies:[]}),
   fetchJson("/registry/design.json",{components:[]})
  ]);
  cache={capabilities,features,tenants,policies,design,loaded_at:new Date().toISOString()};
  window.CasaCore?.emit?.("governance:ready",snapshot());
  return cache;
 }
 function snapshot(){
  if(!cache)return null;
  const activeFeatures=cache.features.features.filter(item=>item.enabled);
  const activePolicies=cache.policies.policies.filter(item=>item.status==="active");
  return {
   version:VERSION,
   loaded_at:cache.loaded_at,
   counts:{
    capabilities:cache.capabilities.capabilities.length,
    enabled_features:activeFeatures.length,
    tenants:cache.tenants.tenants.length,
    active_policies:activePolicies.length,
    design_components:cache.design.components.length
   }
  };
 }
 function hasCapability(id){
  return Boolean(cache?.capabilities?.capabilities?.some(item=>item.id===id&&item.status!=="planned"));
 }
 async function isFeatureEnabled(id,tenantId="casa-amar"){
  if(window.CasaConfig?.feature&&tenantId==="casa-amar")return window.CasaConfig.feature(id);
  const globalFeature=cache?.features?.features?.find(item=>item.id===id);
  if(!globalFeature?.enabled)return false;
  const tenant=cache?.tenants?.tenants?.find(item=>item.id===tenantId);
  return Boolean(tenant);
 }
 function policiesFor(action){
  return (cache?.policies?.policies||[]).filter(policy=>policy.applies_to===action);
 }
 async function evaluate(action,context={}){
  await load();
  const policies=policiesFor(action);
  const reasons=[];
  let allowed=true;
  for(const policy of policies){
   if(policy.id==="release.requires_health"){
    const health=window.CASA_HEALTH_SNAPSHOT||await window.CasaCore?.health?.snapshot?.();
    if(health?.overall==="error"){
     allowed=false;
     reasons.push("Platform Doctor har fundet en kritisk fejl.");
    }
   }
   if(policy.id==="ai.requires_human_approval"&&context.actor==="ai"&&context.human_approved!==true){
    allowed=false;
    reasons.push("Menneskelig godkendelse mangler.");
   }
  }
  const decision={
   action,
   allowed,
   reasons,
   evaluated_at:new Date().toISOString(),
   policies:policies.map(policy=>policy.id)
  };
  window.CasaCore?.emit?.("governance:decision",decision);
  return decision;
 }

 window.CasaGovernance={
  version:VERSION,
  load,
  snapshot,
  hasCapability,
  isFeatureEnabled,
  policiesFor,
  evaluate
 };
 load();
})();
