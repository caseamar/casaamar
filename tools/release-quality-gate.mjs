import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const json=p=>JSON.parse(read(p));
const fail=[]; const pass=[];
const check=(ok,msg)=>{(ok?pass:fail).push(msg)};
const manifest=json('platform-manifest.json');
const registry=json('registry/subsystems.json');
const worker=read('_worker.js');
const workerPlatform=worker.match(/platform_version:\s*"([^"]+)"/)?.[1];
const workerVersion=worker.match(/worker_version:\s*"([^"]+)"/)?.[1];
check(workerPlatform===manifest.platform_version,`Worker platform identity = ${manifest.platform_version}`);
check(workerVersion===manifest.worker_version,`Worker version identity = ${manifest.worker_version}`);
const mapping={platform:'platform_version',core:'core','platform-doctor':'platform_doctor','project-brain':'project_brain','decision-engine':'decision_engine','event-engine':'event_engine',diagnostics:'diagnostics_framework',configuration:'configuration_service',governance:'governance','audit-engine':'audit_engine','platform-contracts':'platform_contracts','subsystem-registry':'subsystem_registry','public-website-runtime':'public_website_runtime','repository-intelligence':'repository_intelligence','content-intelligence':'content_intelligence','ai-knowledge-graph':'ai_knowledge_graph'};
for(const item of registry.subsystems){const key=mapping[item.id]; const mv=key==='platform_version'?manifest[key]:manifest[key]?.version; check(Boolean(key)&&item.version===mv,`${item.display_name} registry version matches manifest (${item.version})`)}
const moduleFiles={'core/casa-core.js':'core','core/casa-brain.js':'project-brain','core/casa-decision.js':'decision-engine','core/casa-events.js':'event-engine','core/casa-diagnostics.js':'diagnostics','core/casa-config.js':'configuration','core/casa-governance.js':'governance','core/casa-audit.js':'audit-engine','core/casa-contracts.js':'platform-contracts','core/casa-subsystem-registry.js':'subsystem-registry','core/casa-repository.js':'repository-intelligence','core/casa-content.js':'content-intelligence','core/casa-knowledge-graph.js':'ai-knowledge-graph'};
for(const [file,id] of Object.entries(moduleFiles)){const v=read(file).match(/const VERSION="([^"]+)"/)?.[1]; const rv=registry.subsystems.find(x=>x.id===id)?.version; check(v===rv,`${file} version matches registry (${v})`)}
const current=manifest.platform_version.match(/^v(\d{4})\.(\d{2})\.(\d{2})\.(\d+)$/); check(Boolean(current),'Platform version format is valid'); const cache=current?`${current[1]}${current[2]}${current[3]}.${current[4]}`:'';
const deployExt=new Set(['.html','.js']);
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)])}
for(const f of walk(root)){const rel=path.relative(root,f).replaceAll('\\','/'); if(rel.startsWith('tools/')||rel==='deployment-manifest.json')continue; if(deployExt.has(path.extname(f))){const text=fs.readFileSync(f,'utf8'); const keys=[...text.matchAll(/v=(\d{8}\.\d+)/g)].map(m=>m[1]); check(keys.every(k=>k===cache),`${rel} cache keys are current`)}}
for(const f of walk(root).filter(f=>f.endsWith('.json'))){try{JSON.parse(fs.readFileSync(f,'utf8'));}catch(e){fail.push(`${path.relative(root,f)} JSON parse: ${e.message}`)}}
for(const f of walk(root).filter(f=>f.endsWith('.js'))){try{execFileSync(process.execPath,['--check',f],{stdio:'pipe'});}catch(e){fail.push(`${path.relative(root,f)} JavaScript syntax failed`)}}


const activeIdentityFiles=['platform-shell.js','control/index.html','config/configuration-manifest.json','release-notes.json','platform/brain/version-contract.json'];
for(const file of activeIdentityFiles){const text=read(file);check(!text.includes('v2026.07.24.120'),`${file} contains no stale previous platform identity`);check(!text.includes('20260724.120'),`${file} contains no stale previous cache identity`);}
check(read('control/index.html').includes(manifest.platform_version),`Control Center embeds current platform identity (${manifest.platform_version})`);
check(json('config/configuration-manifest.json').platform_version===manifest.platform_version,`Configuration manifest matches platform identity (${manifest.platform_version})`);
check(json('release-notes.json').release===manifest.platform_version,`Release notes match platform identity (${manifest.platform_version})`);

const graph=json('registry/knowledge-graph.json');
const entityIds=new Set(); const relationIds=new Set(); const edgeKeys=new Set();
for(const entity of graph.entities||[]){check(Boolean(entity.id&&entity.display_name&&entity.type),`Knowledge Graph entity ${entity.id||'unknown'} is complete`);check(!entityIds.has(entity.id),`Knowledge Graph entity id is unique (${entity.id})`);entityIds.add(entity.id);check((graph.entity_types||[]).includes(entity.type),`Knowledge Graph entity type is registered (${entity.type})`)}
for(const relation of graph.relations||[]){check(Boolean(relation.id&&relation.from&&relation.to&&relation.type),`Knowledge Graph relation ${relation.id||'unknown'} is complete`);check(!relationIds.has(relation.id),`Knowledge Graph relation id is unique (${relation.id})`);relationIds.add(relation.id);check(entityIds.has(relation.from)&&entityIds.has(relation.to),`Knowledge Graph relation resolves (${relation.id})`);check(relation.from!==relation.to,`Knowledge Graph self relation forbidden (${relation.id})`);check((graph.relation_types||[]).includes(relation.type),`Knowledge Graph relation type is registered (${relation.type})`);const edge=`${relation.from}|${relation.type}|${relation.to}`;check(!edgeKeys.has(edge),`Knowledge Graph edge is unique (${edge})`);edgeKeys.add(edge)}
const connected=new Set((graph.relations||[]).flatMap(r=>[r.from,r.to]));for(const entity of graph.entities||[])check(entity.standalone===true||connected.has(entity.id),`Knowledge Graph entity is connected or standalone (${entity.id})`);
const contentIds=new Set((json('registry/content.json').items||[]).map(x=>x.id));for(const entity of graph.entities||[])if(entity.source_ref)check(contentIds.has(entity.source_ref),`Knowledge Graph source reference resolves (${entity.source_ref})`);

console.log(`Release quality gate: ${pass.length} passed, ${fail.length} failed`);
for(const x of fail)console.error(`FAIL: ${x}`);
if(fail.length)process.exit(1);
