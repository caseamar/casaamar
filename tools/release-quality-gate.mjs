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
const mapping={platform:'platform_version',core:'core','platform-doctor':'platform_doctor','project-brain':'project_brain','decision-engine':'decision_engine','event-engine':'event_engine',diagnostics:'diagnostics_framework',configuration:'configuration_service',governance:'governance','audit-engine':'audit_engine','platform-contracts':'platform_contracts','subsystem-registry':'subsystem_registry','public-website-runtime':'public_website_runtime','repository-intelligence':'repository_intelligence','content-intelligence':'content_intelligence','ai-knowledge-graph':'ai_knowledge_graph','asset-intelligence':'asset_intelligence','experience-engine':'experience_engine','ai-workspace':'ai_workspace'};
for(const item of registry.subsystems){const key=mapping[item.id]; const mv=key==='platform_version'?manifest[key]:manifest[key]?.version; check(Boolean(key)&&item.version===mv,`${item.display_name} registry version matches manifest (${item.version})`)}
const moduleFiles={'core/casa-core.js':'core','core/casa-brain.js':'project-brain','core/casa-decision.js':'decision-engine','core/casa-events.js':'event-engine','core/casa-diagnostics.js':'diagnostics','core/casa-config.js':'configuration','core/casa-governance.js':'governance','core/casa-audit.js':'audit-engine','core/casa-contracts.js':'platform-contracts','core/casa-subsystem-registry.js':'subsystem-registry','core/casa-repository.js':'repository-intelligence','core/casa-content.js':'content-intelligence','core/casa-knowledge-graph.js':'ai-knowledge-graph','core/casa-assets.js':'asset-intelligence','core/casa-experience.js':'experience-engine','core/casa-workspace.js':'ai-workspace'};
for(const [file,id] of Object.entries(moduleFiles)){const v=read(file).match(/const VERSION="([^"]+)"/)?.[1]; const rv=registry.subsystems.find(x=>x.id===id)?.version; check(v===rv,`${file} version matches registry (${v})`)}
const current=manifest.platform_version.match(/^v(\d{4})\.(\d{2})\.(\d{2})\.(\d+)$/); check(Boolean(current),'Platform version format is valid'); const cache=current?`${current[1]}${current[2]}${current[3]}.${current[4]}`:'';
const deployExt=new Set(['.html','.js']);
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)])}
for(const f of walk(root)){const rel=path.relative(root,f).replaceAll('\\','/'); if(rel.startsWith('tools/')||rel==='deployment-manifest.json')continue; if(deployExt.has(path.extname(f))){const text=fs.readFileSync(f,'utf8'); const keys=[...text.matchAll(/v=(\d{8}\.\d+)/g)].map(m=>m[1]); check(keys.every(k=>k===cache),`${rel} cache keys are current`)}}
for(const f of walk(root).filter(f=>f.endsWith('.json'))){try{JSON.parse(fs.readFileSync(f,'utf8'));}catch(e){fail.push(`${path.relative(root,f)} JSON parse: ${e.message}`)}}
for(const f of walk(root).filter(f=>f.endsWith('.js'))){try{execFileSync(process.execPath,['--check',f],{stdio:'pipe'});}catch(e){fail.push(`${path.relative(root,f)} JavaScript syntax failed`)}}


const activeIdentityFiles=['platform-shell.js','control/index.html','config/configuration-manifest.json','release-notes.json','platform/brain/version-contract.json'];
const activeReleaseNumber=Number(current?.[4]||0);
for(const file of activeIdentityFiles){const text=read(file);const stale=[...text.matchAll(/v2026\.07\.24\.(\d+)/g)].map(m=>Number(m[1])).filter(n=>n!==activeReleaseNumber);check(stale.length===0,`${file} contains only current platform identity`);}
check(read('control/index.html').includes(manifest.platform_version),`Control Center embeds current platform identity (${manifest.platform_version})`);
check(json('config/configuration-manifest.json').platform_version===manifest.platform_version,`Configuration manifest matches platform identity (${manifest.platform_version})`);
check(json('release-notes.json').release===manifest.platform_version,`Release notes match platform identity (${manifest.platform_version})`);

