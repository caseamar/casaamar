(function(){
 "use strict";
 const VERSION="2.0.0";
 const URL="/registry/knowledge-graph.json";
 let cache=null,indexes=null;
 const clone=v=>JSON.parse(JSON.stringify(v));
 const norm=v=>String(v||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim();
 function buildIndexes(data){
  const entityById=new Map((data.entities||[]).map(x=>[x.id,x]));
  const outgoing=new Map(),incoming=new Map();
  for(const rel of data.relations||[]){
   if(!outgoing.has(rel.from))outgoing.set(rel.from,[]); outgoing.get(rel.from).push(rel);
   if(!incoming.has(rel.to))incoming.set(rel.to,[]); incoming.get(rel.to).push(rel);
  }
  return {entityById,outgoing,incoming};
 }
 async function load(options={}){
  if(cache&&!options.force)return cache;
  const response=await fetch(`${URL}?_graph=${Date.now()}`,{cache:"no-store"});
  if(!response.ok)throw new Error(`Knowledge Graph returned HTTP ${response.status}`);
  const data=await response.json(); const report=validate(data);
  if(!report.consistent)throw new Error(`Knowledge Graph is inconsistent: ${report.errors.map(x=>x.code).join(", ")}`);
  cache=data; indexes=buildIndexes(data);
  const detail={...snapshot(),validation:report};
  window.CasaEvents?.publish?.("knowledge-graph:ready",detail);
  window.dispatchEvent(new CustomEvent("casa:knowledge-graph:ready",{detail}));
  return cache;
 }
 function entities(filter={}){return (cache?.entities||[]).filter(x=>(!filter.type||x.type===filter.type)&&(!filter.source||x.source===filter.source)&&(!filter.standaloneOnly||x.standalone===true)).map(clone)}
 function entity(id){const x=indexes?.entityById.get(id);return x?clone(x):null}
 function relations(filter={}){return (cache?.relations||[]).filter(r=>(!filter.from||r.from===filter.from)&&(!filter.to||r.to===filter.to)&&(!filter.type||r.type===filter.type)).map(clone)}
 function neighbours(id,options={}){
  const direction=options.direction||"both",types=new Set(options.types||[]),rows=[];
  if(direction!=="in") for(const relation of indexes?.outgoing.get(id)||[]) if(!types.size||types.has(relation.type)) rows.push({direction:"out",relation:clone(relation),entity:entity(relation.to)});
  if(direction!=="out") for(const relation of indexes?.incoming.get(id)||[]) if(!types.size||types.has(relation.type)) rows.push({direction:"in",relation:clone(relation),entity:entity(relation.from)});
  return rows;
 }
 function search(query,options={}){
  const terms=norm(query).split(/\s+/).filter(Boolean); if(!terms.length)return [];
  return (cache?.entities||[]).map(item=>{const text=norm([item.id,item.display_name,item.type,item.summary,...(item.tags||[])].join(" "));const score=terms.reduce((n,t)=>n+(text.includes(t)?1:0),0);return {entity:item,score}}).filter(x=>x.score).sort((a,b)=>b.score-a.score||a.entity.display_name.localeCompare(b.entity.display_name)).slice(0,options.limit||50).map(x=>clone(x.entity));
 }
 function path(from,to,maxDepth=5,allowedTypes=[]){
  if(from===to)return {nodes:[from],relations:[]}; const allowed=new Set(allowedTypes),queue=[{node:from,nodes:[from],relations:[]}],seen=new Set([from]);
  while(queue.length){const state=queue.shift();if(state.relations.length>=maxDepth)continue;for(const edge of neighbours(state.node,{direction:"out"})){if(allowed.size&&!allowed.has(edge.relation.type))continue;const next=edge.entity?.id;if(!next||seen.has(next))continue;const candidate={node:next,nodes:[...state.nodes,next],relations:[...state.relations,edge.relation]};if(next===to)return {nodes:candidate.nodes,relations:clone(candidate.relations)};seen.add(next);queue.push(candidate)}} return null;
 }
 function recommendations(id,options={}){
  const weights=cache?.recommendation_weights||{}; const limit=options.limit||8; const candidates=new Map();
  for(const edge of neighbours(id,{direction:"out"})){
   const target=edge.entity;if(!target)continue; const base=Number(edge.relation.weight??weights[edge.relation.type]??50); const current=candidates.get(target.id)||{entity:target,score:0,reasons:[]};current.score+=base;current.reasons.push({type:edge.relation.type,label:edge.relation.label||edge.relation.type,weight:base});candidates.set(target.id,current);
  }
  for(const first of neighbours(id,{direction:"out"})) for(const second of neighbours(first.entity?.id,{direction:"out"})){
   if(!second.entity||second.entity.id===id)continue;const base=Math.round(Number(second.relation.weight??weights[second.relation.type]??40)*0.35);const current=candidates.get(second.entity.id)||{entity:second.entity,score:0,reasons:[]};current.score+=base;current.reasons.push({type:"graph-proximity",label:`Via ${first.entity.display_name}`,weight:base});candidates.set(second.entity.id,current);
  }
  return [...candidates.values()].sort((a,b)=>b.score-a.score||a.entity.display_name.localeCompare(b.entity.display_name)).slice(0,limit).map(clone);
 }
 function scoreAsset(asset,intent={}){
  const id=`experience-${asset.id}`; if(!indexes?.entityById.has(id))return {boost:0,reasons:[]}; let boost=0,reasons=[];
  for(const semantic of intent.intents||[]){const intentId=`intent-${semantic}`;const edge=(indexes.outgoing.get(id)||[]).find(r=>r.to===intentId);if(edge){const value=Number(edge.weight||20);boost+=value;reasons.push(`graph:${semantic}:${value}`)}}
  return {boost,reasons};
 }
 function validate(data=cache){
  const errors=[],entities=data?.entities||[],relations=data?.relations||[],entityIds=new Set(),relationIds=new Set(),edgeKeys=new Set(),entityTypes=new Set(data?.entity_types||[]),relationTypes=new Set(data?.relation_types||[]);
  for(const item of entities){if(!item.id||!item.display_name||!item.type)errors.push({code:"incomplete-entity",id:item.id||null});if(entityIds.has(item.id))errors.push({code:"duplicate-entity",id:item.id});entityIds.add(item.id);if(!entityTypes.has(item.type))errors.push({code:"unknown-entity-type",id:item.id,type:item.type})}
  for(const rel of relations){if(!rel.id||!rel.from||!rel.to||!rel.type)errors.push({code:"incomplete-relation",id:rel.id||null});if(relationIds.has(rel.id))errors.push({code:"duplicate-relation",id:rel.id});relationIds.add(rel.id);if(!entityIds.has(rel.from)||!entityIds.has(rel.to))errors.push({code:"unresolved-relation",id:rel.id});if(rel.from===rel.to)errors.push({code:"self-relation",id:rel.id});if(!relationTypes.has(rel.type))errors.push({code:"unknown-relation-type",id:rel.id,type:rel.type});const key=`${rel.from}|${rel.type}|${rel.to}`;if(edgeKeys.has(key))errors.push({code:"duplicate-edge",id:rel.id});edgeKeys.add(key)}
  return {consistent:!errors.length,errors,entity_count:entities.length,relation_count:relations.length};
 }
 function snapshot(){const report=validate();return {version:VERSION,registry_version:cache?.version||null,ready:Boolean(cache),entity_count:cache?.entities?.length||0,relation_count:cache?.relations?.length||0,consistent:report.consistent}}
 window.CasaKnowledgeGraph={version:VERSION,load,entities,entity,relations,neighbours,search,path,recommendations,scoreAsset,validate,snapshot,get data(){return cache}};
 window.CasaCore?.modules?.register?.({id:"ai-knowledge-graph",version:VERSION,capabilities:["graph.entities","graph.relations","graph.search","graph.path","graph.recommendations","graph.discovery-boost","graph.validate"]});
 load().catch(error=>window.CasaEvents?.publish?.("knowledge-graph:error",{message:error.message}));
})();
