(()=>{
"use strict";
const VERSION="1.0.0";
async function loadJson(url){const r=await fetch(url,{cache:"no-store"});if(!r.ok)throw new Error(`${url}: ${r.status}`);return r.json()}
async function assess(){const [constitution,integrity]=await Promise.all([loadJson("/platform/brain/PLATFORM-CONSTITUTION.json"),loadJson("/registry/platform-integrity.json")]);return {version:VERSION,status:integrity.status,score:integrity.score,articles:constitution.articles||[],rules:integrity.rules||[],budget:integrity.architecture_budget||{},summary:integrity.summary||{}}}
window.CasaConstitution={VERSION,assess};
window.dispatchEvent(new CustomEvent("casa:constitution-ready",{detail:{version:VERSION}}));
})();
