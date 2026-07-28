import fs from 'node:fs';import path from 'node:path';
const root=process.cwd();let passed=0;const fail=[];const ok=(c,m)=>{if(c)passed++;else fail.push(m)};
const read=j=>JSON.parse(fs.readFileSync(path.join(root,j),'utf8'));
const c=read('platform/brain/PLATFORM-CONSTITUTION.json');const i=read('registry/platform-integrity.json');const caps=read('registry/capabilities.json');const pm=read('platform-manifest.json');const subs=read('registry/subsystems.json');
ok(c.executable===true,'constitution must be executable');ok(c.articles.length>=13,'13 constitution articles required');ok(i.status==='pass','integrity status must pass');ok(i.summary.rules_failed===0,'integrity rules failed');ok(i.rules.every(r=>r.because&&r.evidence?.length),'every integrity verdict needs reason and evidence');
ok(caps.capabilities.every(x=>x.id&&x.owner&&Array.isArray(x.dependencies)&&x.layer),'capability contracts incomplete');ok(caps.capabilities.filter(x=>['active','foundation'].includes(x.status)).every(x=>typeof x.behaviour_contract_required==='boolean'),'behaviour requirement missing');
ok(pm.constitution_engine?.block_on_failure===true,'constitution must block release');ok(pm.platform_integrity?.three_layer_rule===true,'three-layer rule missing');ok(subs.subsystems.some(x=>x.id==='constitution-engine'),'constitution subsystem missing');ok(subs.subsystems.some(x=>x.id==='platform-integrity'),'integrity subsystem missing');
const forbidden=[/\bconsulting\b/i,/\bretail\b/i,/\brestaurant\b/i,/\binvoice\b/i];
for(const f of fs.readdirSync(path.join(root,'core')).filter(x=>x.endsWith('.js'))){const t=fs.readFileSync(path.join(root,'core',f),'utf8');for(const r of forbidden)ok(!r.test(t),`domain leak ${r} in core/${f}`)}
if(fail.length){console.error(`Platform Integrity FAIL: ${fail.join('; ')}`);process.exit(1)}console.log(`Platform Integrity PASS: ${passed} checks passed`);
