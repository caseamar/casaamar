import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const orchestrator=read('core/casa-startup-orchestrator.js');
const ops=read('core/casa-content-operations.js');
const html=read('content-studio.html');
const events=JSON.parse(read('registry/event-contracts.json'));
const checks=[
 ['orchestrator exists',orchestrator.includes('bootContentWorkspace')],
 ['event registry loads first',orchestrator.indexOf('event-contracts')<orchestrator.indexOf('content-studio')],
 ['content operations before intelligence',orchestrator.indexOf('content-operations')<orchestrator.indexOf('content-intelligence')],
 ['dependency timeout exists',orchestrator.includes('timeout=8000')],
 ['terminal states exist',['waiting','starting','ready','failed'].every(x=>orchestrator.includes(`"${x}"`))],
 ['valid ready event name',ops.includes('content.operations.ready')&&!ops.includes('content-operations:ready')],
 ['valid error event name',ops.includes('content.operations.error')&&!ops.includes('content-operations:error')],
 ['ready contract registered',events.contracts.some(x=>x.type==='content.operations.ready')],
 ['startup contracts registered',events.contracts.some(x=>x.type==='platform.startup.ready')&&events.contracts.some(x=>x.type==='platform.startup.failed')],
 ['workspace uses orchestrator',html.includes('CasaStartupOrchestrator.bootContentWorkspace()')],
 ['retry forces clean boot',html.includes('bootContentWorkspace({force:true})')]
];
const failed=checks.filter(([,ok])=>!ok);if(failed.length){console.error(failed.map(x=>`FAIL ${x[0]}`).join('\n'));process.exit(1)}
console.log(`${checks.length} Startup Governance-kontroller bestået`);
