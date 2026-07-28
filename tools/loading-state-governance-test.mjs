import fs from "node:fs";
const control=fs.readFileSync(new URL("../control/index.html",import.meta.url),"utf8");
const content=fs.readFileSync(new URL("../content-studio.html",import.meta.url),"utf8");
const checks=[
 [control.includes('dataset.loadingState="loading"'),"Controlcenter loading state missing"],
 [control.includes('dataset.loadingState=state'),"Controlcenter terminal state missing"],
 [control.includes('Indlæsningen overskred 8 sekunder'),"Controlcenter timeout missing"],
 [control.includes('Prøv igen'),"Controlcenter retry missing"],
 [content.includes('Content Intelligence kunne ikke indlæses inden for 8 sekunder'),"Content Intelligence timeout missing"],
 [content.includes("dataset.loadingState='error'"),"Content Intelligence error terminal state missing"],
 [content.includes('retryContentIntelligence'),"Content Intelligence retry missing"],
 [!content.includes('</aside></div></main><section class="panel" id="operations"'),"Content Studio has invalid main nesting"]
];
const failed=checks.filter(([ok])=>!ok);if(failed.length){failed.forEach(([,m])=>console.error('FAIL:',m));process.exit(1)}
console.log('Loading State Governance: 8 kontroller bestået');
