(()=>{
const VERSION="3.5.0";let report=null;
async function load(){if(report)return report;const r=await fetch("/release-governance.json",{cache:"no-store"});if(!r.ok)throw new Error("Release Governance unavailable");report=await r.json();return report}
function automatedApproved(r){return r.summary.automated_failed===0&&r.summary.automated_confidence===100}
window.CasaReleaseGovernance={version:VERSION,load,automatedApproved};
})();
