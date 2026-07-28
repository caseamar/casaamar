import fs from 'node:fs';import vm from 'node:vm';
const ok=(x,m)=>{if(!x)throw new Error(m)};const model=JSON.parse(fs.readFileSync('registry/domain-model.json','utf8'));const packs=JSON.parse(fs.readFileSync('registry/domain-packs.json','utf8'));const source=fs.readFileSync('core/casa-domain-intelligence.js','utf8');const page=fs.readFileSync('domain-intelligence.html','utf8');
ok(source.includes('DISCOVERY_RULES'),'Discovery rules mangler');ok(source.includes('sufficientForCurrentTasks'),'Task readiness mangler');ok(source.includes('requiredFor'),'Discovery er ikke koblet til brugsscenarier');ok(page.includes('Kør ny discovery'),'Manuel discovery CTA mangler');ok(page.includes('Discovery-status'),'Discovery status mangler');
const store=new Map();const localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)};const fetch=async u=>({ok:true,json:async()=>u.includes('domain-packs')?structuredClone(packs):structuredClone(model)});const ctx={window:{},localStorage,fetch,Date,JSON,structuredClone};ctx.window=ctx;vm.createContext(ctx);vm.runInContext(source,ctx);await ctx.CasaDomainIntelligence.load();const first=ctx.CasaDomainIntelligence.discoveryStatus();ok(first.open>0,'Discovery skal skabe relevante spørgsmål');ok(first.coverage===0,'Initial missing-fact coverage skal være 0');ctx.CasaDomainIntelligence.answerClarification('patio-floor','yes');const second=ctx.CasaDomainIntelligence.discoveryStatus();ok(second.coverage>first.coverage,'Coverage skal stige efter verificering');ok(ctx.CasaDomainIntelligence.nextClarification()?.id!=='patio-floor','Afsluttet spørgsmål må ikke blive stående');
console.log('Domain Discovery Engine: 10 kontroller bestået.');
// Regression: missing required facts must never coexist with an empty visible queue.
const stale=structuredClone(model);
stale.facts=(stale.facts||[]).filter(f=>!(f.subject==='area.patio'&&f.predicate==='located_on_floor'));
stale.clarifications=(stale.clarifications||[]).map(q=>q.id==='patio-floor'?{...q,status:'resolved',answer:'yes'}:q);
store.set('casa-domain-context-v1',JSON.stringify(stale));
const ctx2={window:{},localStorage,fetch,Date,JSON,structuredClone};ctx2.window=ctx2;vm.createContext(ctx2);vm.runInContext(source,ctx2);await ctx2.CasaDomainIntelligence.load();
const repaired=ctx2.CasaDomainIntelligence.discoveryStatus();
ok(repaired.coverage<100,'Regression fixture skal have manglende coverage');
ok(repaired.open>0,'Manglende facts skal automatisk genåbne relevante spørgsmål');
ok(repaired.consistent,'Discovery status skal være konsistent efter repair');
const manual=ctx2.CasaDomainIntelligence.runDiscovery({force:true});
ok(Array.isArray(manual.reopened),'Manual discovery skal rapportere genåbnede spørgsmål');
