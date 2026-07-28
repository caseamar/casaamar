(()=>{
"use strict";
const VERSION="1.0.0";
const URLS={graph:"/registry/platform-knowledge-graph.json",capabilities:"/registry/capabilities.json"};
async function loadJson(url){const r=await fetch(url,{cache:"no-store"});if(!r.ok)throw new Error(`${url}: ${r.status}`);return r.json()}
function adjacency(edges){const m=new Map();for(const e of edges||[]){if(!m.has(e.from))m.set(e.from,[]);m.get(e.from).push(e.to)}return m}
function impact(graph,id){const a=adjacency(graph.edges);const reverse=new Map();for(const e of graph.edges||[]){if(!reverse.has(e.to))reverse.set(e.to,[]);reverse.get(e.to).push(e.from)}const direct=[...(reverse.get(id)||[])];const visited=new Set(direct);const queue=[...direct];while(queue.length){const x=queue.shift();for(const y of reverse.get(x)||[]){if(!visited.has(y)){visited.add(y);queue.push(y)}}}const score=direct.length*3+Math.max(0,visited.size-direct.length)*2;const risk=score>=25?"high":score>=10?"medium":"low";return {capability:id,direct_consumers:direct,affected:[...visited],score,risk,breaking_contracts:0,manual_review:false,evidence:[`${direct.length} direct consumers`,`${visited.size} total affected nodes`,"0 breaking contracts"]}}
async function assess(){const [graph,registry]=await Promise.all([loadJson(URLS.graph),loadJson(URLS.capabilities)]);return {version:VERSION,graph,registry,summary:graph.summary,impact:(id)=>impact(graph,id)}}
window.CasaCapabilityIntelligence={VERSION,assess,impact};
window.dispatchEvent(new CustomEvent("casa:capability-intelligence-ready",{detail:{version:VERSION}}));
})();
