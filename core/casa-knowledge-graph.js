(function(){
 "use strict";
 const VERSION="1.0.0";
 const URL="/registry/knowledge-graph.json";
 let cache=null;
 const clone=value=>JSON.parse(JSON.stringify(value));
 const byId=(items,id)=>items.find(item=>item.id===id)||null;
 async function load(options={}){
  if(cache&&!options.force)return cache;
  const response=await fetch(`${URL}?_graph=${Date.now()}`,{cache:"no-store"});
  if(!response.ok)throw new Error(`AI Knowledge Graph returned HTTP ${response.status}`);
  cache=await response.json();
  const report=validate(cache);
  if(!report.consistent)throw new Error(`AI Knowledge Graph is inconsistent: ${report.errors.map(x=>x.code).join(", ")}`);
  const detail={...snapshot(),validation:report};
  window.CasaEvents?.publish?.("knowledge-graph:ready",detail);
  window.dispatchEvent(new CustomEvent("casa:knowledge-graph:ready",{detail}));
  return cache;
 }
 function entities(filter={}){return (cache?.entities||[]).filter(entity=>(!filter.type||entity.type===filter.type)&&(!filter.standaloneOnly||entity.standalone===true)).map(clone);}
 function entity(id){const value=byId(cache?.entities||[],id);return value?clone(value):null;}
 function relations(filter={}){return (cache?.relations||[]).filter(rel=>(!filter.from||rel.from===filter.from)&&(!filter.to||rel.to===filter.to)&&(!filter.type||rel.type===filter.type)).map(clone);}
 function neighbours(id,options={}){
  const direction=options.direction||"both";
  const edges=(cache?.relations||[]).filter(rel=>(direction!=="in"&&rel.from===id)||(direction!=="out"&&rel.to===id));
  return edges.map(rel=>({relation:clone(rel),entity:clone(entity(rel.from===id?rel.to:rel.from))}));
 }
 function search(query,options={}){
  const term=String(query||"").trim().toLowerCase();
  if(!term)return [];
  return (cache?.entities||[]).filter(item=>[item.id,item.display_name,item.type,item.source_ref].filter(Boolean).some(value=>String(value).toLowerCase().includes(term))).slice(0,options.limit||50).map(clone);
 }
 function path(from,to,maxDepth=4){
  if(from===to)return [from];
  const queue=[[from]],visited=new Set([from]);
  while(queue.length){const current=queue.shift();if(current.length>maxDepth)continue;const last=current[current.length-1];for(const next of neighbours(last).map(x=>x.entity?.id).filter(Boolean)){if(visited.has(next))continue;const candidate=[...current,next];if(next===to)return candidate;visited.add(next);queue.push(candidate);}}
  return null;
 }
 function validate(data=cache){
  const errors=[],entities=data?.entities||[],relations=data?.relations||[];
  const entityIds=new Set(),relationIds=new Set(),edgeKeys=new Set();
  const entityTypes=new Set(data?.entity_types||[]),relationTypes=new Set(data?.relation_types||[]);
  for(const item of entities){if(!item.id||!item.display_name||!item.type)errors.push({code:"incomplete-entity",id:item.id||null});if(entityIds.has(item.id))errors.push({code:"duplicate-entity",id:item.id});entityIds.add(item.id);if(!entityTypes.has(item.type))errors.push({code:"unknown-entity-type",id:item.id,type:item.type});}
  for(const rel of relations){if(!rel.id||!rel.from||!rel.to||!rel.type)errors.push({code:"incomplete-relation",id:rel.id||null});if(relationIds.has(rel.id))errors.push({code:"duplicate-relation",id:rel.id});relationIds.add(rel.id);if(!entityIds.has(rel.from)||!entityIds.has(rel.to))errors.push({code:"unresolved-relation",id:rel.id});if(rel.from===rel.to)errors.push({code:"self-relation",id:rel.id});if(!relationTypes.has(rel.type))errors.push({code:"unknown-relation-type",id:rel.id,type:rel.type});const edge=`${rel.from}|${rel.type}|${rel.to}`;if(edgeKeys.has(edge))errors.push({code:"duplicate-edge",id:rel.id});edgeKeys.add(edge);}
  const connected=new Set(relations.flatMap(rel=>[rel.from,rel.to]));
  const orphans=entities.filter(item=>!connected.has(item.id)&&item.standalone!==true).map(item=>item.id);
  for(const id of orphans)errors.push({code:"orphan-entity",id});
  return {consistent:errors.length===0,errors,entity_count:entities.length,relation_count:relations.length,orphan_count:orphans.length};
 }
 function snapshot(){const report=validate();return {version:VERSION,registry_version:cache?.version||null,ready:Boolean(cache),entity_count:cache?.entities?.length||0,relation_count:cache?.relations?.length||0,entity_types:[...(cache?.entity_types||[])],relation_types:[...(cache?.relation_types||[])],consistent:report.consistent};}
 window.CasaKnowledgeGraph={version:VERSION,load,entities,entity,relations,neighbours,search,path,validate,snapshot,get data(){return cache}};
 window.CasaCore?.modules?.register?.({id:"ai-knowledge-graph",version:VERSION,capabilities:["graph.entities","graph.relations","graph.search","graph.path","graph.validate","graph.snapshot"]});
 load().catch(error=>window.CasaEvents?.publish?.("knowledge-graph:error",{message:error.message}));
})();
