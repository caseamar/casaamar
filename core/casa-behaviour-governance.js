(()=>{
const VERSION="1.0.0";let registry=null;
async function load(){if(registry)return registry;const r=await fetch("/registry/behaviour-contracts.json",{cache:"no-store"});if(!r.ok)throw new Error("Behaviour Governance unavailable");registry=await r.json();return registry}
async function findByCapability(capability){const r=await load();return r.contracts.filter(x=>x.capability===capability)}
window.CasaBehaviourGovernance={version:VERSION,load,findByCapability};
})();
