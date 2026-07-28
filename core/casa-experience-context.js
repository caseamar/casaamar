(function(){
 "use strict";
 const VERSION="1.0.0", CONFIG_URL="/config/experience-context.json";
 let config=null,current=null;
 const now=()=>new Date();
 const iso=d=>d.toISOString();
 const id=()=>"ctx_"+(globalThis.crypto?.randomUUID?.()||Math.random().toString(36).slice(2));
 async function load(){if(config)return config;const r=await fetch(`${CONFIG_URL}?_ctx=${Date.now()}`,{cache:"no-store"});if(!r.ok)throw new Error(`Experience Context configuration returned HTTP ${r.status}`);config=await r.json();return config;}
 function sanitize(input={}){if(!config)throw new Error("Experience Context is not loaded.");const out={};for(const key of config.allowed_context_fields||[]){if(Object.prototype.hasOwnProperty.call(input,key)){const v=input[key];out[key]=v==null?null:String(v).slice(0,500);}}for(const key of config.forbidden_fields||[]){if(Object.prototype.hasOwnProperty.call(input,key))throw new Error(`Forbidden context field: ${key}`);}return out;}
 function create(state={},options={}){if(!config)throw new Error("Experience Context is not loaded.");const created=now();const ttl=Math.min(Number(options.ttlMinutes||config.default_ttl_minutes||30),Number(config.max_ttl_minutes||120));current={schemaVersion:"1.0",contextId:id(),createdAt:iso(created),updatedAt:iso(created),expiresAt:iso(new Date(created.getTime()+ttl*60000)),privacy:{...config.privacy},state:sanitize(state)};window.CasaEvents?.publish?.("experience.contextcreated",{contextId:current.contextId,fields:Object.keys(current.state)},{privacy:{classification:"operational",purpose:"experience-continuity",retention:"session-only"}});return snapshot();}
 function expired(){return !current||Date.parse(current.expiresAt)<=Date.now();}
 function get(){if(expired()){current=null;return null;}return snapshot();}
 function merge(patch={}){if(!current||expired())throw new Error("No active experience context.");current.state={...current.state,...sanitize(patch)};current.updatedAt=iso(now());window.CasaEvents?.publish?.("experience.contextupdated",{contextId:current.contextId,fields:Object.keys(sanitize(patch))},{privacy:{classification:"operational",purpose:"experience-continuity",retention:"session-only"}});return snapshot();}
 function clear(reason="explicit-clear"){const prior=current?.contextId||null;current=null;window.CasaEvents?.publish?.("experience.contextcleared",{contextId:prior,reason},{privacy:{classification:"operational",purpose:"experience-continuity",retention:"session-only"}});return {cleared:true,contextId:prior,reason};}
 function snapshot(){return current?JSON.parse(JSON.stringify(current)):null;}
 function status(){return {version:VERSION,ready:Boolean(config),active:Boolean(get()),storage:config?.storage||null,channel_neutral:true,domain_neutral:true,persistent_identity:false,allowed_fields:(config?.allowed_context_fields||[]).length};}
 window.CasaExperienceContext={VERSION,load,create,get,merge,clear,status,sanitize};
 window.CasaCore?.modules?.register?.({id:"experience-context",version:VERSION,capabilities:["experience.context.create","experience.context.read","experience.context.update","experience.context.clear"]});
 load().then(()=>window.dispatchEvent(new CustomEvent("casa:experience-context:ready",{detail:status()}))).catch(error=>window.CasaEvents?.publish?.("platform:experience-context-error",{message:error.message}));
})();
