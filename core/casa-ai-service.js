(()=>{
"use strict";
const VERSION="2.0.0";
const PATHS={
 config:"/config/ai-service.json",
 capabilities:"/registry/ai-capabilities.json",
 prompts:"/registry/ai-prompts.json",
 providers:"/registry/ai-providers.json"
};
const memory={bundle:null,adapters:new Map(),metrics:[],cache:new Map()};
const now=()=>Date.now();
const uid=()=>`ai_${now().toString(36)}_${Math.random().toString(36).slice(2,9)}`;
const clone=v=>JSON.parse(JSON.stringify(v));
const stable=value=>JSON.stringify(value,Object.keys(value||{}).sort());
const hash=value=>{let h=2166136261,s=typeof value==="string"?value:stable(value);for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(36)};
async function loadJson(url){const r=await fetch(url,{cache:"no-store"});if(!r.ok)throw new Error(`${url}: ${r.status}`);return r.json()}
async function load(){
 if(memory.bundle)return memory.bundle;
 const [config,capabilities,prompts,providers]=await Promise.all(Object.values(PATHS).map(loadJson));
 memory.bundle={config,capabilities,prompts,providers};
 registerBuiltIns(memory.bundle);
 return memory.bundle;
}
function registerAdapter(adapter){
 if(!adapter||!adapter.id||typeof adapter.execute!=="function")throw new Error("Invalid AI adapter contract");
 memory.adapters.set(adapter.id,Object.freeze({...adapter}));
 return adapter.id;
}
function unregisterAdapter(id){return memory.adapters.delete(id)}
function registerBuiltIns(bundle){
 if(memory.adapters.has("deterministic-local"))return;
 registerAdapter({
  id:"deterministic-local",kind:"fallback",capabilities:["intent","classification","tagging","summarization"],priority:10,
  async execute(request){
   const text=String(request.input?.text||request.input?.content||request.input?.query||"").trim();
   const tokens=text.toLocaleLowerCase("da-DK").normalize("NFD").replace(/[\u0300-\u036f]/g,"").split(/[^a-z0-9æøå]+/).filter(Boolean);
   if(request.capability==="intent")return {intent:{query:text,tokens,entities:[],confidence:text?0.62:0.1},confidence:text?0.62:0.1};
   if(request.capability==="classification"){
    const taxonomy=Array.isArray(request.input?.taxonomy)?request.input.taxonomy:[];
    const labels=taxonomy.filter(label=>tokens.some(t=>String(label).toLowerCase().includes(t)||t.includes(String(label).toLowerCase())));
    return {labels,confidence:labels.length?0.58:0.2};
   }
   if(request.capability==="tagging")return {tags:[...new Set(tokens.filter(x=>x.length>3))].slice(0,12),confidence:text?0.5:0.1};
   if(request.capability==="summarization")return {summary:text.length>180?`${text.slice(0,177).trim()}…`:text,confidence:text?0.45:0.1};
   return {status:"unavailable",because:"The deterministic adapter does not implement this capability."};
  }
 });
}
function resolvePrompt(registry,id,version){
 const all=registry.prompts||[];
 const candidates=all.filter(x=>x.id===id);
 if(!candidates.length)return null;
 if(version)return candidates.find(x=>x.version===version)||null;
 return candidates.sort((a,b)=>String(b.version).localeCompare(String(a.version),undefined,{numeric:true}))[0];
}
function interpolate(template,variables={}){return String(template||"").replace(/\{\{\s*([\w.-]+)\s*\}\}/g,(_,key)=>String(key.split('.').reduce((v,k)=>v?.[k],variables)??""))}
function cacheKey(request,prompt){return `${request.capability}:${prompt?.id||"none"}:${prompt?.version||"0"}:${hash(request.input||{})}`}
function getCached(key,ttl){const item=memory.cache.get(key);if(!item)return null;if(now()-item.at>ttl){memory.cache.delete(key);return null}return clone(item.value)}
function setCached(key,value){memory.cache.set(key,{at:now(),value:clone(value)})}
function selectAdapter(bundle,request){
 const policy=bundle.config.policies?.[request.capability]||bundle.config.default_capability_policy||{};
 const candidates=[...memory.adapters.values()].filter(a=>a.capabilities?.includes(request.capability));
 candidates.sort((a,b)=>{
  const preferred=(policy.preferred_adapters||[]);
  const pa=preferred.indexOf(a.id),pb=preferred.indexOf(b.id);
  if(pa!==pb)return (pa<0?999:pa)-(pb<0?999:pb);
  return (b.priority||0)-(a.priority||0);
 });
 return {adapter:candidates[0]||null,policy};
}
function record(metric){
 memory.metrics.push(metric);if(memory.metrics.length>500)memory.metrics.shift();
 try{localStorage.setItem("casaAiObservability",JSON.stringify(memory.metrics.slice(-250)))}catch{}
 try{window.CasaEvents?.emit?.("ai.request.completed",metric)}catch{}
}
async function inspect(capability){
 const bundle=await load();
 const contract=(bundle.capabilities.capabilities||[]).find(x=>x.id===capability);
 if(!contract)return {status:"blocked",capability,because:"Capability is not registered",evidence:[PATHS.capabilities]};
 const {adapter,policy}=selectAdapter(bundle,{capability});
 return {status:adapter?"ready":"unavailable",capability,contract,policy,adapter:adapter?{id:adapter.id,kind:adapter.kind}:null,evidence:[PATHS.config,PATHS.capabilities]};
}
async function request(input={}){
 const requestId=input.request_id||uid(),started=performance.now?.()||now();
 const capability=String(input.capability||"").trim();
 if(!capability)return {status:"blocked",request_id:requestId,because:"A capability is required",evidence:["AI Service contract v2.0"]};
 const bundle=await load();
 const contract=(bundle.capabilities.capabilities||[]).find(x=>x.id===capability);
 if(!contract)return {status:"blocked",request_id:requestId,capability,because:"Capability is not registered",evidence:[PATHS.capabilities]};
 const prompt=input.prompt_id?resolvePrompt(bundle.prompts,input.prompt_id,input.prompt_version):null;
 if(input.prompt_id&&!prompt)return {status:"blocked",request_id:requestId,capability,because:"Requested prompt is not registered",evidence:[PATHS.prompts]};
 const {adapter,policy}=selectAdapter(bundle,{capability,input});
 if(!adapter)return {status:"unavailable",request_id:requestId,capability,because:"No approved adapter supports this capability.",policy,evidence:[PATHS.providers]};
 const ttl=Number(input.cache_ttl_ms??policy.cache_ttl_ms??bundle.config.cache.default_ttl_ms??300000);
 const key=cacheKey({capability,input:input.input},prompt);
 if(input.cache!==false){const cached=getCached(key,ttl);if(cached)return {...cached,cache:{hit:true,key}}}
 const prepared={request_id:requestId,capability,input:clone(input.input||{}),policy:clone(policy),prompt:prompt?{id:prompt.id,version:prompt.version,system:interpolate(prompt.system,input.input),template:interpolate(prompt.template,input.input)}:null,context:clone(input.context||{})};
 let output,status="completed",error=null;
 try{output=await adapter.execute(prepared)}catch(e){status="failed";error=String(e?.message||e);output=null}
 const duration=Math.round((performance.now?.()||now())-started);
 const result={status,request_id:requestId,capability,adapter:{id:adapter.id,kind:adapter.kind},prompt:prompt?{id:prompt.id,version:prompt.version}:null,policy,output,error,confidence:Number(output?.confidence??0),manual_review:contract.risk==="high"||String(policy.human_review||"").includes("required"),cache:{hit:false,key},duration_ms:duration,evidence:[PATHS.config,PATHS.capabilities,PATHS.prompts,PATHS.providers]};
 if(status==="completed"&&input.cache!==false)setCached(key,result);
 record({request_id:requestId,at:new Date().toISOString(),capability,adapter_id:adapter.id,status,duration_ms:duration,cache_hit:false,confidence:result.confidence});
 return result;
}
function metrics(){
 let stored=[];try{stored=JSON.parse(localStorage.getItem("casaAiObservability")||"[]")}catch{}
 const rows=[...stored,...memory.metrics].slice(-500);
 const by={};for(const m of rows){const k=m.adapter_id||"unknown";by[k]??={adapter_id:k,requests:0,completed:0,failed:0,total_ms:0,cache_hits:0};const x=by[k];x.requests++;x[m.status==="completed"?"completed":"failed"]++;x.total_ms+=m.duration_ms||0;x.cache_hits+=m.cache_hit?1:0}
 return {version:VERSION,total:rows.length,adapters:Object.values(by).map(x=>({...x,success_rate:x.requests?Math.round(1000*x.completed/x.requests)/10:0,average_ms:x.requests?Math.round(x.total_ms/x.requests):0})),recent:rows.slice(-50).reverse()};
}
function clearCache(){memory.bundle=null;memory.cache.clear()}
window.CasaAIService={VERSION,PATHS,load,inspect,request,registerAdapter,unregisterAdapter,metrics,clearCache,resolvePrompt};
window.dispatchEvent(new CustomEvent("casa:ai-service-ready",{detail:{version:VERSION}}));
})();
