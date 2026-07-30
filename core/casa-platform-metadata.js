(()=>{
"use strict";
const VERSION="1.0.0";
const MANIFEST_URL="/registry/platform-metadata.json";
const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
const normalize=value=>String(value??"").trim().toLowerCase();
async function loadJson(url){const response=await fetch(url,{cache:"no-store"});if(!response.ok)throw new Error(`${url}: ${response.status}`);return response.json()}
function collectionAt(document,path){const value=path.split(".").reduce((current,key)=>current?.[key],document);if(!Array.isArray(value))throw new Error(`Metadata collection is not an array: ${path}`);return value}
function createRuntime(manifest,documents){
 const types=new Map(),entities=new Map(),byType=new Map(),errors=[],warnings=[];
 for(const descriptor of manifest.entity_types||[]){
  if(types.has(descriptor.id)){errors.push({code:"duplicate_type",type:descriptor.id});continue}types.set(descriptor.id,descriptor);
  const document=documents[descriptor.source];if(!document){errors.push({code:"missing_source",type:descriptor.id,source:descriptor.source});continue}
  let items=[];try{items=collectionAt(document,descriptor.collection)}catch(error){errors.push({code:"missing_collection",type:descriptor.id,source:descriptor.source,collection:descriptor.collection,message:error.message});continue}
  const typed=[];
  for(const item of items){const id=item?.[descriptor.id_field||"id"];if(!id){errors.push({code:"missing_id",type:descriptor.id});continue}const key=`${descriptor.id}:${id}`;if(entities.has(key)){errors.push({code:"duplicate_entity",type:descriptor.id,id});continue}
   const entity={key,type:descriptor.id,id,version:item?.[descriptor.version_field||"version"]||document.version||document.schema_version||null,source:descriptor.source,data:item,semantic_text:(descriptor.semantic_fields||[]).map(field=>item?.[field]).flat(Infinity).filter(Boolean).join(" "),ai_usage:clone(descriptor.ai_usage||[])};
   if(!entity.version)warnings.push({code:"missing_version",type:descriptor.id,id});if(!normalize(entity.semantic_text))warnings.push({code:"missing_semantic_content",type:descriptor.id,id});entities.set(key,entity);typed.push(entity);
  }byType.set(descriptor.id,typed.sort((a,b)=>a.id.localeCompare(b.id)));
 }
 const relationships=[];
 for(const descriptor of types.values())for(const entity of byType.get(descriptor.id)||[])for(const [field,targetType] of Object.entries(descriptor.relationship_fields||{}))for(const targetId of [].concat(entity.data?.[field]||[])){
  const targetKey=`${targetType}:${targetId}`,target=entities.get(targetKey)||null;const relation={from:entity.key,field,to:targetKey,resolved:Boolean(target)};relationships.push(relation);if(!target)errors.push({code:"unresolved_relationship",from:entity.key,field,to:targetKey});
 }
 const get=(type,id)=>clone(entities.get(`${type}:${id}`)||null);
 const list=(type)=>clone(byType.get(type)||[]);
 const search=({text="",type=null,ai_usage=null}={})=>{const needle=normalize(text);return clone([...entities.values()].filter(entity=>(!type||entity.type===type)&&(!ai_usage||entity.ai_usage.includes(ai_usage))&&(!needle||normalize(`${entity.id} ${entity.semantic_text}`).includes(needle))).sort((a,b)=>a.key.localeCompare(b.key)))};
 const relations=(type,id)=>{const key=`${type}:${id}`;return clone(relationships.filter(item=>item.from===key||item.to===key))};
 const impact=(type,id)=>{const start=`${type}:${id}`,seen=new Set([start]),queue=[start],edges=[];while(queue.length){const current=queue.shift();for(const edge of relationships.filter(item=>item.resolved&&(item.from===current||item.to===current))){edges.push(edge);const next=edge.from===current?edge.to:edge.from;if(!seen.has(next)){seen.add(next);queue.push(next)}}}return {root:start,entities:[...seen].map(key=>clone(entities.get(key))).filter(Boolean),relationships:clone(edges)} };
 const validate=()=>({status:errors.length?"fail":warnings.length?"manual_review":"pass",errors:clone(errors),warnings:clone(warnings),summary:{types:types.size,entities:entities.size,relationships:relationships.length,resolved_relationships:relationships.filter(x=>x.resolved).length}});
 const snapshot=()=>({version:VERSION,manifest_version:manifest.version,platform_version:manifest.platform_version,types:[...types.keys()].sort(),entity_counts:Object.fromEntries([...byType.entries()].map(([type,items])=>[type,items.length])),health:validate()});
 return {version:VERSION,manifest:clone(manifest),get,list,search,relationships:relations,impact,validate,snapshot};
}
async function boot(){const manifest=await loadJson(MANIFEST_URL);const sources=[...new Set((manifest.entity_types||[]).map(item=>item.source))];const loaded=await Promise.all(sources.map(async source=>[source,await loadJson(source)]));return createRuntime(manifest,Object.fromEntries(loaded))}
window.CasaPlatformMetadata={VERSION,MANIFEST_URL,boot,createRuntime};
window.dispatchEvent(new CustomEvent("casa:platform-metadata-ready",{detail:{version:VERSION}}));
})();
