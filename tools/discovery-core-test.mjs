import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import assert from 'node:assert/strict';

const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const core=fs.readFileSync(path.join(root,'core/casa-discovery-core.js'),'utf8');
const content=fs.readFileSync(path.join(root,'domains/casa-amar/journey-content.js'),'utf8');
const profile=fs.readFileSync(path.join(root,'domains/casa-amar/discovery-profile.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const context={window:{},document:{documentElement:{dataset:{}}},console,Date,Set,Map,Object,String,Number,Array,Math};
context.window.window=context.window;
vm.createContext(context);
vm.runInContext(core,context);
assert.equal(context.window.CasaDiscoveryCore.version,'2.0.0');

const engine=context.window.CasaDiscoveryCore.createEngine({
  domain:'test',
  assets:[
    {id:'beach',type:'beach',title:'Main beach',summary:'Swimming',primaryIntents:['beach'],tags:['family'],editorialScore:80},
    {id:'restaurant',type:'restaurant',title:'Restaurant by water',summary:'Food near beach',primaryIntents:['lunch'],relatedIntents:['beach'],editorialScore:90}
  ],
  intentTypeMap:{beach:['beach','activity','recovery']}
});
const beach=await engine.search('strand');
assert.equal(beach.results[0].asset.id,'beach','direct beach must outrank contextual restaurant');
assert.equal(beach.results[0].tier,'direct');
assert.equal(engine.snapshot().assets,2);

assert.ok(core.includes('createModelAdapter'),'provider-independent model adapter required');
assert.ok(core.includes('deterministic-fallback'),'deterministic fallback required');
assert.ok(core.includes('schemaVersion'),'versioned discovery asset model required');
assert.ok(profile.includes('CasaDiscoveryCore'),'domain profile must use generic core');
assert.ok(content.includes("id:'restaurant-cerros'")&&content.includes("mealMoments:['breakfast','lunch','dinner','drinks']"),'Cerros must support several dining moments');
assert.ok(content.includes("id:'hoyo19'")&&content.includes("title:'Hoyo 19'"),'Hoyo must be one discoverable place');
assert.ok(html.indexOf('casa-discovery-core.js')<html.indexOf('casa-journey-planner.js'),'discovery core must load before UI');
assert.ok(html.indexOf('discovery-profile.js')<html.indexOf('casa-journey-planner.js'),'domain profile must load before UI');
console.log('Discovery Core: 12 checks passed');
