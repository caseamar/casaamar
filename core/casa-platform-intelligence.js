(()=>{
"use strict";
const VERSION="1.2.0";
const REGISTRY="/registry/platform-intelligence.json";
const LEARNING="/registry/learning-registry.json";
const GRAPH="/registry/platform-knowledge-graph.json";
async function loadJson(url){const r=await fetch(url,{cache:"no-store"});if(!r.ok)throw new Error(`${url}: ${r.status}`);return r.json()}
async function assess(){const [intelligence,learning,graph]=await Promise.all([loadJson(REGISTRY),loadJson(LEARNING),loadJson(GRAPH)]);return {version:VERSION,...intelligence,graphSummary:graph.summary,learningSummary:learning.summary,latestLearnings:(learning.entries||[]).slice(-3).reverse()}}
function explain(result){if(!result||!result.because||!Array.isArray(result.evidence))throw new Error("Platform Intelligence requires because and evidence");return {status:result.status,because:result.because,evidence:result.evidence,impact:result.impact||[],next_action:result.next_action||null}}
window.CasaPlatformIntelligence={VERSION,assess,explain};
window.dispatchEvent(new CustomEvent("casa:platform-intelligence-ready",{detail:{version:VERSION}}));
})();
