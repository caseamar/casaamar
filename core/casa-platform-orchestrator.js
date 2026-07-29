/** Platform Orchestrator 1.0 — blueprint-aligned lifecycle runtime. */
(()=>{'use strict';
 const VERSION='1.0.0', STORAGE='casa.platform-orchestrator.state.v1'; let registry=null;
 const now=()=>new Date().toISOString();
 async function load(){if(!registry){const r=await fetch('/registry/platform-journeys.json',{cache:'no-store'});if(!r.ok)throw new Error('Journey registry could not be loaded');registry=await r.json();validate(registry)}return snapshot()}
 function validate(r){if(!r?.journeys?.length)throw new Error('Journey registry has no journeys');const ids=new Set();for(const j of r.journeys){if(ids.has(j.id))throw new Error(`Duplicate journey ${j.id}`);ids.add(j.id);if(!j.stages?.length)throw new Error(`Journey ${j.id} has no stages`)}}
 function read(){try{return JSON.parse(localStorage.getItem(STORAGE)||'null')}catch{return null}}
 function defaultState(){return {journeyId:'implementation',stageId:'onboarding',status:'active',startedAt:now(),updatedAt:now(),completedStages:[],evidence:[],decisions:[]}}
 function state(){return read()||defaultState()}
 function save(s,eventType='platform.journey.changed'){const next={...s,updatedAt:now()};localStorage.setItem(STORAGE,JSON.stringify(next));window.dispatchEvent(new CustomEvent('casa:platform-orchestrator',{detail:{type:eventType,state:next}}));window.CasaEvents?.publish?.({type:eventType,source:'platform-orchestrator',payload:next});return next}
 function journey(id=state().journeyId){return registry?.journeys?.find(j=>j.id===id)||null}
 function current(){const s=state(),j=journey(s.journeyId),i=j?.stages.findIndex(x=>x.id===s.stageId)??-1;return {state:s,journey:j,stage:i>=0?j.stages[i]:null,index:i}}
 function start(journeyId,stageId){const j=journey(journeyId);if(!j)throw new Error('Unknown journey');const stage=j.stages.find(x=>x.id===stageId)||j.stages[0];return save({...defaultState(),journeyId:j.id,stageId:stage.id},'platform.journey.started')}
 function completeStage(evidence){const c=current();if(!c.stage)throw new Error('No active stage');const completed=[...new Set([...(c.state.completedStages||[]),c.stage.id])];const nextStage=c.journey.stages[c.index+1];return save({...c.state,completedStages:completed,evidence:evidence?[...(c.state.evidence||[]),{stageId:c.stage.id,value:evidence,recordedAt:now()}]:c.state.evidence,stageId:nextStage?.id||c.stage.id,status:nextStage?'active':'completed'},nextStage?'platform.stage.completed':'platform.journey.completed')}
 function recordDecision(decision){if(!decision?.id||!decision?.outcome)throw new Error('Decision id and outcome are required');const s=state();return save({...s,decisions:[...(s.decisions||[]),{...decision,recordedAt:now()}]},'platform.decision.recorded')}
 function nextAction(){const c=current();if(!c.stage)return null;const map={demo:'/domain-intelligence.html',onboarding:'/domain-intelligence.html',implementation:'/control/#next-best-action','go-live':'/release-governance.html','hyper-care':'/control/#ai-workspace',maintenance:'/control/#platform-doctor',observe:'/control/#ai-workspace-insights',assess:'/recommendation-engine.html',prioritise:'/recommendation-engine.html',implement:'/control/#next-best-action',prove:'/control/#platform-doctor',learn:'/control/#ai-workspace-insights'};return {title:c.stage.display_name,description:c.stage.outcome,href:map[c.stage.id]||'/control/',capabilities:c.stage.capabilities}}
 function snapshot(){const c=current();return {version:VERSION,registryVersion:registry?.version||null,valueChain:registry?.value_chain||[],...c,nextAction:nextAction()}}
 window.CasaPlatformOrchestrator={VERSION,load,state,start,current,completeStage,recordDecision,nextAction,snapshot};
})();
