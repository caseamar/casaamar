
(function(){
 "use strict";

 const VERSION="1.0.0";
 const listeners=new Map();
 const stores=new Map();

 function clone(value){
  return value===undefined?undefined:JSON.parse(JSON.stringify(value));
 }
 function safeJson(value,fallback=null){
  try{return JSON.parse(value)??fallback}catch{return fallback}
 }
 function emit(event,payload){
  const group=listeners.get(event);
  if(group)group.forEach(fn=>{try{fn(clone(payload))}catch(error){console.error(error)}});
  window.dispatchEvent(new CustomEvent(`casa:${event}`,{detail:clone(payload)}));
 }
 function on(event,handler){
  if(!listeners.has(event))listeners.set(event,new Set());
  listeners.get(event).add(handler);
  return ()=>listeners.get(event)?.delete(handler);
 }
 function readLocal(key,fallback=null){
  return safeJson(localStorage.getItem(key),fallback);
 }
 function writeLocal(key,value){
  localStorage.setItem(key,JSON.stringify(value));
  return value;
 }
 function removeLocal(key){
  localStorage.removeItem(key);
 }

 const storage={
  register(name,adapter){
   if(stores.has(name))throw new Error(`Store already registered: ${name}`);
   stores.set(name,adapter);
  },
  get(name){
   const store=stores.get(name);
   if(!store)throw new Error(`Unknown store: ${name}`);
   return clone(store.read());
  },
  set(name,value,meta={}){
   const store=stores.get(name);
   if(!store)throw new Error(`Unknown store: ${name}`);
   const saved=store.write(clone(value));
   emit("store:changed",{store:name,value:saved,meta,at:new Date().toISOString()});
   return clone(saved);
  },
  remove(name,meta={}){
   const store=stores.get(name);
   if(!store)throw new Error(`Unknown store: ${name}`);
   store.remove();
   emit("store:changed",{store:name,value:null,meta,at:new Date().toISOString()});
  },
  list(){return [...stores.keys()]}
 };

 const registry=new Map();
 const modules={
  register(definition){
   if(!definition?.id)throw new Error("Module id is required");
   const current=registry.get(definition.id);
   registry.set(definition.id,{
    id:definition.id,
    version:definition.version||"1.0.0",
    status:definition.status||"active",
    capabilities:[...(definition.capabilities||[])],
    dependencies:[...(definition.dependencies||[])],
    metadata:{...(definition.metadata||{})},
    registered_at:current?.registered_at||new Date().toISOString()
   });
   emit("module:registered",registry.get(definition.id));
  },
  get(id){return clone(registry.get(id)||null)},
  list(){return [...registry.values()].map(clone)}
 };

 const state={
  get platform(){return readLocal("casaPlatformStateV1",{})},
  setPlatform(value){return writeLocal("casaPlatformStateV1",value)},
  get workspace(){
   return window.CasaWorkspace?.getState?.()||readLocal("casaWorkspaceStateV1",{status:"idle",count:0});
  },
  get release(){return readLocal("casaReleaseSessionV2",null)}
 };

 const health={
  async checkUrl(id,label,url,options={}){
   const started=performance.now();
   try{
    const response=await fetch(`${url}${url.includes("?")?"&":"?"}_doctor=${Date.now()}`,{cache:"no-store"});
    const duration_ms=Math.round(performance.now()-started);
    if(!response.ok){
     return {id,label,status:"error",detail:`HTTP ${response.status}`,duration_ms,url};
    }
    let detail=options.detail||"Tilgængelig";
    if(options.json){
     try{
      const data=await response.clone().json();
      detail=options.describe?options.describe(data):detail;
     }catch{
      return {id,label,status:"warning",detail:"Svar kunne ikke læses som JSON",duration_ms,url};
     }
    }
    return {id,label,status:"ok",detail,duration_ms,url};
   }catch(error){
    return {id,label,status:"error",detail:error?.message||"Kunne ikke forbindes",duration_ms:Math.round(performance.now()-started),url};
   }
  },
  async snapshot(){
   const manifest=window.CASA_PLATFORM_MANIFEST||{};
   const workspace=state.workspace;
   const release=state.release;
   const staticChecks=await Promise.all([
    this.checkUrl("platform-manifest","Platformmanifest","/platform-manifest.json",{
     json:true,
     describe:data=>data.platform_version===manifest.platform_version?data.platform_version:`Uoverensstemmelse: ${data.platform_version||"ukendt"}`
    }),
    this.checkUrl("content-release","Live indhold","/content-release.json",{
     json:true,
     describe:data=>data.content_version||"Ingen indholdsversion"
    }),
    this.checkUrl("asset-library","Billedregister","/asset-library.json",{
     json:true,
     describe:data=>`${(data.assets||[]).length} registrerede billeder`
    }),
    this.checkUrl("component-library","Designkomponenter","/component-library.json",{
     json:true,
     describe:data=>`${(data.components||data.items||[]).length} komponenter`
    }),
    this.checkUrl("security-config","Sikkerhedsgrundlag","/config/security.json",{
     json:true,
     describe:data=>data.enabled?"Aktiveret":"Fundament klar"
    }),
    this.checkUrl("compliance-config","Compliancegrundlag","/config/compliance.json",{
     json:true,
     describe:data=>data.enabled?"Aktiveret":"Fundament klar"
    }),
    this.checkUrl("seo-config","SEO-grundlag","/config/seo.json",{
     json:true,
     describe:data=>data.enabled?"Aktiveret":"Fundament klar"
    })
   ]);

   const runtimeChecks=[
    {id:"core",label:"Casa Amar Core",status:"ok",detail:`v${VERSION}`},
    {id:"platform",label:"Platform",status:manifest.platform_version?"ok":"warning",detail:manifest.platform_version||"Ukendt"},
    {id:"worker",label:"Worker",status:manifest.worker_version?"ok":"warning",detail:manifest.worker_version||"Ukendt"},
    {id:"workspace",label:"Arbejdsstatus",status:workspace.status==="idle"?"ok":"attention",detail:workspace.status||"idle"},
    {id:"release",label:"Aktiv indholdsudgivelse",status:release?.active===true?"attention":"ok",detail:release?.active===true?"I gang":"Ingen"},
    {id:"storage",label:"Central storage",status:"ok",detail:`${storage.list().length} stores`}
   ];

   const checks=[...runtimeChecks,...staticChecks];
   const overall=checks.some(c=>c.status==="error")?"error":
    checks.some(c=>c.status==="warning")?"warning":
    checks.some(c=>c.status==="attention")?"attention":"ok";

   const recommendations=[];
   if(checks.some(c=>c.status==="error"))recommendations.push("Ret de røde kontroller før næste udgivelse.");
   if(workspace.count>0)recommendations.push(`Gennemgå ${workspace.count} ikke-udgivne ændringer.`);
   if(release?.active===true)recommendations.push("Lad den aktive udgivelse blive færdig, før du starter en ny.");
   if(!recommendations.length)recommendations.push("Ingen handling nødvendig. Platformen er klar til videre arbejde.");

   const snapshot={
    schema_version:"1.0",
    generated_at:new Date().toISOString(),
    overall,
    checks,
    recommendations
   };
   writeLocal("casaPlatformHealthV1",snapshot);
   emit("health:updated",snapshot);
   return snapshot;
  }
 };

 storage.register("workspace",{
  read:()=>window.CasaWorkspace?.getState?.()||readLocal("casaWorkspaceStateV1",{status:"idle",count:0}),
  write:value=>writeLocal("casaWorkspaceStateV1",value),
  remove:()=>removeLocal("casaWorkspaceStateV1")
 });
 storage.register("release",{
  read:()=>readLocal("casaReleaseSessionV2",null),
  write:value=>writeLocal("casaReleaseSessionV2",value),
  remove:()=>removeLocal("casaReleaseSessionV2")
 });

 modules.register({id:"core",version:VERSION,capabilities:["events","storage","state","health","modules"]});
 modules.register({id:"content",status:"foundation",capabilities:["content.read","content.write"]});
 modules.register({id:"assets",status:"foundation",capabilities:["assets.read","assets.write"]});
 modules.register({id:"deployment",status:"foundation",capabilities:["deployment.status"]});
 modules.register({id:"security",status:"planned",capabilities:["auth","access-control","audit"]});
 modules.register({id:"compliance",status:"planned",capabilities:["privacy","cookies","retention"]});
 modules.register({id:"seo",status:"planned",capabilities:["metadata","sitemap","structured-data"]});

 window.CasaCore={
  version:VERSION,
  on,emit,
  storage,
  modules,
  state,
  health,
  safeJson,
  ready:true
 };
 emit("core:ready",{version:VERSION,modules:modules.list(),at:new Date().toISOString()});
})();
