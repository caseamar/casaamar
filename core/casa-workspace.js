(function(){
"use strict";
const VERSION="1.8.5";
const REGISTRY="/registry/workspace.json";
let state={loaded:false,registry:null,insights:[],status:{}};
const fetchJson=async path=>{const r=await fetch(`${path}?_=${Date.now()}`,{cache:"no-store"});if(!r.ok)throw new Error(`Workspace registry kunne ikke indlæses (${r.status})`);return r.json()};
const count=v=>Number(v||0);
const clone=v=>JSON.parse(JSON.stringify(v));
function issueBreakdown(issues=[]){
 const labels={"missing-alt-text":"mangler alt-tekst","missing-dimensions":"mangler dimensioner","standalone-asset":"er ikke koblet til indhold","asset-not-ready":"er ikke klar","missing-web-variant":"mangler webvariant","missing-mobile-variant":"mangler mobilvariant","missing-thumbnail-variant":"mangler thumbnail"};
 const totals={};
 for(const issue of issues){const key=labels[issue.code]||issue.code||"ukendt årsag";totals[key]=(totals[key]||0)+1;}
 return Object.entries(totals).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([label,n])=>`${n} ${label}`);
}
function buildInsights(){
 const insights=[];
 const asset=window.CasaAssetIntelligence?.snapshot?.();
 const graph=window.CasaKnowledgeGraph?.snapshot?.();
 const exp=window.CasaExperience?.snapshot?.();
 const content=window.CasaContentIntelligence?.snapshot?.();
 if(asset){
  const issues=window.CasaAssetIntelligence?.issues?.()||[];
  if(count(asset.blocked_count)>0){
   const reasons=issueBreakdown(issues.filter(x=>x.severity!=="info"||x.code!=="standalone-asset"));
   insights.push({priority:"high",title:`${asset.blocked_count} assets kræver handling`,detail:reasons.length?`Årsager: ${reasons.join(" · ")}. Påvirkning: de er ikke klar til publicering.`:"De mangler metadata eller responsive varianter og er ikke klar til publicering.",action_label:"Gennemgå assets",href:"/asset-intelligence.html",subsystem_id:"asset-intelligence",evidence:{blocked:asset.blocked_count,issues:asset.issue_count}});
  }
  if(count(asset.review_count)>0)insights.push({priority:"medium",title:`${asset.review_count} assets bør gennemgås`,detail:`${asset.pending_variant_count||0} responsive varianter er planlagt. En gennemgang kan forbedre tilgængelighed og publiceringsklarhed.`,action_label:"Se readiness",href:"/asset-intelligence.html",subsystem_id:"asset-intelligence",evidence:{review:asset.review_count,pending_variants:asset.pending_variant_count}});
 }
 if(graph&&count(graph.orphan_count)>0)insights.push({priority:"medium",title:`${graph.orphan_count} videnselementer mangler relationer`,detail:"De er ikke forbundet til sider, billeder eller gæsteoplevelser og kan derfor ikke bruges fuldt ud af AI.",action_label:"Åbn Knowledge Graph",href:"/knowledge-graph.html",subsystem_id:"ai-knowledge-graph",evidence:{orphans:graph.orphan_count}});
 if(exp&&exp.valid===false)insights.push({priority:"high",title:"Gæsterejsen kræver handling",detail:"Mindst én rejsefase mangler gyldig dækning af indhold, assets eller touchpoints.",action_label:"Gennemgå gæsterejsen",href:"/experience-engine.html",subsystem_id:"experience-engine"});
 if(content&&count(content.review_count)>0)insights.push({priority:"medium",title:`${content.review_count} indholdselementer er til review`,detail:"De skal godkendes eller forbedres, før platformen kan betragte indholdet som publiceringsklart.",action_label:"Åbn Knowledge Studio",href:"/knowledge-studio.html",evidence:{review:content.review_count}});
 if(!insights.length)insights.push({priority:"low",title:"Workspace er klar",detail:"Der er ingen kritiske forslag. Fortsæt med den næste prioriterede opgave.",action_label:"Se næste opgave",href:"#next-best-action"});
 return insights.slice(0,6);
}
function buildStatus(){const asset=window.CasaAssetIntelligence?.snapshot?.();const graph=window.CasaKnowledgeGraph?.snapshot?.();const exp=window.CasaExperience?.snapshot?.();const health=window.CASA_HEALTH_SNAPSHOT;return {platform:health?.overall||"checking",content:window.CasaContentIntelligence?"connected":"waiting",assets:asset?((asset.blocked_count||0)>0?"attention":"healthy"):"waiting",experience:exp?(exp.valid?"healthy":"attention"):"waiting",ai:graph?"ready":"waiting"}}
async function load(){if(state.loaded)return snapshot();state.registry=await fetchJson(REGISTRY);await Promise.allSettled([window.CasaAssetIntelligence?.load?.(),window.CasaKnowledgeGraph?.load?.(),window.CasaExperience?.load?.(),window.CasaContentIntelligence?.load?.()]);state.insights=buildInsights();state.status=buildStatus();state.loaded=true;window.dispatchEvent(new CustomEvent("casa:workspace:ready",{detail:snapshot()}));window.CasaEvents?.publish?.("workspace:ready",{version:VERSION,module_count:state.registry.modules.length,insight_count:state.insights.length});return snapshot()}
function snapshot(){return clone({version:VERSION,loaded:state.loaded,status:state.status,modules:state.registry?.modules||[],quick_actions:state.registry?.quick_actions||[],insights:state.insights})}
window.CasaWorkspace={version:VERSION,load,snapshot,refresh:async()=>{state.loaded=false;return load()}};
window.CasaCore?.registerModule?.("ai-workspace",{version:VERSION,ready:()=>state.loaded,health:()=>({status:state.loaded?"ok":"waiting",detail:state.loaded?`${state.registry.modules.length} workspace modules and ${state.insights.length} insights loaded`:"Workspace registry not loaded"})});
})();
