(()=>{
"use strict";
const VERSION="1.2.0";
const REGISTRY="/registry/engineering-governance.json";
const GRAPH="/registry/dependency-graph.json";
async function loadJson(url){const r=await fetch(url,{cache:"no-store"});if(!r.ok)throw new Error(`${url}: ${r.status}`);return r.json()}
async function assess(){const [governance,graph]=await Promise.all([loadJson(REGISTRY),loadJson(GRAPH)]);const scores=Object.values(governance.assessment?.dimensions||{});return {version:VERSION,status:governance.assessment?.status||"unknown",score:governance.assessment?.overall_score||0,dimensions:governance.assessment?.dimensions||{},because:governance.assessment?.because||"No assessment reason",dependencies:{nodes:graph.nodes?.length||0,edges:graph.edges?.length||0},technicalDebt:governance.technical_debt||[]}}
window.CasaEngineeringGovernance={VERSION,assess};
window.dispatchEvent(new CustomEvent("casa:engineering-governance-ready",{detail:{version:VERSION}}));
})();