const graph=json('registry/knowledge-graph.json');
const entityIds=new Set(); const relationIds=new Set(); const edgeKeys=new Set();
for(const entity of graph.entities||[]){check(Boolean(entity.id&&entity.display_name&&entity.type),`Knowledge Graph entity ${entity.id||'unknown'} is complete`);check(!entityIds.has(entity.id),`Knowledge Graph entity id is unique (${entity.id})`);entityIds.add(entity.id);check((graph.entity_types||[]).includes(entity.type),`Knowledge Graph entity type is registered (${entity.type})`)}
for(const relation of graph.relations||[]){check(Boolean(relation.id&&relation.from&&relation.to&&relation.type),`Knowledge Graph relation ${relation.id||'unknown'} is complete`);check(!relationIds.has(relation.id),`Knowledge Graph relation id is unique (${relation.id})`);relationIds.add(relation.id);check(entityIds.has(relation.from)&&entityIds.has(relation.to),`Knowledge Graph relation resolves (${relation.id})`);check(relation.from!==relation.to,`Knowledge Graph self relation forbidden (${relation.id})`);check((graph.relation_types||[]).includes(relation.type),`Knowledge Graph relation type is registered (${relation.type})`);const edge=`${relation.from}|${relation.type}|${relation.to}`;check(!edgeKeys.has(edge),`Knowledge Graph edge is unique (${edge})`);edgeKeys.add(edge)}
const connected=new Set((graph.relations||[]).flatMap(r=>[r.from,r.to]));for(const entity of graph.entities||[])check(entity.standalone===true||connected.has(entity.id),`Knowledge Graph entity is connected or standalone (${entity.id})`);
const contentIds=new Set((json('registry/content.json').items||[]).map(x=>x.id));for(const entity of graph.entities||[])if(entity.source_ref)check(contentIds.has(entity.source_ref),`Knowledge Graph source reference resolves (${entity.source_ref})`);



const assetRegistry=json('registry/assets.json');
const assetIds=new Set(); const assetPaths=new Set();
for(const asset of assetRegistry.items||[]){
 check(Boolean(asset.id&&asset.type&&asset.path),`Asset Intelligence asset ${asset.id||'unknown'} is complete`);
 check(!assetIds.has(asset.id),`Asset Intelligence asset id is unique (${asset.id})`); assetIds.add(asset.id);
 check(!assetPaths.has(asset.path),`Asset Intelligence asset path is unique (${asset.path})`); assetPaths.add(asset.path);
 check((assetRegistry.asset_types||[]).includes(asset.type),`Asset Intelligence asset type is registered (${asset.type})`);
}
const sourceAssets=json('asset-library.json').assets||[];
check(sourceAssets.length===(assetRegistry.items||[]).length,`Asset Intelligence inventory covers asset library (${sourceAssets.length})`);
for(const source of sourceAssets){check(assetIds.has(source.id),`Asset Intelligence resolves source asset (${source.id})`)}


const contentRegistry=json('registry/content.json');
const validContentIds=new Set((contentRegistry.items||[]).map(x=>x.id));
const readinessLevels=new Set(['ready','review','blocked']);
for(const asset of assetRegistry.items||[]){
 check(Boolean(asset.readiness&&Number.isFinite(asset.readiness.score)&&readinessLevels.has(asset.readiness.level)),`Asset readiness contract is valid (${asset.id})`);
 check(asset.readiness.score>=0&&asset.readiness.score<=100,`Asset readiness score is bounded (${asset.id})`);
 check((asset.related_content||[]).length===(asset.relation_count||0),`Asset relation count matches canonical relations (${asset.id})`);
 for(const target of asset.related_content||[])check(validContentIds.has(target),`Asset content relation resolves (${asset.id} -> ${target})`);
 check((asset.readiness.variant_count||0)>=0&&(asset.readiness.variant_count||0)<=3,`Asset variant readiness is bounded (${asset.id})`);
}



const variantRegistry=json('registry/asset-variants.json');
const requiredProfiles=new Set((variantRegistry.policy?.required_profiles||[]).map(x=>x.id));
const variantPlanIds=new Set();
check(variantRegistry.policy?.originals_are_immutable===true,'Asset variant originals are immutable');
check(variantRegistry.policy?.generation_requires_explicit_execution===true,'Asset variant generation requires explicit execution');
check(variantRegistry.policy?.release_package_does_not_modify_images===true,'Release package preserves the images directory');
for(const plan of variantRegistry.plans||[]){
 check(assetIds.has(plan.asset_id),`Asset variant plan resolves (${plan.asset_id})`);
 check(!variantPlanIds.has(plan.asset_id),`Asset variant plan is unique (${plan.asset_id})`); variantPlanIds.add(plan.asset_id);
 check(plan.source_immutable===true&&plan.generation_mode==='non-destructive',`Asset variant plan is non-destructive (${plan.asset_id})`);
 const ids=new Set();
 for(const variant of plan.variants||[]){check(!ids.has(variant.id),`Asset variant id is unique (${plan.asset_id}:${variant.id})`);ids.add(variant.id);check(Number.isInteger(variant.width)&&variant.width>0,`Asset variant width is valid (${plan.asset_id}:${variant.id})`);check(String(variant.target_path||'').startsWith('generated/'),`Asset variant output is isolated (${plan.asset_id}:${variant.id})`);}
 if((assetRegistry.items||[]).find(x=>x.id===plan.asset_id)?.type==='image')for(const id of requiredProfiles)check(ids.has(id),`Asset variant profile is complete (${plan.asset_id}:${id})`);
}
for(const id of assetIds)check(variantPlanIds.has(id),`Asset variant plan covers canonical asset (${id})`);



