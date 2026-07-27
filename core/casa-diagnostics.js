(function(){
 "use strict";
 const VERSION="1.1.0";
 const registry=new Map();
 function register(def){if(!def?.id||typeof def.run!=="function")throw new Error("Diagnostic id and run function are required");registry.set(def.id,{...def});return def.id;}
 async function run(id,context={}){const def=registry.get(id);if(!def)throw new Error(`Unknown diagnostic: ${id}`);const started=performance.now();try{const result=await def.run(context);return {id,label:def.label||id,status:result?.status||"ok",detail:result?.detail||"Completed",recommendation:result?.recommendation||null,duration_ms:Math.round(performance.now()-started),checked_at:new Date().toISOString(),evidence:result?.evidence||[]};}catch(error){return {id,label:def.label||id,status:"error",detail:error?.message||"Diagnostic failed",recommendation:"Review the technical details and retry.",duration_ms:Math.round(performance.now()-started),checked_at:new Date().toISOString(),evidence:[]};}}
 async function runAll(context={}){const results=[];for(const id of registry.keys())results.push(await run(id,context));const overall=results.some(r=>r.status==="error")?"error":results.some(r=>r.status==="warning")?"warning":results.some(r=>r.status==="attention")?"attention":"ok";const report={schema_version:"1.0",overall,results,generated_at:new Date().toISOString()};window.CasaEvents?.publish?.("diagnostics:completed",report);return report;}
 function snapshot(){return {version:VERSION,ready:true,diagnostic_count:registry.size,diagnostics:[...registry.keys()]};}
 register({id:"runtime.readiness",label:"Runtime readiness",run:()=>({status:window.CasaCore?.ready&&window.CASA_PLATFORM_MANIFEST?.platform_version?"ok":"warning",detail:window.CasaCore?.ready?"Core and manifest available":"Runtime is still initialising"})});
 register({id:"project.brain",label:"Project Brain",run:async()=>{const r=await fetch(`/platform/brain/manifest.json?_=${Date.now()}`,{cache:"no-store"});if(!r.ok)return {status:"error",detail:`HTTP ${r.status}`};const d=await r.json();return {status:d.machine_readable?"ok":"warning",detail:`${(d.files||[]).length} knowledge files · ${d.current_release||"unknown"}`};}});

 register({id:"platform.modules",label:"Platform modules",run:()=>{const modules=window.CasaCore?.modules?.snapshot?.()||window.CasaCore?.modules?.list?.()||[];const count=Array.isArray(modules)?modules.length:Object.keys(modules||{}).length;return {status:count>=6?"ok":"warning",detail:`${count} registered modules`,evidence:[modules]};}});
 register({id:"project.brain.consistency",label:"Project Brain consistency",run:async()=>{await window.CasaBrain?.load?.();const brain=window.CasaBrain?.snapshot?.();const platform=window.CASA_PLATFORM_MANIFEST?.platform_version;return {status:brain?.current_release===platform?"ok":"warning",detail:`Brain ${brain?.current_release||"unknown"} · Platform ${platform||"unknown"}`,evidence:[brain]};}});

 window.CasaDiagnostics={version:VERSION,register,run,runAll,snapshot,ready:true};
 window.CasaCore?.modules?.register?.({id:"diagnostics",version:VERSION,capabilities:["diagnostics.register","diagnostics.run","diagnostics.report"]});
 window.CasaEvents?.publish?.("platform:diagnostics-ready",{version:VERSION});
})();
