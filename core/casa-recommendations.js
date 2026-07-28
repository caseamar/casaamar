(()=>{
const VERSION="1.0.0";let registry=null;
async function load(){if(registry)return registry;const r=await fetch("/registry/recommendations.json",{cache:"no-store"});if(!r.ok)throw new Error("Recommendation registry unavailable");registry=await r.json();return registry;}
async function list(){return (await load()).recommendations||[]}
async function decide(id,action){const data=await load();const item=data.recommendations.find(x=>x.id===id);if(!item)throw new Error("Recommendation not found");if(!data.actions.includes(action))throw new Error("Invalid recommendation action");const entry={id,action,at:new Date().toISOString()};const history=JSON.parse(localStorage.getItem("casaRecommendationHistoryV1")||"[]");history.unshift(entry);localStorage.setItem("casaRecommendationHistoryV1",JSON.stringify(history.slice(0,200)));window.CasaEvents?.publish?.("recommendation:decision",entry);return entry}
window.CasaRecommendations={version:VERSION,load,list,decide};
})();
