(function(){
 "use strict";
 const VERSION="1.0.0";
 const URL="/registry/semantic-knowledge.json";
 let cache=null,index=null;
 const clone=value=>JSON.parse(JSON.stringify(value));
 const normalize=value=>String(value??"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9._-]+/g," ").trim();
 const asTime=value=>value?Date.parse(value):null;
 function build(data){
  return {
   sources:new Map((data.sources||[]).map(x=>[x.id,x])),
   evidence:new Map((data.evidence||[]).map(x=>[x.id,x])),
   claims:new Map((data.claims||[]).map(x=>[x.id,x])),
   outgoing:new Map(),incoming:new Map()
  };
 }
 function indexRelations(data,target){
  for(const relation of data.relations||[]){
   if(!target.outgoing.has(relation.from))target.outgoing.set(relation.from,[]);
   if(!target.incoming.has(relation.to))target.incoming.set(relation.to,[]);
   target.outgoing.get(relation.from).push(relation);
   target.incoming.get(relation.to).push(relation);
  }
 }
 function validate(data=cache){
  const errors=[],warnings=[];
  if(!data)return {valid:false,errors:[{code:"not-loaded"}],warnings};
  const sourceIds=new Set(),evidenceIds=new Set(),claimIds=new Set(),relationIds=new Set();
  for(const source of data.sources||[]){if(!source.id||!source.uri||!source.authority)errors.push({code:"invalid-source",id:source.id||null});if(sourceIds.has(source.id))errors.push({code:"duplicate-source",id:source.id});sourceIds.add(source.id)}
  for(const evidence of data.evidence||[]){if(!evidence.id||!evidence.source_id||!evidence.locator||!evidence.content_hash)errors.push({code:"invalid-evidence",id:evidence.id||null});if(evidenceIds.has(evidence.id))errors.push({code:"duplicate-evidence",id:evidence.id});evidenceIds.add(evidence.id);if(!sourceIds.has(evidence.source_id))errors.push({code:"unknown-evidence-source",id:evidence.id,source_id:evidence.source_id})}
  for(const claim of data.claims||[]){
   if(!claim.id||!claim.subject||!claim.predicate||!claim.statement)errors.push({code:"invalid-claim",id:claim.id||null});
   if(claimIds.has(claim.id))errors.push({code:"duplicate-claim",id:claim.id});claimIds.add(claim.id);
   if(!Number.isFinite(claim.confidence)||claim.confidence<0||claim.confidence>1)errors.push({code:"invalid-confidence",id:claim.id});
   if(!Array.isArray(claim.evidence_ids)||!claim.evidence_ids.length)errors.push({code:"claim-without-evidence",id:claim.id});
   for(const id of claim.evidence_ids||[])if(!evidenceIds.has(id))errors.push({code:"unknown-claim-evidence",id:claim.id,evidence_id:id});
   if(claim.valid_from&&Number.isNaN(asTime(claim.valid_from)))errors.push({code:"invalid-valid-from",id:claim.id});
   if(claim.valid_to&&Number.isNaN(asTime(claim.valid_to)))errors.push({code:"invalid-valid-to",id:claim.id});
   if(claim.valid_from&&claim.valid_to&&asTime(claim.valid_from)>asTime(claim.valid_to))errors.push({code:"invalid-validity-window",id:claim.id});
   if(claim.confidence<(data.confidence_model?.review_threshold??0.6))warnings.push({code:"low-confidence-review",id:claim.id});
  }
  for(const relation of data.relations||[]){if(!relation.id||!relation.from||!relation.to||!relation.type)errors.push({code:"invalid-relation",id:relation.id||null});if(relationIds.has(relation.id))errors.push({code:"duplicate-relation",id:relation.id});relationIds.add(relation.id);if(!claimIds.has(relation.from)||!claimIds.has(relation.to))errors.push({code:"unresolved-relation",id:relation.id})}
  return {valid:errors.length===0,errors,warnings,counts:{sources:sourceIds.size,evidence:evidenceIds.size,claims:claimIds.size,relations:relationIds.size}};
 }
 async function load(options={}){
  if(cache&&!options.force)return cache;
  const response=await fetch(`${URL}?_knowledge=${Date.now()}`,{cache:"no-store"});
  if(!response.ok)throw new Error(`Semantic Knowledge returned HTTP ${response.status}`);
  const data=await response.json();const report=validate(data);if(!report.valid)throw new Error(`Semantic Knowledge is invalid: ${report.errors.map(x=>x.code).join(", ")}`);
  cache=data;index=build(data);indexRelations(data,index);
  const detail={...snapshot(),validation:report};window.CasaEvents?.publish?.("knowledge-runtime:ready",detail);window.dispatchEvent(new CustomEvent("casa:knowledge-runtime:ready",{detail}));return cache;
 }
 function isValidAt(claim,validAt){const time=asTime(validAt||new Date().toISOString());return (!claim.valid_from||asTime(claim.valid_from)<=time)&&(!claim.valid_to||asTime(claim.valid_to)>=time)}
 function claim(id){const item=index?.claims.get(id);return item?clone(item):null}
 function provenance(id){const item=index?.claims.get(id);if(!item)return null;const evidence=(item.evidence_ids||[]).map(evidenceId=>{const e=index.evidence.get(evidenceId);const source=e?index.sources.get(e.source_id):null;return e?{evidence:clone(e),source:source?clone(source):null}:null}).filter(Boolean);return {claim:clone(item),evidence,explanation:`${evidence.length} evidence item(s) support this claim.`}}
 function list(filters={}){return (cache?.claims||[]).filter(item=>(!filters.status||item.status===filters.status)&&(!filters.subject||item.subject===filters.subject)&&(!filters.predicate||item.predicate===filters.predicate)&&((filters.minimum_confidence??0)<=item.confidence)&&(!filters.tags||filters.tags.every(tag=>(item.tags||[]).includes(tag)))&&(!filters.valid_at||isValidAt(item,filters.valid_at))).map(clone)}
 function search(query,options={}){
  const terms=normalize(query).split(/\s+/).filter(Boolean),minimum=options.minimum_confidence??0,validAt=options.valid_at||new Date().toISOString();if(!terms.length)return [];
  return (cache?.claims||[]).filter(x=>x.confidence>=minimum&&isValidAt(x,validAt)).map(item=>{const fields=[item.id,item.subject,item.predicate,item.object,item.statement,...(item.tags||[])].map(normalize);let score=0;const matches=[];for(const term of terms){const hits=fields.filter(value=>value.includes(term)).length;if(hits){score+=hits;matches.push(term)}}score*=0.5+item.confidence;return {id:item.id,score:Number(score.toFixed(3)),matches,claim:clone(item)}}).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||b.claim.confidence-a.claim.confidence||a.id.localeCompare(b.id)).slice(0,options.limit||20);
 }
 function lineage(id,options={}){const direction=options.direction||"both",depth=Math.max(1,Math.min(options.depth||3,8)),queue=[{id,level:0}],seen=new Set([id]),nodes=[],relations=[];while(queue.length){const current=queue.shift();const edges=[];if(direction!=="in")edges.push(...(index?.outgoing.get(current.id)||[]).map(x=>({edge:x,next:x.to})));if(direction!=="out")edges.push(...(index?.incoming.get(current.id)||[]).map(x=>({edge:x,next:x.from})));for(const row of edges){relations.push(clone(row.edge));if(!seen.has(row.next)&&current.level<depth){seen.add(row.next);nodes.push(claim(row.next));queue.push({id:row.next,level:current.level+1})}}}return {root:claim(id),nodes:nodes.filter(Boolean),relations};}
 function assembleContext(query,options={}){const results=search(query,options);return {query,generated_at:new Date().toISOString(),retrieval_mode:"deterministic-lexical-fallback",claims:results.map(row=>provenance(row.id)),average_confidence:results.length?Number((results.reduce((n,x)=>n+x.claim.confidence,0)/results.length).toFixed(3)):0,requires_review:results.some(x=>x.claim.confidence<(cache?.confidence_model?.review_threshold??0.6)),explanation:`Retrieved ${results.length} evidence-backed claim(s) using deterministic lexical ranking.`};}
 function snapshot(){const report=validate();return {version:VERSION,registry_version:cache?.version||null,ready:Boolean(cache),valid:report.valid,...(report.counts||{sources:0,evidence:0,claims:0,relations:0}),warnings:report.warnings?.length||0};}
 window.CasaSemanticKnowledge={version:VERSION,load,validate,claim,list,search,provenance,lineage,assembleContext,snapshot,get data(){return cache}};
 window.CasaCore?.modules?.register?.({id:"semantic-knowledge-runtime",version:VERSION,capabilities:["knowledge.claims","knowledge.provenance","knowledge.search","knowledge.lineage","knowledge.context","knowledge.validate"]});
 load().catch(error=>window.CasaEvents?.publish?.("knowledge-runtime:error",{message:error.message}));
})();
