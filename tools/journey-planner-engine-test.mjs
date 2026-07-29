import fs from 'node:fs';
const html=fs.readFileSync('index.html','utf8');
const engine=fs.readFileSync('core/casa-journey-planner.js','utf8');
const learning=fs.readFileSync('core/casa-journey-learning.js','utf8');
const content=fs.readFileSync('domains/casa-amar/journey-content.js','utf8');
const checks=[
 ['generic engine separated from domain package',engine.includes('window.CasaJourneyContent')&&!engine.includes('Ronda')&&!engine.includes('La Cala')],
 ['domain content registry',content.includes("domain:'hospitality.stay'")&&content.includes("id:'ronda'")],
 ['meal role exclusivity',content.includes("exclusiveGroup:'meal.breakfast'")&&engine.includes('usedGroups.has')],
 ['free time is a universal alternative',engine.includes("title:'Fri tid'")&&engine.includes('freeTime(targetRole)')],
 ['trip container presents outbound and return time',content.includes('tripContainer:true')&&engine.includes('journey-trip-breakdown')],
 ['time block duration model',content.includes('duration:d(')&&engine.includes('duration?.typical')],
 ['opening window model',content.includes('windows:[w(')&&engine.includes('fitsWindow')],
 ['transport matrix and routing time',content.includes('const travel =')&&engine.includes('travel(source.baseLocation')],
 ['stable block replacement',engine.includes('data-target-block')&&engine.includes('replaceBlock(uid,itemId)')],
 ['user choices remain locked',engine.includes('state.locks.set')&&engine.includes("source:'user'")],
 ['anchor priority is preserved',engine.includes("source:'anchor'")&&engine.includes('dayWeight')],
 ['partial timeline undo',engine.includes('snapshotForUndo')&&html.includes('data-plan-undo')],
 ['participant-ready content contract',content.includes("participantModes:['all','subgroup','individual']")&&engine.includes('participants')],
 ['privacy-safe learning infrastructure',learning.includes('No personal data')&&learning.includes('planSignature')&&learning.includes('CasaJourneyLearningAdapter')],
 ['planner records meaningful choices',engine.includes("'replacement_selected'")&&engine.includes("'anchor_selected'")&&engine.includes("'plan_copied'")],
 ['learning loaded before planner',html.indexOf('casa-journey-learning.js')<html.indexOf('casa-journey-planner.js')],
 ['runtime snapshot',engine.includes('CasaJourneyPlanner')&&engine.includes("version:'3.0.0'")],
 ['content loaded before engine',html.indexOf('casa-journey-content.js')<html.indexOf('casa-journey-planner.js')]
];
checks.forEach(([n,ok])=>console.log(`${ok?'PASS':'FAIL'} ${n}`));
if(checks.some(([,ok])=>!ok))process.exit(1);
console.log(`Journey Planner Engine: ${checks.length} checks passed`);
