import fs from 'node:fs';import vm from 'node:vm';
const ok=(x,m)=>{if(!x)throw new Error(m)};const canonical=JSON.parse(fs.readFileSync('registry/domain-model.json','utf8'));const packs=JSON.parse(fs.readFileSync('registry/domain-packs.json','utf8'));const source=fs.readFileSync('core/casa-domain-intelligence.js','utf8');
const store=new Map();const localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)};const fetch=async url=>({ok:true,json:async()=>url.includes('domain-packs')?structuredClone(packs):structuredClone(canonical)});const ctx={window:{},localStorage,fetch,Date,JSON,structuredClone};ctx.window=ctx;vm.createContext(ctx);vm.runInContext(source,ctx);await ctx.CasaDomainIntelligence.load();
ok(ctx.CasaDomainIntelligence.nextClarification()?.id==='patio-floor','Discovery creates highest-priority question');
const result=ctx.CasaDomainIntelligence.answerClarification('patio-floor','no');ok(result.next?.id==='patio-floor-location','No answer creates immediate follow-up');
ctx.CasaDomainIntelligence.answerClarification('patio-floor-location','value','1. sal');ok(ctx.CasaDomainIntelligence.model.facts.some(f=>f.subject==='area.patio'&&f.predicate==='located_on_floor'&&f.object==='1. sal'),'Follow-up creates verified fact');
const d=ctx.CasaDomainIntelligence.discoveryStatus();ok(d.covered>=1,'Discovery coverage updates');
ctx.CasaDomainIntelligence.undoAnswer('patio-floor');ok(ctx.CasaDomainIntelligence.nextClarification()?.id==='patio-floor','Undo reopens original question');
console.log('Domain Verification Queue runtime: 5 kontroller bestået.');
