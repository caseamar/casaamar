import fs from 'node:fs';
const html=fs.readFileSync('index.html','utf8');
const js=fs.readFileSync('core/casa-stay-discovery.js','utf8');
const planner=fs.readFileSync('core/casa-journey-planner.js','utf8');
const checks=[
 ['planner section',html.includes('data-stay-planner')],
 ['search-led discovery',html.includes('data-experience-search')&&html.includes('data-experience-catalogue')],
 ['manual day board',html.includes('data-day-board')&&html.includes('data-day-plan-list')],
 ['optional custom item',html.includes('data-custom-plan-text')],
 ['copy action',html.includes('data-plan-copy')],
 ['gallery counts',js.includes('filter-count')],
 ['gallery filmstrip',js.includes('lightbox-filmstrip')],
 ['keyboard-safe controls',html.includes('type="button" data-add-custom')],
 ['runtime exposure',js.includes('CasaStayDiscovery')&&planner.includes('CasaJourneyPlanner')]
];
const failed=checks.filter(([,ok])=>!ok);checks.forEach(([name,ok])=>console.log(`${ok?'PASS':'FAIL'} ${name}`));if(failed.length)process.exit(1);console.log(`Stay Discovery: ${checks.length} checks passed`);
