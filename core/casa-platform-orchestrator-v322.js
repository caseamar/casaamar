/** Platform Orchestrator 1.0.2 — blueprint-aligned lifecycle runtime. */
(()=>{'use strict';
 const VERSION='1.0.2';
 const STORAGE='casa.platform-orchestrator.state.v2';
 let registry=null;
 const now=()=>new Date().toISOString();
 async function ensureRegistry(){
   if(registry)return registry;
   const response=await fetch('/registry/platform-journeys.json?v=20260724.327',{cache:'no-store'});
   if(!response.ok)throw new Error('Journey registry could not be loaded');
   registry=await response.json();
   validate(registry);
   return registry;
 }
 function validate(value){
   if(!value?.journeys?.length)throw new Error('Journey registry has no journeys');
   const journeyIds=new Set();
   for(const journey of value.journeys){
     if(journeyIds.has(journey.id))throw new Error(`Duplicate journey ${journey.id}`);
     journeyIds.add(journey.id);
     if(!journey.stages?.length)throw new Error(`Journey ${journey.id} has no stages`);
     const stageIds=new Set();
     for(const stage of journey.stages){
       if(stageIds.has(stage.id))throw new Error(`Duplicate stage ${stage.id} in ${journey.id}`);
       stageIds.add(stage.id);
     }
   }
 }
 function read(){
   try{return JSON.parse(localStorage.getItem(STORAGE)||'null')}catch{return null}
 }
 function defaultState(){
   return {journeyId:'implementation',stageId:'demo',status:'not-started',startedAt:null,updatedAt:now(),completedStages:[],evidence:[],decisions:[]};
 }
 function state(){return read()||defaultState()}
 function persist(next,eventType){
   const stored={...next,updatedAt:now()};
   localStorage.setItem(STORAGE,JSON.stringify(stored));
   try{window.dispatchEvent(new CustomEvent('casa:platform-orchestrator',{detail:{type:eventType,state:stored}}))}catch(error){console.warn('Lifecycle DOM event failed',error)}
   try{window.CasaEvents?.publish?.(eventType,{journey_id:stored.journeyId,stage_id:stored.stageId,status:stored.status,updated_at:stored.updatedAt},{source:{service:'platform-orchestrator',version:VERSION}})}catch(error){console.warn('Lifecycle telemetry failed',error)}
   return stored;
 }
 function journey(id){return registry?.journeys?.find(item=>item.id===id)||null}
 function current(){
   const active=state();
   const activeJourney=journey(active.journeyId);
   const index=activeJourney?.stages.findIndex(stage=>stage.id===active.stageId)??-1;
   return {state:active,journey:activeJourney,stage:index>=0?activeJourney.stages[index]:null,index};
 }
 async function load(){await ensureRegistry();return snapshot()}
 async function start(journeyId,stageId){
   await ensureRegistry();
   const selected=journey(journeyId);
   if(!selected)throw new Error(`Unknown journey: ${journeyId}`);
   const selectedStage=selected.stages.find(stage=>stage.id===stageId)||selected.stages[0];
   return persist({journeyId:selected.id,stageId:selectedStage.id,status:'active',startedAt:now(),updatedAt:now(),completedStages:[],evidence:[],decisions:[]},'platform.journey.started');
 }
 async function completeStage(evidence){
   await ensureRegistry();
   const active=current();
   if(active.state.status!=='active')throw new Error('Start en rejse før du gennemfører et trin');
   if(!active.stage)throw new Error('No active stage');
   const completed=[...new Set([...(active.state.completedStages||[]),active.stage.id])];
   const nextStage=active.journey.stages[active.index+1];
   return persist({...active.state,completedStages:completed,evidence:evidence?[...(active.state.evidence||[]),{stageId:active.stage.id,value:evidence,recordedAt:now()}]:active.state.evidence,stageId:nextStage?.id||active.stage.id,status:nextStage?'active':'completed'},nextStage?'platform.stage.completed':'platform.journey.completed');
 }
 async function recordDecision(decision){
   await ensureRegistry();
   if(!decision?.id||!decision?.outcome)throw new Error('Decision id and outcome are required');
   const active=state();
   return persist({...active,decisions:[...(active.decisions||[]),{...decision,recordedAt:now()}]},'platform.decision.recorded');
 }
 function nextAction(){
   const active=current();
   if(!active.stage)return null;
   const routes={demo:'/domain-intelligence.html',onboarding:'/domain-intelligence.html',implementation:'/control/#next-best-action','go-live':'/release-governance.html','hyper-care':'/control/#ai-workspace',maintenance:'/control/#platform-doctor',observe:'/control/#ai-workspace-insights',assess:'/recommendation-engine.html',prioritise:'/recommendation-engine.html',implement:'/control/#next-best-action',prove:'/control/#platform-doctor',learn:'/control/#ai-workspace-insights'};
   return {title:active.stage.display_name,description:active.stage.outcome,href:routes[active.stage.id]||'/control/',capabilities:active.stage.capabilities};
 }
 function snapshot(){
   const active=current();
   return {version:VERSION,registryVersion:registry?.version||null,valueChain:registry?.value_chain||[],...active,nextAction:nextAction()};
 }
 function reset(){localStorage.removeItem(STORAGE);return defaultState()}
 window.CasaPlatformOrchestrator={VERSION,load,state,start,current,completeStage,recordDecision,nextAction,snapshot,reset};
})();
