import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';
const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');const checks=[];const ok=(x,m)=>{if(!x)throw new Error(m);checks.push(m)};
const reg=JSON.parse(fs.readFileSync(path.join(root,'registry/action-orchestrator.json'),'utf8'));ok(reg.version==='1.1.0','Action Orchestrator Registry v1.1.0');ok(reg.governance.recommendation_must_be_actionable===true,'Anbefalinger skal være handlingsklare');ok(Boolean(reg.workspace_routes['asset-intelligence']),'Asset Intelligence route er registreret');
const store=new Map();const location={href:''};const context={console,location,URLSearchParams,localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},fetch:async u=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(path.join(root,String(u).replace(/^\//,'')),'utf8'))}),window:null};context.window=context;context.globalThis=context;vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(root,'core/casa-action-orchestrator.js'),'utf8'),context);await context.CasaActionOrchestrator.load();
const action={key:'asset:asset-casa-amar-v2-hero-patio',title:'Gennemgå asset og alt-tekst',targetWorkspace:'asset-intelligence',targetId:'asset-casa-amar-v2-hero-patio',reason:'Grounded kontekst er ændret',evidence:['Patio contains Grill']};context.CasaActionOrchestrator.registerMany([action]);let list=context.CasaActionOrchestrator.list();ok(list.length===1,'Action registreres');ok(list[0].status==='ready','Ny action er klar');context.CasaActionOrchestrator.defer(list[0].id);ok(context.CasaActionOrchestrator.get(list[0].id).status==='deferred','Action kan udskydes');context.CasaActionOrchestrator.execute(list[0].id,{returnTo:'/domain-intelligence.html#impact'});ok(location.href.includes('/asset-intelligence.html?'),'Udfør nu åbner korrekt workspace');ok(location.href.includes('asset=asset-casa-amar-v2-hero-patio'),'Asset-kontekst overføres');ok(context.CasaActionOrchestrator.get(list[0].id).status==='in_progress','Action sættes i gang');store.set('casa.action-completion',JSON.stringify({actionId:list[0].id,message:'Færdig'}));context.CasaActionOrchestrator.consumeCompletion();ok(context.CasaActionOrchestrator.get(list[0].id).status==='completed','Completion lukker action');

// Regression: Impact Engine emits status "suggested". The orchestrator must normalize it to an actionable READY state.
const impactAction={key:'capability:asset-context',title:'Opdatér grounded AI-kontekst',status:'suggested',targetWorkspace:'asset-intelligence',targetId:'asset-casa-amar-v2-hero-patio',reason:'Impact relation requires review',evidence:['Grill related_to Patio']};
context.CasaActionOrchestrator.registerMany([impactAction]);
const normalized=context.CasaActionOrchestrator.get('action.capability:asset-context');
ok(normalized.status==='ready','Impact-status suggested normaliseres til ready');
// Regression: stale persisted suggested actions are repaired when re-registered.
const stale=JSON.parse(store.get('casa.action-orchestrator.v1'));
stale.actions.find(x=>x.id===normalized.id).status='suggested';store.set('casa.action-orchestrator.v1',JSON.stringify(stale));
context.CasaActionOrchestrator.registerMany([impactAction]);
ok(context.CasaActionOrchestrator.get(normalized.id).status==='ready','Gemt suggested-status migreres til ready');


// Guided batch regression: Start all opens the first action and preserves the remaining queue.
context.CasaActionOrchestrator.registerMany([{key:'batch:one',title:'Første',targetWorkspace:'asset-intelligence',targetId:'asset-one'},{key:'batch:two',title:'Anden',targetWorkspace:'content-intelligence',targetId:'page-two'}]);
context.CasaActionOrchestrator.startBatch(['action.batch:one','action.batch:two'],{returnTo:'/domain-intelligence.html#impact'});
const batch=context.CasaActionOrchestrator.getBatch();ok(batch.pending.length===2,'Start alle gemmer en guidet handlingskø');ok(location.href.includes('action.batch%3Aone'),'Start alle åbner første forbedring');

const html=fs.readFileSync(path.join(root,'domain-intelligence.html'),'utf8');ok(html.includes('Start opgaven'),'Synlig primær CTA findes');ok(html.includes("status:'ready'"),'Impact mapping gør anbefalinger handlingsklare');ok(html.includes("['ready','deferred'].includes(x.status)"),'Ready actions renderer CTA-gruppen');ok(html.includes('Gør senere'),'Udskyd CTA findes');ok(html.includes('Ikke relevant'),'Afvis CTA findes');ok(html.includes('casa-action-orchestrator.js'),'Domain Intelligence bruger orchestrator runtime');const asset=fs.readFileSync(path.join(root,'asset-intelligence.html'),'utf8');ok(asset.includes("routeParams.get('action')"),'Target workspace modtager action-kontekst');ok(asset.includes('casa.action-completion'),'Target workspace returnerer completion-evidens');
console.log(`Action Orchestrator: ${checks.length} checks passed`);
