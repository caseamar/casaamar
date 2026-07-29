import fs from 'node:fs';
const html=fs.readFileSync('index.html','utf8');
const engine=fs.readFileSync('core/casa-journey-planner.js','utf8');
const content=fs.readFileSync('domains/casa-amar/journey-content.js','utf8');
const checks=[
 ['generic engine separated from domain package',engine.includes('window.CasaJourneyContent')&&!engine.includes('Ronda')&&!engine.includes('La Cala')],
 ['domain content registry',content.includes("domain:'hospitality.stay'")&&content.includes("id:'ronda'")],
 ['time block duration model',content.includes('duration:d(')&&engine.includes('duration?.typical')],
 ['opening window model',content.includes('windows:[w(')&&engine.includes('isWindowFit')],
 ['transport matrix and routing time',content.includes('const travel =')&&engine.includes('travelMinutes')],
 ['stable block replacement',engine.includes('data-target-block')&&engine.includes('replaceBlock(uid, itemId)')],
 ['user choices remain locked',engine.includes('state.locks.set')&&engine.includes('source: \'user\'')],
 ['anchor priority is preserved',engine.includes("source: 'anchor'")&&engine.includes('dayWeight')],
 ['partial timeline undo',engine.includes('snapshotForUndo')&&html.includes('data-plan-undo')],
 ['participant-ready content contract',content.includes("participantModes:['all','subgroup','individual']")&&engine.includes('participants')],
 ['real clock timeline',engine.includes('minutesToClock')&&engine.includes('block.start')&&engine.includes('block.end')],
 ['runtime snapshot',engine.includes('CasaJourneyPlanner')&&engine.includes("version: '2.0.0'")],
 ['content loaded before engine',html.indexOf('casa-journey-content.js')<html.indexOf('casa-journey-planner.js')]
];
checks.forEach(([n,ok])=>console.log(`${ok?'PASS':'FAIL'} ${n}`));
if(checks.some(([,ok])=>!ok))process.exit(1);
console.log(`Journey Planner Engine: ${checks.length} checks passed`);
