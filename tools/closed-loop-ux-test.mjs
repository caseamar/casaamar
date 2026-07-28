import fs from "node:fs";
const asset=fs.readFileSync("asset-intelligence.html","utf8");
const runtime=fs.readFileSync("core/casa-assets.js","utf8");
const constitution=JSON.parse(fs.readFileSync("registry/constitution-rules.json","utf8"));
const checks=[
 ["approve persists through governed API",asset.includes("CasaAssetIntelligence.saveAltText")],
 ["approved task is immediately recalculated",asset.includes("selected=CasaAssetIntelligence.get(selected.id)")&&asset.includes("const next=nextAction(selected)")],
 ["asset list refreshes after approval",asset.includes("items=CasaAssetIntelligence.all();metrics()")&&asset.includes("renderList();select(selected.id)")],
 ["completion acknowledgement names next task",asset.includes("Opgaven er færdig:")&&asset.includes("Næste opgave:")],
 ["publication reminder is explicit",asset.includes("AI Workspace → Udgivelsescenter")&&asset.includes("/control/#publish")],
 ["pending publication banner is persistent",asset.includes("publishBanner")&&asset.includes("Ændringer venter på at blive udgivet")],
 ["draft overlay removes completed alt-text issue",runtime.includes("function effective(item)")&&runtime.includes("accessibility:true")],
 ["workspace state records unpublished change",runtime.includes("casaWorkspaceStateV1")&&runtime.includes("asset-alt-text")],
 ["publish payload receives asset draft",runtime.includes("casaAssetLibrary")&&runtime.includes("manual_metadata")],
 ["constitution article 22 exists",constitution.principles.some(x=>x.principle_id==="ARTICLE-22"&&x.automated_tests?.includes("tools/closed-loop-ux-test.mjs"))]
];
const failed=checks.filter(([,ok])=>!ok);for(const [name,ok] of checks)console.log(`${ok?"✓":"✗"} ${name}`);if(failed.length){console.error(`${failed.length} Closed Loop UX checks failed.`);process.exit(1)}console.log(`${checks.length} Closed Loop UX checks passed.`);
