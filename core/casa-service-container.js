(()=>{
"use strict";
const VERSION="1.0.0";
const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
function createContainer({bindings=[],metadata=null,strict=true}={}){
 const definitions=new Map(),singletons=new Map(),resolutionStack=[];
 const validateDefinition=definition=>{
  if(!definition?.id)throw new Error("Service binding requires a stable id.");
  if(!definition.contract_id)throw new Error(`Service binding requires contract_id: ${definition.id}`);
  if(!["singleton","transient"].includes(definition.scope||"singleton"))throw new Error(`Unsupported service scope: ${definition.scope}`);
  if(!definition.implementation_id)throw new Error(`Service binding requires implementation_id: ${definition.id}`);
  if(metadata&&strict&&!metadata.get("service",definition.implementation_id))throw new Error(`Unknown service implementation: ${definition.implementation_id}`);
 };
 function register(definition,factory,{replace=false}={}){
  validateDefinition(definition);if(typeof factory!=="function")throw new Error(`Service factory must be a function: ${definition.id}`);
  if(definitions.has(definition.id)&&!replace)throw new Error(`Service binding already registered: ${definition.id}`);
  if(replace&&!definition.replaceable)throw new Error(`Service binding is not replaceable: ${definition.id}`);
  definitions.set(definition.id,{...clone(definition),scope:definition.scope||"singleton",factory});singletons.delete(definition.id);
  return ()=>{definitions.delete(definition.id);singletons.delete(definition.id)};
 }
 function resolve(id,context={}){
  const definition=definitions.get(id);if(!definition)throw new Error(`Unknown service binding: ${id}`);
  if(definition.scope==="singleton"&&singletons.has(id))return singletons.get(id);
  if(resolutionStack.includes(id))throw new Error(`Circular service dependency: ${[...resolutionStack,id].join(" -> ")}`);
  resolutionStack.push(id);
  try{
   const dependencies=Object.fromEntries((definition.dependencies||[]).map(dep=>[dep,resolve(dep,context)]));
   const instance=definition.factory({resolve:(dependencyId)=>resolve(dependencyId,context),dependencies,context,definition:clone(definition)});
   if(instance===undefined||instance===null)throw new Error(`Service factory returned no implementation: ${id}`);
   if(definition.scope==="singleton")singletons.set(id,instance);return instance;
  }finally{resolutionStack.pop()}
 }
 function canResolve(id){try{resolve(id,{probe:true});return true}catch{return false}}
 function describe(id){const definition=definitions.get(id);return definition?clone({...definition,factory:undefined,resolved:singletons.has(id)}):null}
 function list(){return [...definitions.keys()].sort().map(describe)}
 function validate(){const errors=[],warnings=[];for(const definition of definitions.values()){
   for(const dependency of definition.dependencies||[])if(!definitions.has(dependency))errors.push({code:"missing_dependency",binding_id:definition.id,dependency});
   if(definition.replaceable&&!definition.qualifier)warnings.push({code:"replaceable_without_qualifier",binding_id:definition.id});
  }
  for(const id of definitions.keys())try{resolve(id,{validation:true})}catch(error){errors.push({code:"resolution_failed",binding_id:id,message:error.message})}
  return {status:errors.length?"fail":warnings.length?"manual_review":"pass",errors,warnings,summary:{bindings:definitions.size,singletons:singletons.size,replaceable:[...definitions.values()].filter(x=>x.replaceable).length}};
 }
 function snapshot(){const health=validate();return {version:VERSION,summary:health.summary,bindings:list(),health}}
 for(const binding of bindings)definitions.set(binding.id,{...clone(binding),scope:binding.scope||"singleton",factory:()=>{throw new Error(`No runtime factory registered for binding: ${binding.id}`)}});
 return {version:VERSION,register,resolve,canResolve,describe,list,validate,snapshot};
}
async function boot({metadata=null,factories={}}={}){const response=await fetch("/registry/service-bindings.json",{cache:"no-store"});if(!response.ok)throw new Error(`Service bindings: ${response.status}`);const document=await response.json();const container=createContainer({metadata,strict:Boolean(metadata)});for(const binding of document.bindings||[]){const factory=factories[binding.id];if(factory)container.register(binding,factory)}return container}
window.CasaServiceContainer={VERSION,createContainer,boot};window.dispatchEvent(new CustomEvent("casa:service-container-ready",{detail:{version:VERSION}}));
})();
