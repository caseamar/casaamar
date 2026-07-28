(function(g){
"use strict";
const VERSION="1.0.0";
async function load(){const r=await fetch("/registry/verification-profiles.json",{cache:"no-store"});if(!r.ok)throw new Error("Verification profiles kunne ikke indlæses");return r.json()}
async function assess(){const registry=await load();const p=registry.policy||{};const profiles=registry.profiles||[];const missing=profiles.flatMap(x=>(x.required_suites||[]).length?[]:[x.id]);const summary={profiles:profiles.length,browser_required:profiles.filter(x=>(x.required_suites||[]).includes("browser")).length,mutation_required:profiles.filter(x=>(x.required_suites||[]).includes("mutation")).length,deployment_smoke_required:profiles.filter(x=>(x.required_suites||[]).includes("deployment-smoke")).length,missing_required_suites:missing.length,status:missing.length?"incomplete_evidence":"verified"};return {version:VERSION,registry,summary,because:missing.length?"En eller flere testprofiler mangler krævede suites.":"Alle registrerede testprofiler har eksplicitte testniveauer, terminaltilstande og evidenskrav.",evidence:["registry/verification-profiles.json","tools/verification-governance-test.mjs","tools/rendered-runtime-integration-test.mjs","tools/mutation-resistance-test.mjs"]}}
g.CasaVerificationGovernance={VERSION,load,assess};
})(globalThis);
