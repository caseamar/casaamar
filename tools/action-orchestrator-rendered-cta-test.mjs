import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';
const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');const checks=[];const ok=(x,m)=>{if(!x)throw new Error(m);checks.push(m)};
const store=new Map();const context={console,location:{href:''},URLSearchParams,localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},fetch:async u=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(path.join(root,String(u).replace(/^\//,'')),'utf8'))}),window:null};context.window=context;context.globalThis=context;vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(root,'core/casa-action-orchestrator.js'),'utf8'),context);await context.CasaActionOrchestrator.load();
context.CasaActionOrchestrator.registerMany([{key:'impact:test',title:'Test handling',status:'suggested',targetWorkspace:'asset-intelligence',targetId:'asset-casa-amar-v2-hero-patio'}]);
const a=context.CasaActionOrchestrator.list()[0];ok(a.status==='ready','Suggested impact action bliver READY');
const html=fs.readFileSync(path.join(root,'domain-intelligence.html'),'utf8');ok(html.includes('executeAction'),'Start opgaven handler findes');ok(html.includes('impact-actions'),'CTA container findes');ok(html.includes("['ready','deferred'].includes(x.status)"),'READY er en synlig CTA-tilstand');
const shouldRender=['ready','deferred'].includes(a.status);ok(shouldRender,'Runtime action opfylder render-betingelsen for Start opgaven');
console.log(`Action Orchestrator rendered CTA: ${checks.length} checks passed`);
