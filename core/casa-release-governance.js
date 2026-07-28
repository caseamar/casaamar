(()=>{
const VERSION="1.0.0";let report=null;async function load(){if(report)return report;const r=await fetch("/release-governance.json",{cache:"no-store"});if(!r.ok)throw new Error("Release Governance unavailable");report=await r.json();return report}window.CasaReleaseGovernance={version:VERSION,load};})();
