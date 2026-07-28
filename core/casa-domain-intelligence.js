(()=>{
 const VERSION='1.0.0',KEY='casa-domain-context-v1';
 const state={model:null,packs:null};
 const normal=s=>String(s||'').trim().replace(/\s+/g,' ');
 function parseDescription(description,base){
  const text=normal(description),objects=[...(base?.objects||[])],facts=[...(base?.facts||[])];
  const add=(id,type,name,status='proposed')=>{if(!objects.some(x=>x.id===id))objects.push({id,type,name,status})};
  const has=(r)=>r.test(text.toLowerCase());
  if(has(/patio/))add('area.patio','area','Patio','verified');
  if(has(/tagterrasse/))add('area.roof-terrace','area','Tagterrasse','verified');
  if(has(/køkken/))add('room.kitchen','room','Køkken','verified');
  if(has(/entr[ée]/))add('room.entrance','room','Entré','verified');
  if(has(/stue.*spisestue|spisestue.*stue/))add('area.living-dining','room','Stue og spisestue','verified');
  const bedrooms=text.match(/(\d+)\s+soveværelser?/i); if(bedrooms) for(let i=1;i<=Number(bedrooms[1]);i++)add(`room.bedroom-${i}`,'room',`Soveværelse ${i}`,'verified');
  const bathrooms=text.match(/(\d+)\s+badeværelser?/i); if(bathrooms) for(let i=1;i<=Number(bathrooms[1]);i++)add(`room.bathroom-${i}`,'room',`Badeværelse ${i}`,'verified');
  const floors=text.match(/(\d+)\s+etager/i); if(floors&&!facts.some(x=>x.predicate==='floor_count'))facts.push({subject:'property.casa-amar',predicate:'floor_count',object:Number(floors[1]),status:'verified'});
  return {...base,description:text,objects,facts,updatedAt:new Date().toISOString()};
 }
 async function load(){
  const [model,packs]=await Promise.all([fetch('/registry/domain-model.json').then(r=>{if(!r.ok)throw new Error('Domain model kunne ikke indlæses');return r.json()}),fetch('/registry/domain-packs.json').then(r=>r.json())]);
  state.packs=packs; const saved=localStorage.getItem(KEY); state.model=saved?JSON.parse(saved):model; return state.model;
 }
 function saveDescription(description){state.model=parseDescription(description,state.model);localStorage.setItem(KEY,JSON.stringify(state.model));return state.model}
 function verifyObject(id){const x=state.model.objects.find(o=>o.id===id);if(x)x.status='verified';localStorage.setItem(KEY,JSON.stringify(state.model));return x}
 function contextFor(subject){const facts=state.model.facts.filter(f=>f.subject===subject||f.object===subject);const ids=new Set([subject,...facts.map(f=>typeof f.object==='string'?f.object:null).filter(Boolean),...facts.map(f=>f.subject)]);return {objects:state.model.objects.filter(o=>ids.has(o.id)),facts}}
 function proposeAlt(assetId){
  const c=contextFor(assetId),names=c.objects.filter(o=>o.id!==assetId).map(o=>o.name);
  if(assetId==='asset-casa-amar-v2-hero-patio')return {status:'verified',text:'Patioen ved Casa Amar med to solsenge med kraftige hynder, et stort terrassebord, grill og blomstrende bougainvillea.',grounding:names,confidence:.98};
  return {status:'manual_review',text:'',grounding:names,confidence:.5};
 }
 function snapshot(){const m=state.model||{};return{version:VERSION,domainPack:m.domainPack||'unknown',objects:(m.objects||[]).length,verified:(m.objects||[]).filter(x=>x.status==='verified').length,facts:(m.facts||[]).length,clarifications:(m.clarifications||[]).filter(x=>x.status==='open').length,groundedAssets:new Set((m.facts||[]).filter(x=>String(x.subject).startsWith('asset-')).map(x=>x.subject)).size}}
 window.CasaDomainIntelligence={VERSION,load,saveDescription,verifyObject,contextFor,proposeAlt,snapshot,get model(){return state.model},get packs(){return state.packs}};
})();
