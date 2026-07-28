(()=>{
 const VERSION='2.0.0',KEY='casa-domain-context-v1';
 const state={model:null,packs:null};
 const normal=s=>String(s||'').trim().replace(/\s+/g,' ');
 const clone=x=>JSON.parse(JSON.stringify(x));
 const now=()=>new Date().toISOString();
 const DISCOVERY_RULES=[
  {id:'patio-floor',priority:100,subject:'area.patio',predicate:'located_on_floor',type:'yes_no',question:'Er patioen på stueplan?',why:'Oplysningen hjælper AI med at skelne patioen fra tagterrassen og placere billeder korrekt.',yesValue:'ground-floor',noFollowup:{id:'patio-floor-location',question:'Hvor ligger patioen?',why:'AI skal kende den korrekte placering for at beskrive huset præcist.',type:'choice_or_text',options:[{value:'first-floor',label:'1. sal'},{value:'second-floor',label:'2. sal'},{value:'other',label:'Andet'}]},requiredFor:['asset-alt-text','digital-concierge']},
  {id:'patio-private',priority:90,subject:'area.patio',predicate:'access_scope',type:'yes_no',question:'Er patioen privat og kun til Casa Amar?',why:'Det afgør, om AI må beskrive patioen som privat i hjemmeside- og gæstetekster.',yesValue:'private',noFollowup:{id:'patio-sharing',question:'Hvem deles patioen med?',why:'AI skal kende adgangsforholdene, før området beskrives som privat eller fælles.',type:'choice_or_text',options:[{value:'other-homes',label:'Andre boliger'},{value:'community',label:'Fællesområde'},{value:'other',label:'Andet'}]},requiredFor:['website-copy','digital-concierge']},
  {id:'roof-private',priority:85,subject:'area.roof-terrace',predicate:'access_scope',type:'yes_no',question:'Er tagterrassen privat og kun til Casa Amar?',why:'Oplysningen bruges i gæsteinformation, bookingtekster og den digitale concierge.',yesValue:'private',noFollowup:{id:'roof-sharing',question:'Hvem deles tagterrassen med?',why:'AI skal kende adgangsforholdene, før den bruger ord som privat eller fælles.',type:'choice_or_text',options:[{value:'other-homes',label:'Andre boliger'},{value:'community',label:'Fællesområde'},{value:'other',label:'Andet'}]},requiredFor:['website-copy','digital-concierge']},
  {id:'roof-position',priority:70,subject:'area.roof-terrace',predicate:'located_on_floor',type:'yes_no',question:'Ligger tagterrassen øverst i huset?',why:'Placeringen hjælper AI med at forstå husets tre etager og skelne tagterrassen fra øvrige udeområder.',yesValue:'top-floor',noFollowup:{id:'roof-floor-location',question:'Hvor ligger tagterrassen?',why:'AI skal kende den korrekte placering i huset.',type:'choice_or_text',options:[{value:'first-floor',label:'1. sal'},{value:'second-floor',label:'2. sal'},{value:'other',label:'Andet'}]},requiredFor:['spatial-grounding']},
  {id:'grill-type',priority:35,subject:'amenity.patio-grill',predicate:'grill_type',type:'yes_no',question:'Er grillen på patioen en gasgrill?',why:'AI spørger kun, fordi grilltypen kan være relevant i praktisk gæsteinformation.',yesValue:'gasgrill',noFollowup:{id:'grill-type-value',question:'Hvilken type grill er det?',why:'Den præcise grilltype bruges kun, når den er relevant for gæsterne.',type:'choice_or_text',options:[{value:'kulgrill',label:'Kulgrill'},{value:'elektrisk grill',label:'Elektrisk grill'},{value:'other',label:'Andet'}]},requiredFor:['digital-concierge'],optional:true}
 ];
 function persist(){localStorage.setItem(KEY,JSON.stringify(state.model));}
 function parseDescription(description,base){
  const text=normal(description),objects=[...(base?.objects||[])],facts=[...(base?.facts||[])];
  const add=(id,type,name,status='proposed')=>{if(!objects.some(x=>x.id===id))objects.push({id,type,name,status})};
  const has=r=>r.test(text.toLowerCase());
  if(has(/patio/))add('area.patio','area','Patio','verified');
  if(has(/tagterrasse/))add('area.roof-terrace','area','Tagterrasse','verified');
  if(has(/køkken/))add('room.kitchen','room','Køkken','verified');
  if(has(/entr[ée]/))add('room.entrance','room','Entré','verified');
  if(has(/stue.*spisestue|spisestue.*stue/))add('area.living-dining','room','Stue og spisestue','verified');
  const bedrooms=text.match(/(\d+)\s+soveværelser?/i); if(bedrooms)for(let i=1;i<=Number(bedrooms[1]);i++)add(`room.bedroom-${i}`,'room',`Soveværelse ${i}`,'verified');
  const bathrooms=text.match(/(\d+)\s+badeværelser?/i); if(bathrooms)for(let i=1;i<=Number(bathrooms[1]);i++)add(`room.bathroom-${i}`,'room',`Badeværelse ${i}`,'verified');
  const floors=text.match(/(\d+)\s+etager/i); if(floors&&!facts.some(x=>x.subject==='property.casa-amar'&&x.predicate==='floor_count'))facts.push({subject:'property.casa-amar',predicate:'floor_count',object:Number(floors[1]),status:'verified'});
  return {...base,description:text,objects,facts,updatedAt:now()};
 }
 function mergeClarifications(savedList=[],canonicalList=[]){
  const savedById=new Map(savedList.map(q=>[q.id,q]));
  const merged=canonicalList.map(def=>({...def,...(savedById.get(def.id)||{})}));
  for(const q of savedList)if(!merged.some(x=>x.id===q.id))merged.push(q);
  return merged;
 }
 function fact(subject,predicate){return (state.model?.facts||[]).find(f=>f.subject===subject&&f.predicate===predicate&&f.status==='verified')||null}
 function questionForRule(rule){return (state.model?.clarifications||[]).find(q=>q.ruleId===rule.id||q.id===rule.id)||null}
 function addQuestion(rule){
  const list=state.model.clarifications||(state.model.clarifications=[]);
  const q={id:rule.id,ruleId:rule.id,source:'discovery-engine',discoveredAt:now(),priority:rule.priority,type:rule.type,question:rule.question,why:rule.why,subject:rule.subject,predicate:rule.predicate,yesValue:rule.yesValue,noFollowup:rule.noFollowup,requiredFor:rule.requiredFor,optional:!!rule.optional,status:'open'};
  list.push(q); return q;
 }
 function runDiscovery({force=false}={}){
  if(!state.model)throw new Error('Domain Intelligence er ikke indlæst');
  const created=[];
  for(const rule of [...DISCOVERY_RULES].sort((a,b)=>b.priority-a.priority)){
   if(fact(rule.subject,rule.predicate))continue;
   const existing=questionForRule(rule);
   if(existing){
    if(force&&['unknown','deferred'].includes(existing.status)){existing.status='open';existing.reopenedAt=now()}
    continue;
   }
   created.push(addQuestion(rule));
  }
  state.model.discovery={version:'1.0.0',lastRunAt:now(),rulesEvaluated:DISCOVERY_RULES.length,created:created.length,trigger:force?'manual':'automatic'};
  persist(); return {created,status:discoveryStatus(),next:nextClarification()};
 }
 function discoveryStatus(){
  const required=DISCOVERY_RULES.filter(r=>!r.optional),covered=required.filter(r=>!!fact(r.subject,r.predicate)).length;
  const queue=verificationQueue();
  return {lastRunAt:state.model?.discovery?.lastRunAt||null,rules:DISCOVERY_RULES.length,required:required.length,covered,coverage:Math.round(covered/required.length*100),open:queue.open.length,deferred:queue.deferred.length,unknown:queue.unknown.length,sufficientForCurrentTasks:required.filter(r=>r.priority>=80).every(r=>!!fact(r.subject,r.predicate)),next:queue.next};
 }
 async function load(){
  const [model,packs]=await Promise.all([
   fetch('/registry/domain-model.json').then(r=>{if(!r.ok)throw new Error('Domain model kunne ikke indlæses');return r.json()}),
   fetch('/registry/domain-packs.json').then(r=>r.json())
  ]);
  state.packs=packs; const saved=localStorage.getItem(KEY); const restored=saved?JSON.parse(saved):clone(model);
  restored.clarifications=mergeClarifications(restored.clarifications||[],model.clarifications||[]);
  restored.objects=restored.objects||clone(model.objects||[]); restored.facts=restored.facts||clone(model.facts||[]);
  state.model=restored; runDiscovery(); persist(); return state.model;
 }
 function saveDescription(description){state.model=parseDescription(description,state.model);runDiscovery();persist();return state.model}
 function verifyObject(id){const x=state.model.objects.find(o=>o.id===id);if(x)x.status='verified';persist();return x}
 function upsertFact(subject,predicate,object,status='verified',source='human-verification',sourceQuestionId=''){
  const facts=state.model.facts||(state.model.facts=[]); const found=facts.find(f=>f.subject===subject&&f.predicate===predicate);
  const next={subject,predicate,object,status,source,sourceQuestionId,verifiedAt:now()};
  if(found)Object.assign(found,next);else facts.push(next); return next;
 }
 function addFollowup(parent,def){
  const list=state.model.clarifications||(state.model.clarifications=[]); let found=list.find(x=>x.id===def.id);
  const data={id:def.id,ruleId:parent.ruleId,source:'adaptive-clarification',parentQuestionId:parent.id,priority:(parent.priority||0)+1000,type:def.type,question:def.question,why:def.why,subject:parent.subject,predicate:parent.predicate,options:def.options,status:'open',createdAt:now()};
  if(found){Object.assign(found,data,{answer:null,answeredAt:null});list.splice(list.indexOf(found),1)}else found=data;
  const parentIndex=list.findIndex(x=>x.id===parent.id);list.splice(parentIndex>=0?parentIndex+1:0,0,found);return found;
 }
 function answerClarification(id,answer,value=''){
  const q=(state.model.clarifications||[]).find(x=>x.id===id); if(!q)throw new Error('Afklaringen findes ikke');
  if(q.status!=='open')return {question:q,next:nextClarification(),message:'Svaret er allerede registreret.'};
  const a=normal(answer).toLowerCase(); q.answer=a; q.answeredAt=now(); let message='Svaret er gemt.';
  if(a==='yes'){
   if(q.subject&&q.predicate)upsertFact(q.subject,q.predicate,q.yesValue??true,'verified','human-verification',q.id);
   q.status='resolved'; message=`${q.question.replace(/\?$/,'')} er bekræftet.`;
  }else if(a==='no'){
   q.status='resolved'; if(q.noFollowup)addFollowup(q,q.noFollowup); message=q.noFollowup?'Tak. AI stiller nu ét relevant opfølgende spørgsmål.':'Tak. Oplysningen er registreret.';
  }else if(a==='unknown'){
   q.status='unknown'; message='Registreret som ukendt. AI bruger ikke oplysningen som et faktum.';
  }else if(a==='skip'){
   q.status='deferred'; q.deferredAt=now(); message='Spørgsmålet er udskudt og kan besvares senere.';
  }else if(a==='value'){
   const clean=normal(value); if(!clean)throw new Error('Vælg eller skriv et svar');
   upsertFact(q.subject,q.predicate,clean,'verified','human-verification',q.id); q.status='resolved'; q.value=clean; message=`Registreret: ${clean}.`;
  }else throw new Error('Ukendt svar');
  runDiscovery(); persist(); return {question:q,next:nextClarification(),message,snapshot:snapshot(),discovery:discoveryStatus()};
 }
 function undoAnswer(id){
  const q=(state.model.clarifications||[]).find(x=>x.id===id); if(!q)throw new Error('Svaret findes ikke');
  state.model.facts=(state.model.facts||[]).filter(f=>f.sourceQuestionId!==id);
  state.model.clarifications=(state.model.clarifications||[]).filter(x=>x.parentQuestionId!==id);
  Object.assign(q,{status:'open',answer:null,value:null,answeredAt:null,deferredAt:null});
  persist(); return {next:q,message:'Svaret er fortrudt. Spørgsmålet er åbnet igen.',snapshot:snapshot()};
 }
 function reopenDeferred(){for(const q of state.model.clarifications||[])if(q.status==='deferred')q.status='open';persist()}
 function nextClarification(){return (state.model?.clarifications||[]).filter(q=>q.status==='open').sort((a,b)=>(b.priority||0)-(a.priority||0))[0]||null}
 function verificationQueue(){const qs=state.model?.clarifications||[];return{open:qs.filter(q=>q.status==='open'),resolved:qs.filter(q=>q.status==='resolved'),deferred:qs.filter(q=>q.status==='deferred'),unknown:qs.filter(q=>q.status==='unknown'),next:nextClarification()}}
 function contextFor(subject){const facts=(state.model?.facts||[]).filter(f=>f.subject===subject||f.object===subject);const ids=new Set([subject,...facts.map(f=>typeof f.object==='string'?f.object:null).filter(Boolean),...facts.map(f=>f.subject)]);return{objects:(state.model?.objects||[]).filter(o=>ids.has(o.id)),facts}}
 function proposeAlt(assetId){const c=contextFor(assetId),names=c.objects.filter(o=>o.id!==assetId).map(o=>o.name);if(assetId==='asset-casa-amar-v2-hero-patio')return{status:'verified',text:'Patioen ved Casa Amar med to solsenge med kraftige hynder, et stort terrassebord, grill og blomstrende bougainvillea.',grounding:names,confidence:.98};return{status:'manual_review',text:'',grounding:names,confidence:.5}}
 function snapshot(){const m=state.model||{},q=verificationQueue(),d=discoveryStatus();return{version:VERSION,domainPack:m.domainPack||'unknown',objects:(m.objects||[]).length,verified:(m.objects||[]).filter(x=>x.status==='verified').length,facts:(m.facts||[]).length,clarifications:q.open.length,resolvedClarifications:q.resolved.length,deferredClarifications:q.deferred.length,discoveryCoverage:d.coverage,groundedAssets:new Set((m.facts||[]).filter(x=>String(x.subject).startsWith('asset-')).map(x=>x.subject)).size}}
 window.CasaDomainIntelligence={VERSION,load,saveDescription,verifyObject,runDiscovery,discoveryStatus,answerClarification,undoAnswer,reopenDeferred,nextClarification,verificationQueue,contextFor,proposeAlt,snapshot,get model(){return state.model},get packs(){return state.packs}};
})();
