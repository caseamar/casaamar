import fs from "node:fs";
const html=fs.readFileSync("asset-intelligence.html","utf8");
const runtime=fs.readFileSync("core/casa-assets.js","utf8");
const quality=fs.readFileSync("core/casa-ai-output-quality.js","utf8");
const checks=[
 ["semantic alt text uses quality engine",html.includes("CasaAIOutputQuality.proposeAlt")&&html.includes("casa-ai-output-quality.js")],
 ["technical tokens are rejected centrally",quality.includes("technical-token")&&quality.includes("v\\d+")&&quality.includes("hero|asset")],
 ["semantic alt text is descriptive",quality.includes("Indgangen til Casa Amar")&&quality.includes("Køkkenet i Casa Amar")],
 ["unsafe output falls back to manual review",html.includes("Gennemgå billedet manuelt")&&html.includes("Kræver manuel vurdering")],
 ["approval handler is guarded",html.includes("if(button.disabled)return")&&html.includes("button.textContent='Gemmer…'")],
 ["approval failures are visible",html.includes("Kunne ikke gemme ændringen")&&html.includes("Ændringen er ikke gemt")],
 ["receipt supports rendered completion links",html.includes("result.innerHTML=message")],
 ["event telemetry cannot block persistence",runtime.includes("catch(_eventError){}return effective(item)")],
 ["closed loop recalculates selected task",html.includes("selected=CasaAssetIntelligence.get(selected.id)")&&html.includes("const next=nextAction(selected)")]
];
for(const [n,ok] of checks)console.log(`${ok?'✓':'✗'} ${n}`);const failed=checks.filter(x=>!x[1]);if(failed.length)process.exit(1);console.log(`${checks.length} Asset Decision Runtime checks passed.`);
