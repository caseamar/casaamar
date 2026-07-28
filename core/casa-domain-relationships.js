(()=>{
 const VERSION='1.0.0';
 const state={types:null,model:null,assessment:null};
 const clone=x=>JSON.parse(JSON.stringify(x));
 const typeMap=()=>new Map((state.types?.types||[]).map(x=>[x.id,x]));
 const objectMap=()=>new Map((state.model?.objects||[]).map(x=>[x.id,x]));
 function relationFacts(){return (state.model?.facts||[]).filter(f=>typeMap().has(f.predicate));}
 function validate(){
  const objects=objectMap(),types=typeMap(),errors=[],warnings=[],valid=[];
  for(const r of relationFacts()){
   const def=types.get(r.predicate),subject=objects.get(r.subject),object=objects.get(r.object);
   if(!subject){errors.push(`Ukendt subject: ${r.subject}`);continue}
   if(!object){errors.push(`Ukendt object: ${r.object}`);continue}
   if(!def.allowed_subject_types.includes(subject.type)){errors.push(`${r.predicate} tillader ikke subject-typen ${subject.type}`);continue}
   if(!def.allowed_object_types.includes(object.type)){errors.push(`${r.predicate} tillader ikke object-typen ${object.type}`);continue}
   if(r.status==='derived'&&!(Number(r.confidence)>=0.7&&Number(r.confidence)<=1)){errors.push(`Afledt relation mangler gyldig confidence: ${r.subject} → ${r.object}`);continue}
   if(r.status==='observed'&&r.confidence==null)warnings.push(`Observeret relation mangler confidence: ${r.subject} → ${r.object}`);
   valid.push({...r,subjectObject:subject,objectObject:object,type:def});
  }
  const duplicateKeys=new Set(),duplicates=[];
  for(const r of valid){const key=`${r.subject}|${r.predicate}|${r.object}`;if(duplicateKeys.has(key))duplicates.push(key);duplicateKeys.add(key)}
  if(duplicates.length)errors.push(...duplicates.map(x=>`Dubletrelation: ${x}`));
  const orphanObjects=(state.model?.objects||[]).filter(o=>o.id!=='property.casa-amar'&&!valid.some(r=>r.subject===o.id||r.object===o.id));
  return {status:errors.length?'failed':'verified',errors,warnings,valid,orphanObjects};
 }
 async function load(){
  const [types,model]=await Promise.all([fetch('/registry/relationship-types.json').then(r=>{if(!r.ok)throw new Error('Relationship Registry kunne ikke indlæses');return r.json()}),fetch('/registry/domain-model.json').then(r=>{if(!r.ok)throw new Error('Domain Model kunne ikke indlæses');return r.json()})]);
  state.types=types;state.model=model;state.assessment=validate();return snapshot();
 }
 function useModel(model){if(!model)throw new Error('Aktiv domænemodel mangler');state.model=model;state.assessment=validate();return snapshot();}
 function relationsFor(id,{direction='both',statuses=null}={}){
  const a=state.assessment||validate();return a.valid.filter(r=>(direction==='out'?r.subject===id:direction==='in'?r.object===id:r.subject===id||r.object===id)&&(!statuses||statuses.includes(r.status))).map(clone);
 }
 function traverse(start,{maxDepth=2,statuses=['verified','derived']}={}){
  const seen=new Set([start]),nodes=[start],edges=[],queue=[{id:start,depth:0}];
  while(queue.length){const current=queue.shift();if(current.depth>=maxDepth)continue;for(const r of relationsFor(current.id,{statuses})){const other=r.subject===current.id?r.object:r.subject;edges.push(r);if(!seen.has(other)){seen.add(other);nodes.push(other);queue.push({id:other,depth:current.depth+1})}}}
  const objects=objectMap();return {start,nodes:nodes.map(id=>clone(objects.get(id))).filter(Boolean),edges:clone(edges)};
 }
 function explain(id){
  const objects=objectMap(),subject=objects.get(id);if(!subject)return null;
  const outgoing=relationsFor(id,{direction:'out'}),incoming=relationsFor(id,{direction:'in'});
  return {object:clone(subject),outgoing,incoming,verified:outgoing.filter(x=>x.status==='verified').length,derived:outgoing.filter(x=>x.status==='derived').length,evidence:outgoing.map(r=>`${subject.name} ${r.type.label} ${r.objectObject.name}${r.status==='derived'?` (${Math.round(r.confidence*100)}% afledt)`:''}`)};
 }
 function snapshot(){const a=state.assessment||validate();const rels=a.valid;return {version:VERSION,status:a.status,types:(state.types?.types||[]).length,relationships:rels.length,verified:rels.filter(x=>x.status==='verified').length,derived:rels.filter(x=>x.status==='derived').length,errors:a.errors.length,warnings:a.warnings.length,orphans:a.orphanObjects.length,semantic:rels.filter(x=>x.type.direction==='semantic').length,domainModelVersion:state.model?.version||'unknown'};}
 window.CasaDomainRelationships={VERSION,load,useModel,validate,relationsFor,traverse,explain,snapshot,get model(){return state.model},get registry(){return state.types}};
})();
