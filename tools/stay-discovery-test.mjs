import fs from 'node:fs';
const html=fs.readFileSync('index.html','utf8');
const js=fs.readFileSync('core/casa-stay-discovery.js','utf8');
const checks=[
 ['planner section',html.includes('data-stay-planner')],
 ['pace controls',html.includes('data-pace="relaxed"')&&html.includes('data-pace="active"')],
 ['wish catalogue',html.includes('data-wish-catalogue')&&html.includes('data-compose-day')],
 ['timeline output',html.includes('data-plan-timeline')&&html.includes('data-plan-results')],
 ['copy action',html.includes('data-plan-copy')],
 ['gallery counts',js.includes('filter-count')],
 ['gallery filmstrip',js.includes('lightbox-filmstrip')],
 ['keyboard-safe buttons',!html.includes('data-pace="relaxed" href=')],
 ['runtime exposure',js.includes('CasaStayDiscovery')&&js.includes("version:'1.0.0'")]
];
const failed=checks.filter(([,ok])=>!ok);checks.forEach(([name,ok])=>console.log(`${ok?'PASS':'FAIL'} ${name}`));if(failed.length)process.exit(1);console.log(`Stay Discovery: ${checks.length} checks passed`);