const experience=json('registry/experiences.json');
const stageIds=new Set(); const touchpointIds=new Set();
for(const stage of experience.journey_stages||[]){check(Boolean(stage.id&&stage.display_name&&Number.isFinite(stage.order)),`Experience stage is complete (${stage.id||'unknown'})`);check(!stageIds.has(stage.id),`Experience stage id is unique (${stage.id})`);stageIds.add(stage.id)}
const experienceContentIds=new Set((json('registry/content.json').items||[]).map(x=>x.id));
const experienceAssetIds=new Set((json('registry/assets.json').items||[]).map(x=>x.id));
for(const point of experience.touchpoints||[]){check(Boolean(point.id&&point.stage),`Experience touchpoint is complete (${point.id||'unknown'})`);check(!touchpointIds.has(point.id),`Experience touchpoint id is unique (${point.id})`);touchpointIds.add(point.id);check(stageIds.has(point.stage),`Experience touchpoint stage resolves (${point.id} -> ${point.stage})`);for(const ref of point.content_refs||[])check(experienceContentIds.has(ref),`Experience content reference resolves (${point.id} -> ${ref})`);for(const ref of point.asset_refs||[])check(experienceAssetIds.has(ref),`Experience asset reference resolves (${point.id} -> ${ref})`)}
for(const required of experience.quality_rules?.required_stage_coverage||[])check((experience.touchpoints||[]).some(x=>x.stage===required),`Experience required stage is covered (${required})`);




const workspaceRegistry=json('registry/workspace.json');
const workspaceModuleIds=new Set();
for(const module of workspaceRegistry.modules||[]){check(Boolean(module.id&&module.display_name&&module.href&&module.status_source),`AI Workspace module is complete (${module.id||'unknown'})`);check(!workspaceModuleIds.has(module.id),`AI Workspace module id is unique (${module.id})`);workspaceModuleIds.add(module.id);check(Boolean(registry.subsystems.find(x=>x.id===module.status_source)),`AI Workspace status source is registered (${module.id} -> ${module.status_source})`)}
const workspaceActionIds=new Set();for(const action of workspaceRegistry.quick_actions||[]){check(Boolean(action.id&&action.label&&action.href&&action.module),`AI Workspace action is complete (${action.id||'unknown'})`);check(!workspaceActionIds.has(action.id),`AI Workspace action id is unique (${action.id})`);workspaceActionIds.add(action.id);check(workspaceModuleIds.has(action.module),`AI Workspace action module resolves (${action.id} -> ${action.module})`)}
check(read('control/index.html').includes('id="ai-workspace"'),'AI Workspace is visible in Mission Control');

// Active build timestamp contract
const activeBuild = new Date(manifest.build);
check(!Number.isNaN(activeBuild.getTime()), `Platform build timestamp is valid (${manifest.build})`);
check(manifest.build_timezone === 'Europe/Copenhagen', 'Platform build timezone is Europe/Copenhagen');
const now = Date.now();
check(activeBuild.getTime() <= now + 5 * 60 * 1000, 'Platform build timestamp is not in the future');
check(manifest.generated_at === manifest.build, 'Manifest generated_at matches canonical build timestamp');
const deploymentManifest = json('deployment-manifest.json');
const releaseValidation = json('release-validation.json');
const repositoryRegistry = json('registry/repository.json');
const subsystemRegistry = json('registry/subsystems.json');
check(deploymentManifest.generated_at === manifest.build, 'Deployment manifest timestamp matches canonical build timestamp');
check(releaseValidation.generated_at === manifest.build, 'Release validation timestamp matches canonical build timestamp');
check(repositoryRegistry.generated_at === manifest.build, 'Repository registry timestamp matches canonical build timestamp');
check(subsystemRegistry.updated_at === manifest.build, 'Subsystem registry timestamp matches canonical build timestamp');
const workerBuild = worker.match(/build:\s*"([^"]+)"/)?.[1];
check(workerBuild === manifest.build, 'Worker build timestamp matches canonical build timestamp');
check(read('control/index.html').includes(`data-expected-build="${manifest.build}"`), 'Control Center expected build matches canonical build timestamp');
check(read('index.html').includes(`content="${manifest.build}" name="casa-amar-build"`), 'Public website build metadata matches canonical build timestamp');

console.log(`Release quality gate: ${pass.length} passed, ${fail.length} failed`);
for(const x of fail)console.error(`FAIL: ${x}`);
if(fail.length)process.exit(1);
