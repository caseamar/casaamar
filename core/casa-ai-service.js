(()=>{
"use strict";
const VERSION="1.0.0";
const CONFIG="/config/ai-service.json";
const REGISTRY="/registry/ai-capabilities.json";
let cache=null;
async function loadJson(url){const r=await fetch(url,{cache:"no-store"});if(!r.ok)throw new Error(`${url}: ${r.status}`);return r.json()}
async function load(){if(cache)return cache;const [config,registry]=await Promise.all([loadJson(CONFIG),loadJson(REGISTRY)]);cache={config,registry};return cache}
async function inspect(capability){const {config,registry}=await load();const contract=(registry.capabilities||[]).find(x=>x.id===capability);return contract?{status:"ready",capability,contract,policy:config.policies?.[capability]||null}:{status:"blocked",capability,because:"Capability is not registered",evidence:[REGISTRY]}}
async function request(input={}){const capability=String(input.capability||"").trim();if(!capability)return {status:"blocked",because:"A capability is required",evidence:["AI Service contract v1.0"]};const resolved=await inspect(capability);if(resolved.status!=="ready")return resolved;return {status:"unavailable",capability,because:"AI Service Layer is installed, but no provider adapter is approved in this foundation release.",evidence:[CONFIG,REGISTRY],policy:resolved.policy,manual_review:false,next_action:"Configure an approved provider adapter in a later governed release."}}
function clearCache(){cache=null}
window.CasaAIService={VERSION,load,inspect,request,clearCache};
window.dispatchEvent(new CustomEvent("casa:ai-service-ready",{detail:{version:VERSION}}));
})();
