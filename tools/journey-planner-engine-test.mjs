import fs from 'node:fs';
const html=fs.readFileSync('index.html','utf8');
const engine=fs.readFileSync('core/casa-journey-planner.js','utf8');
const content=fs.readFileSync('domains/casa-amar/journey-content.js','utf8');
const checks=[
 ['generic engine separated from domain package',engine.includes('window.CasaJourneyContent')&&!engine.includes('Ronda')&&!engine.includes('La Cala')],
 ['domain content registry',content.includes("domain:'hospitality.stay'")&&content.includes("id:'ronda'")],
 ['content has advanced activities',content.includes("id:'mtb'")&&content.includes("id:'diving'")],
 ['anchor journey controls',html.includes('data-journey-anchor="ronda"')&&html.includes('data-journey-anchor="diving"')],
 ['replace-anywhere interaction',engine.includes('data-replace')&&engine.includes('data-use-alternative')],
 ['constraint-aware full day',engine.includes('anchor?.exclusive')&&content.includes('exclusive:true')],
 ['runtime snapshot',engine.includes('CasaJourneyPlanner')&&engine.includes("version:'1.0.0'")],
 ['content loaded before engine',html.indexOf('casa-journey-content.js')<html.indexOf('casa-journey-planner.js')]
];
checks.forEach(([n,ok])=>console.log(`${ok?'PASS':'FAIL'} ${n}`));
if(checks.some(([,ok])=>!ok))process.exit(1);
console.log(`Journey Planner Engine: ${checks.length} checks passed`);
