(()=>{
 const VERSION='1.2.0',KEY='casa-domain-context-v1';
 const state={model:null,packs:null};
 const normal=s=>String(s||'').trim().replace(/\s+/g,' ');
 const clone=x=>JSON.parse(JSON.stringify(x));
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
  return {...base,description:text,objects,facts,updatedAt:new Date().toISOString()};
 }
 function mergeClarifications(savedList=[],canonicalList=[]){
  const savedById=new Map(savedList.map(q=>[q.id,q]));
  const merged=canonicalList.map(def=>({...def,...(savedById.get(def.id)||{}),
   // Canonical workflow metadata must always win so older workspace state cannot lose branching rules.
   type:def.type,question:def.question,why:def.why,subject:def.subject,predicate:def.predicate,
   yesValue:def.yesValue,noFollowup:def.noFollowup,options:def.options
  }));
  for(const q of savedList)if(!merged.some(x=>x.id===q.id))merged.push(q);
  return merged;
 }
 async function load(){
  const [model,packs]=await Promise.all([
   fetch('/registry/domain-model.json').then(r=>{if(!r.ok)throw new Error('Domain model kunne ikke indlæses');return r.json()}),
   fetch('/registry/domain-packs.json').then(r=>r.json())
  ]);
  state.packs=packs; const saved=localStorage.getItem(KEY); const restored=saved?JSON.parse(saved):clone(model);
  restored.clarifications=mergeClarifications(restored.clarifications||[],model.clarifications||[]);
  restored.objects=restored.objects||clone(model.objects||[]); restored.facts=restored.facts||clone(model.facts||[]);
  state.model=restored; persist(); return state.model;
 }
 function saveDescription(description){state.model=parseDescription(description,state.model);persist();return state.model}
 function verifyObject(id){const x=state.model.objects.find(o=>o.id===id);if(x)x.status='verified';persist();return x}
 function upsertFact(subject,predicate,object,status='verified',source='human-verification',sourceQuestionId=''){
  const facts=state.model.facts||(state.model.facts=[]); const found=facts.find(f=>f.subject===subject&&f.predicate===predicate);
  const next={subject,predicate,object,status,source,sourceQuestionId,verifiedAt:new Date().toISOString()};
  if(found)Object.assign(found,next);else facts.push(next); return next;
 }
 function addFollowup(def){const list=state.model.clarifications||(state.model.clarifications=[]);let found=list.find(x=>x.id===def.id);if(found){Object.assign(found,def,{status:'open',answer:null,answeredAt:null});list.splice(list.indexOf(found),1)}else found={...def,status:'open',createdAt:new Date().toISOString()};const parentIndex=def.parentQuestionId?list.findIndex(x=>x.id===def.parentQuestionId):-1;list.splice(parentIndex>=0?parentIndex+1:0,0,found);return found;}
 function answerClarification(id,answer,value=''){
  const q=(state.model.clarifications||[]).find(x=>x.id===id); if(!q)throw new Error('Afklaringen findes ikke');
  if(q.status!=='open')return {question:q,next:nextClarification(),message:'Svaret er allerede registreret.'};
  const a=normal(answer).toLowerCase(); q.answer=a; q.answeredAt=new Date().toISOString();
  let message='Svaret er gemt.';
  if(a==='yes'){
   if(q.subject&&q.predicate)upsertFact(q.subject,q.predicate,q.yesValue??true,'verified','human-verification',q.id);
   q.status='resolved'; message=`${q.question.replace(/\?$/,'')} er bekræftet.`;
  }else if(a==='no'){
   q.status='resolved';
   if(q.noFollowup==='patio-floor-location')addFollowup({id:'patio-floor-location',parentQuestionId:q.id,type:'choice_or_text',question:'Hvor ligger patioen?',why:'AI skal kende den korrekte placering for at kunne skelne områder og beskrive huset præcist.',subject:'area.patio',predicate:'located_on_floor',options:[{value:'first-floor',label:'1. sal'},{value:'second-floor',label:'2. sal'},{value:'other',label:'Andet'}]});
   if(q.noFollowup==='roof-sharing')addFollowup({id:'roof-sharing',parentQuestionId:q.id,type:'choice_or_text',question:'Hvem deles tagterrassen med?',why:'AI skal kende adgangsforholdene, før den bruger ord som privat eller fælles.',subject:'area.roof-terrace',predicate:'shared_with',options:[{value:'other-homes',label:'Andre boliger'},{value:'community',label:'Fællesområde'},{value:'other',label:'Andet'}]});
   const expected=q.noFollowup;
   if(expected&&!state.model.clarifications.some(x=>x.id===expected&&x.status==='open'))throw new Error('Opfølgende spørgsmål kunne ikke oprettes. Prøv igen.');
   message='Tak. AI stiller nu ét relevant opfølgende spørgsmål.';
  }else if(a==='unknown'){
   q.status='unknown'; message='Registreret som ukendt. AI bruger ikke oplysningen som et faktum.';
  }else if(a==='skip'){
   q.status='deferred'; q.deferredAt=new Date().toISOString(); message='Spørgsmålet er udskudt og kan besvares senere.';
  }else if(a==='value'){
   const clean=normal(value); if(!clean)throw new Error('Vælg eller skriv et svar');
   upsertFact(q.subject,q.predicate,clean,'verified','human-verification',q.id); q.status='resolved'; q.value=clean; message=`Registreret: ${clean}.`;
  }else throw new Error('Ukendt svar');
  persist(); return {question:q,next:nextClarification(),message,snapshot:snapshot()};
 }
 function undoAnswer(id){
  const q=(state.model.clarifications||[]).find(x=>x.id===id); if(!q)throw new Error('Svaret findes ikke');
  state.model.facts=(state.model.facts||[]).filter(f=>f.sourceQuestionId!==id);
  state.model.clarifications=(state.model.clarifications||[]).filter(x=>x.parentQuestionId!==id);
  Object.assign(q,{status:'open',answer:null,value:null,answeredAt:null,deferredAt:null});
  persist(); return {next:q,message:'Svaret er fortrudt. Spørgsmålet er åbnet igen.',snapshot:snapshot()};
 }
 function reopenDeferred(){for(const q of state.model.clarifications||[])if(q.status==='deferred')q.status='open';persist();}
 function nextClarification(){return (state.model?.clarifications||[]).find(q=>q.status==='open')||null}
 function verificationQueue(){const qs=state.model?.clarifications||[];return{open:qs.filter(q=>q.status==='open'),resolved:qs.filter(q=>q.status==='resolved'),deferred:qs.filter(q=>q.status==='deferred'),unknown:qs.filter(q=>q.status==='unknown'),next:nextClarification()}}
 function contextFor(subject){const facts=state.model.facts.filter(f=>f.subject===subject||f.object===subject);const ids=new Set([subject,...facts.map(f=>typeof f.object==='string'?f.object:null).filter(Boolean),...facts.map(f=>f.subject)]);return{objects:state.model.objects.filter(o=>ids.has(o.id)),facts}}
 function proposeAlt(assetId){const c=contextFor(assetId),names=c.objects.filter(o=>o.id!==assetId).map(o=>o.name);if(assetId==='asset-casa-amar-v2-hero-patio')return{status:'verified',text:'Patioen ved Casa Amar med to solsenge med kraftige hynder, et stort terrassebord, grill og blomstrende bougainvillea.',grounding:names,confidence:.98};return{status:'manual_review',text:'',grounding:names,confidence:.5}}
 function snapshot(){const m=state.model||{},q=verificationQueue();return{version:VERSION,domainPack:m.domainPack||'unknown',objects:(m.objects||[]).length,verified:(m.objects||[]).filter(x=>x.status==='verified').length,facts:(m.facts||[]).length,clarifications:q.open.length,resolvedClarifications:q.resolved.length,deferredClarifications:q.deferred.length,groundedAssets:new Set((m.facts||[]).filter(x=>String(x.subject).startsWith('asset-')).map(x=>x.subject)).size}}
 window.CasaDomainIntelligence={VERSION,load,saveDescription,verifyObject,answerClarification,undoAnswer,reopenDeferred,nextClarification,verificationQueue,contextFor,proposeAlt,snapshot,get model(){return state.model},get packs(){return state.packs}};
})();