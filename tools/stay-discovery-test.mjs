import fs from 'node:fs';
const html=fs.readFileSync('index.html','utf8');
const js=fs.readFileSync('core/casa-stay-discovery.js','utf8');
const checks=[
 ['planner section',html.includes('data-stay-planner')],
 ['pace controls',html.includes('data-planner-pace="rolig"')&&html.includes('data-planner-pace="aktiv"')],
 ['five interests',(html.match(/data-planner-interest=/g)||[]).length===5],
 ['timeline live region',html.includes('data-plan-timeline')&&html.includes('aria-live="polite"')],
 ['copy action',html.includes('data-plan-copy')&&js.includes('navigator.clipboard.writeText')],
 ['gallery counts',js.includes('filter-count')],
 ['gallery filmstrip',js.includes('lightbox-filmstrip')],
 ['keyboard-safe buttons',!html.includes('data-planner-pace="rolig" href=')],
 ['runtime exposure',js.includes('CasaStayDiscovery')&&js.includes("version:'1.0.0'")]
];
const failed=checks.filter(([,ok])=>!ok);checks.forEach(([name,ok])=>console.log(`${ok?'PASS':'FAIL'} ${name}`));if(failed.length)process.exit(1);console.log(`Stay Discovery: ${checks.length} checks passed`);
