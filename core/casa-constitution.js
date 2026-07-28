(()=>{
"use strict";
const VERSION="2.0.0";
async function loadJson(url){const r=await fetch(url,{cache:"no-store"});if(!r.ok)throw new Error(`${url}: ${r.status}`);return r.json()}
async function assess(){const [constitution,integrity,coverage]=await Promise.all([loadJson("/platform/brain/PLATFORM-CONSTITUTION.json"),loadJson("/registry/platform-integrity.json"),loadJson("/registry/constitution-rules.json")]);const principles=coverage.principles||[];const missing=principles.filter(x=>!Array.isArray(x.automated_tests)||!x.automated_tests.length||x.coverage_status!=="covered");const violations=(integrity.rules||[]).filter(x=>x.status!=="pass");return {version:VERSION,status:missing.length||violations.length?"fail":"pass",score:principles.length?Math.round(((principles.length-missing.length)/principles.length)*100):0,articles:constitution.articles||[],rules:integrity.rules||[],coverage:{registered:principles.length,covered:principles.length-missing.length,missing:missing.length,percent:principles.length?Math.round(((principles.length-missing.length)/principles.length)*100):0},violations,budget:integrity.architecture_budget||{},summary:integrity.summary||{}}}
window.CasaConstitution={VERSION,assess};
window.dispatchEvent(new CustomEvent("casa:constitution-ready",{detail:{version:VERSION}}));
})();
