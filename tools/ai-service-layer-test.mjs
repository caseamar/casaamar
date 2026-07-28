import fs from "node:fs";import path from "node:path";
const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),"..");const j=p=>JSON.parse(fs.readFileSync(path.join(root,p),"utf8"));const s=p=>fs.readFileSync(path.join(root,p),"utf8");const failures=[],pass=[];const check=(ok,m)=>(ok?pass:failures).push(m);
const manifest=j("platform-manifest.json"),service=j("registry/ai-service.json"),caps=j("registry/ai-capabilities.json"),config=j("config/ai-service.json"),subs=j("registry/subsystems.json"),beh=j("registry/behaviour-contracts.json");
check(manifest.ai_service_layer?.version===service.version,"Manifest and AI Service registry versions match");
check(subs.subsystems.some(x=>x.id==="ai-service-layer"&&x.version===service.version),"AI Service Layer subsystem is registered");
check(config.direct_provider_calls_allowed===false,"Direct provider calls are forbidden");
check(service.provider_neutral===true&&service.provider_adapters.length===0,"Foundation has no provider lock-in or active adapter");
check(caps.capabilities.every(x=>x.id&&x.inputs&&x.outputs&&x.risk),"Every AI capability has input, output and risk contracts");
check(beh.contracts.some(x=>x.id==="ai-capability-provider-neutral-foundation"),"AI Service behaviour contract exists");
const runtime=s("core/casa-ai-service.js");check(runtime.includes('status:"unavailable"'),"No-provider state is explicit and explainable");check(runtime.includes('status:"blocked"'),"Unknown capability is blocked");
for(const file of ["core/casa-ai-service.js","registry/ai-service.json","config/ai-service.json"]){const text=s(file);check(!/api\.openai\.com|api\.anthropic\.com|generativelanguage\.googleapis\.com|model\s*:\s*["'][^"']+/i.test(text),`No named provider or model binding in ${file}`)}
console.log(`${pass.length} AI Service Layer checks passed`);if(failures.length){console.error(failures.join("\n"));process.exit(1)}
