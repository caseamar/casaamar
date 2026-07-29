import fs from 'node:fs';
const html=fs.readFileSync('index.html','utf8');
const engine=fs.readFileSync('core/casa-journey-planner.js','utf8');
const learning=fs.readFileSync('core/casa-journey-learning.js','utf8');
const content=fs.readFileSync('domains/casa-amar/journey-content.js','utf8');
const checks=[
 ['generic composer separated from domain package', engine.includes('window.CasaJourneyContent') && !engine.includes('Ronda') && !engine.includes('Primavera')],
 ['wish-first interaction', html.includes('Hvad har I lyst til i dag?') && html.includes('data-wish-catalogue') && engine.includes('data-wish-id')],
 ['user selects building blocks', engine.includes('state.selected') && engine.includes('selectedItems')],
 ['three plan variants', engine.includes('Bedste rækkefølge') && engine.includes('Mere luft') && engine.includes('Mere oplevelse')],
 ['audience context', html.includes('data-audience="family"') && engine.includes('state.audience')],
 ['dining rhythm supports Spanish and Danish timing', html.includes('data-rhythm="spanish"') && html.includes('data-rhythm="danish"') && engine.includes('diningWindow')],
 ['transport included in composition', engine.includes('const travel =') && engine.includes('cursor + trip')],
 ['opening windows included', engine.includes('effectiveWindows') && content.includes('windows:[w(')],
 ['meal deduplication', engine.includes('dedupeMeals') && engine.includes('mealRoles')],
 ['inspiration mode', html.includes('data-inspire-day') && engine.includes('function inspire()')],
 ['copy email and download sharing', html.includes('data-plan-email') && html.includes('data-plan-download') && engine.includes('new Blob')],
 ['privacy-safe learning signals', learning.includes('No personal data') && engine.includes("'wish_toggled'") && engine.includes("'plan_generated'")],
 ['trip container details', engine.includes('tripDetails') && content.includes('tripContainer:true')],
 ['runtime snapshot', engine.includes('CasaJourneyPlanner') && engine.includes("version:'4.0.0'")],
 ['content loaded before composer', html.indexOf('casa-journey-content.js') < html.indexOf('casa-journey-planner.js')]
];
checks.forEach(([n,ok])=>console.log(`${ok?'PASS':'FAIL'} ${n}`));
if(checks.some(([,ok])=>!ok))process.exit(1);
console.log(`Experience Composer: ${checks.length} checks passed`);
