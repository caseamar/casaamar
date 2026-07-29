import fs from 'node:fs';
const html=fs.readFileSync('index.html','utf8');
const engine=fs.readFileSync('core/casa-journey-planner.js','utf8');
const content=fs.readFileSync('domains/casa-amar/journey-content.js','utf8');
const checks=[
 ['generic engine separated from Casa Amar content',engine.includes('window.CasaJourneyContent')&&!engine.includes('Primavera')&&!engine.includes('Ronda')],
 ['inspiration-first experience',html.includes('Find inspiration — og sammensæt jeres egen dag.')&&html.includes('data-experience-catalogue')],
 ['search is available',html.includes('data-experience-search')&&engine.includes('visibleItems')],
 ['categories and filters',html.includes('data-experience-filters')&&engine.includes("breakfast:'Morgenmad'")&&engine.includes("dinner:'Aften & night out'")],
 ['five item preview and expansion',engine.includes('all.slice(0,5)')&&engine.includes('data-expand-group')],
 ['manual add and drag drop',engine.includes('data-add-item')&&engine.includes("addEventListener('drop'")],
 ['manual ordering',engine.includes('data-plan-index')&&engine.includes('function move(')],
 ['free text item',html.includes('data-custom-plan-text')&&engine.includes("custom:${value}")],
 ['optional empty plan state',engine.includes('I behøver ikke lave en plan')],
 ['local persistence',engine.includes('localStorage.getItem')&&engine.includes('localStorage.setItem')],
 ['sharing',html.includes('data-plan-email')&&html.includes('data-plan-download')&&engine.includes('new Blob')],
 ['domain supports structured dining roles',content.includes("role:'breakfast'")&&content.includes("role:'dinner'")],
 ['runtime snapshot',engine.includes("version:'5.0.0'")],
 ['content loaded before engine',html.indexOf('casa-journey-content.js')<html.indexOf('casa-journey-planner.js')]
];
checks.forEach(([n,ok])=>console.log(`${ok?'PASS':'FAIL'} ${n}`));
if(checks.some(([,ok])=>!ok))process.exit(1);
console.log(`Open Experience Explorer: ${checks.length} checks passed`);
