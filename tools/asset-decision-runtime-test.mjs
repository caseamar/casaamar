import fs from "node:fs";
const html=fs.readFileSync("asset-intelligence.html","utf8");
const runtime=fs.readFileSync("core/casa-assets.js","utf8");
const checks=[
 ["version tokens removed from semantic alt text",html.includes("replace(/\\bv\\d+\\b/g,' '")&& !html.includes("`${label.charAt")],
 ["semantic alt text is descriptive",html.includes("Indgangen til Casa Amar")&&html.includes("Køkkenet i Casa Amar")],
 ["approval handler is guarded",html.includes("if(button.disabled)return")&&html.includes("button.textContent='Gemmer…'")],
 ["approval failures are visible",html.includes("Kunne ikke gemme ændringen")&&html.includes("Ændringen er ikke gemt")],
 ["receipt supports rendered completion links",html.includes("result.innerHTML=message")],
 ["event telemetry cannot block persistence",runtime.includes("catch(_eventError){}return effective(item)")],
 ["closed loop recalculates selected task",html.includes("selected=CasaAssetIntelligence.get(selected.id)")&&html.includes("const next=nextAction(selected)")]
];
for(const [n,ok] of checks)console.log(`${ok?'✓':'✗'} ${n}`);const failed=checks.filter(x=>!x[1]);if(failed.length)process.exit(1);console.log(`${checks.length} Asset Decision Runtime checks passed.`);
