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
const mapping={platform:'platform_version',core:'core','platform-doctor':'platform_doctor','project-brain':'project_brain','decision-engine':'decision_engine','event-engine':'event_engine',diagnostics:'diagnostics_framework',configuration:'configuration_service',governance:'governance','audit-engine':'audit_engine','platform-contracts':'platform_contracts','subsystem-registry':'subsystem_registry','public-website-runtime':'public_website_runtime','repository-intelligence':'repository_intelligence','content-intelligence':'content_intelligence','ai-knowledge-graph':'ai_knowledge_graph','asset-intelligence':'asset_intelligence','experience-engine':'experience_engine','ai-workspace':'ai_workspace','content-studio':'content_studio','content-operations':'content_operations','website-configuration':'website_configuration','recommendation-engine':'recommendation_engine','release-governance':'release_governance'};
for(const item of registry.subsystems){const key=mapping[item.id]; const mv=key==='platform_version'?manifest[key]:manifest[key]?.version; check(Boolean(key)&&item.version===mv,`${item.display_name} registry version matches manifest (${item.version})`)}
const moduleFiles={'core/casa-core.js':'core','core/casa-brain.js':'project-brain','core/casa-decision.js':'decision-engine','core/casa-events.js':'event-engine','core/casa-diagnostics.js':'diagnostics','core/casa-config.js':'configuration','core/casa-governance.js':'governance','core/casa-audit.js':'audit-engine','core/casa-contracts.js':'platform-contracts','core/casa-subsystem-registry.js':'subsystem-registry','core/casa-repository.js':'repository-intelligence','core/casa-content.js':'content-intelligence','core/casa-knowledge-graph.js':'ai-knowledge-graph','core/casa-assets.js':'asset-intelligence','core/casa-experience.js':'experience-engine','core/casa-workspace.js':'ai-workspace','core/casa-content-studio.js':'content-studio','core/casa-content-operations.js':'content-operations','core/casa-recommendations.js':'recommendation-engine','core/casa-release-governance.js':'release-governance'};
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
const legacyWorkspaceTargets=new Set(['/knowledge-center','/knowledge-center.html']);
const registeredSubsystemIds=new Set((registry.subsystems||[]).map(x=>x.id));
const resolveWorkspaceTarget=href=>{
 if(String(href||'').startsWith('#'))return true;
 if(!String(href||'').startsWith('/'))return false;
 const relative=String(href).slice(1).split(/[?#]/)[0];
 return Boolean(relative)&&fs.existsSync(path.join(root,relative));
};
for(const module of workspaceRegistry.modules||[]){
 check(!legacyWorkspaceTargets.has(module.href),`AI Workspace module avoids legacy redirect (${module.id})`);
 check(resolveWorkspaceTarget(module.href),`AI Workspace module target exists (${module.id} -> ${module.href})`);
 if(module.subsystem_id){
  check(registeredSubsystemIds.has(module.subsystem_id),`AI Workspace dashboard subsystem resolves (${module.id} -> ${module.subsystem_id})`);
  check(Boolean(registry.subsystems.find(x=>x.id===module.subsystem_id)?.dashboard),`AI Workspace dashboard subsystem is enabled (${module.subsystem_id})`);
 }
}
for(const action of workspaceRegistry.quick_actions||[]){
 check(!legacyWorkspaceTargets.has(action.href),`AI Workspace action avoids legacy redirect (${action.id})`);
 check(resolveWorkspaceTarget(action.href),`AI Workspace action target exists (${action.id} -> ${action.href})`);
}
check(workspaceRegistry.modules.find(x=>x.id==='knowledge')?.href==='/knowledge-graph.html','Knowledge module opens the AI Knowledge Graph operational dashboard');

const workspaceSource=read('core/casa-workspace.js');
const operationalRoutes={assets:'/asset-intelligence.html',knowledge:'/knowledge-graph.html',experience:'/experience-engine.html'};
for(const [id,href] of Object.entries(operationalRoutes)){const module=workspaceRegistry.modules.find(x=>x.id===id);check(module?.href===href,`AI Workspace ${id} uses dedicated operational dashboard (${href})`);check(fs.existsSync(path.join(root,href.slice(1))),`Operational dashboard exists (${href})`);}
check(workspaceSource.includes('href:"/asset-intelligence.html"'),'Asset insight opens Asset Intelligence Dashboard');
check(workspaceSource.includes('href:"/knowledge-graph.html"'),'Knowledge insight opens Knowledge Graph Dashboard');
check(workspaceSource.includes('href:"/experience-engine.html"'),'Experience insight opens Experience Engine Dashboard');
for(const page of Object.values(operationalRoutes)){const html=read(page.slice(1));check(html.includes('/control/#ai-workspace'),`Operational dashboard returns to AI Workspace (${page})`);check(html.includes('casa-amar-build'),`Operational dashboard carries build metadata (${page})`);}

check(workspaceSource.includes('action_label'),'AI Insights expose an explicit action label');
check(workspaceSource.includes('Årsager:'),'AI Insights explain causes for blocked assets');
check(workspaceSource.includes('Påvirkning:'),'AI Insights explain impact for blocked assets');
check(read('control/index.html').includes('data-open-subsystem'),'Mission Control supports dashboard navigation');

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



// Content Studio and Workspace Completeness quality gates
const contentPages=json('registry/content-pages.json');
const contentPageIds=new Set(), contentPageRoutes=new Set();
check((contentPages.pages||[]).length>0,'Content Studio page registry is non-empty');
for(const page of contentPages.pages||[]){
 check(Boolean(page.id&&page.display_name&&page.route&&page.status&&Array.isArray(page.languages)),`Content Studio page is complete (${page.id||'unknown'})`);
 check(!contentPageIds.has(page.id),`Content Studio page id is unique (${page.id})`);contentPageIds.add(page.id);
 check(!contentPageRoutes.has(page.route),`Content Studio route is unique (${page.route})`);contentPageRoutes.add(page.route);
 check((contentPages.statuses||[]).includes(page.status),`Content Studio status is registered (${page.id}:${page.status})`);
 check((page.languages||[]).every(x=>(contentPages.languages||[]).includes(x)),`Content Studio languages are registered (${page.id})`);
 check(Number.isInteger(page.sections)&&page.sections>=0,`Content Studio section count is valid (${page.id})`);
 check(Number.isInteger(page.faq_count)&&page.faq_count>=0,`Content Studio FAQ count is valid (${page.id})`);
}
check(fs.existsSync(path.join(root,'content-studio.html')),'Content Studio dashboard exists');
const contentStudioHtml=read('content-studio.html');
check(contentStudioHtml.includes('/control/#ai-workspace'),'Content Studio returns to AI Workspace');
check(contentStudioHtml.includes('id="pages"'),'Content Studio renders a page list');
check(contentStudioHtml.includes('id="details"'),'Content Studio provides page details');
check(contentStudioHtml.includes('AI Suggestions'),'Content Studio displays AI Suggestions');
check(contentStudioHtml.includes('Side Health'),'Content Studio displays Side Health');
check(workspaceRegistry.modules.find(x=>x.id==='website')?.href==='/content-studio.html','AI Workspace Website module opens Content Studio');
check(workspaceRegistry.modules.find(x=>x.id==='website')?.status_source==='content-studio','AI Workspace Website module uses Content Studio health');
check(workspaceRegistry.quick_actions.find(x=>x.id==='new-page')?.href==='/content-studio.html','New page quick action opens Content Studio');
for(const module of workspaceRegistry.modules||[])check(resolveWorkspaceTarget(module.href),`Workspace completeness: module destination resolves (${module.id})`);
for(const action of workspaceRegistry.quick_actions||[])check(resolveWorkspaceTarget(action.href),`Workspace completeness: action destination resolves (${action.id})`);



// Content Operations quality gates
const contentOperations=json('registry/content-operations.json');
const operationIds=new Set();
const validOperationStatuses=new Set(contentOperations.statuses||[]);
const validOperationPriorities=new Set(contentOperations.priorities||[]);
for(const queueName of ['content','review','publish']){
 const items=contentOperations.queues?.[queueName]||[];
 check(Array.isArray(items),`Content Operations queue exists (${queueName})`);
 if(queueName!=='publish')check(items.length>0,`Content Operations queue is non-empty (${queueName})`);
 for(const item of items){
  check(Boolean(item.id&&item.page_id&&item.title&&item.status&&item.action_label&&item.action_href),`Content Operations item is actionable (${queueName}:${item.id||'unknown'})`);
  check(!operationIds.has(item.id),`Content Operations item id is unique (${item.id})`);operationIds.add(item.id);
  check(contentPageIds.has(item.page_id),`Content Operations page resolves (${item.id} -> ${item.page_id})`);
  check(validOperationStatuses.has(item.status),`Content Operations status is valid (${item.id}:${item.status})`);
  if(item.priority)check(validOperationPriorities.has(item.priority),`Content Operations priority is valid (${item.id}:${item.priority})`);
  check(resolveWorkspaceTarget(item.action_href),`Content Operations action target resolves (${item.id} -> ${item.action_href})`);
  if(queueName==='publish'){
   check(Array.isArray(item.blockers),`Publish Queue blockers are explicit (${item.id})`);
   check(Array.isArray(item.impact)&&item.impact.length>0,`Publish Queue impact analysis exists (${item.id})`);
   check(item.status!=='ready'||item.blockers.length===0,`Publish-ready item has no blockers (${item.id})`);
   check(item.status!=='blocked'||item.blockers.length>0,`Blocked publish item explains blockers (${item.id})`);
  }
 }
}
check(contentStudioHtml.includes('id="operations"'),'Content Studio exposes Content Operations');
check(contentStudioHtml.includes('data-queue="content"'),'Content Studio exposes Content Queue');
check(contentStudioHtml.includes('data-queue="review"'),'Content Studio exposes Review Queue');
check(contentStudioHtml.includes('data-queue="publish"'),'Content Studio exposes Publish Queue');
check(contentStudioHtml.includes('casa-content-operations.js'),'Content Studio loads Content Operations service');
check(read('core/casa-content-operations.js').includes('impact.analysis'),'Content Operations exposes impact analysis capability');
check(read('core/casa-content-operations.js').includes('ai.actions'),'Content Operations exposes AI action capability');


// Content Operations visibility and workspace-state clarity regression gates
const controlHtml=read('control/index.html');
check(controlHtml.includes('id="workspace-queues"'),'Mission Control visibly exposes work queues');
check(controlHtml.includes('id="workspaceQueueGrid"'),'Mission Control renders work queue metrics');
check(controlHtml.includes('/content-studio.html#operations'),'Mission Control links directly to Content Operations');
check(controlHtml.includes('renderWorkspaceQueues'),'Mission Control loads Content Operations data');
check(read('core/casa-core.js').includes('forventet arbejdsstatus'),'Draft workspace state is explained as expected work, not a technical failure');
check(read('core/casa-core.js').includes('action_href:"/content-studio.html#operations"'),'Workspace attention check has an actionable destination');
check(contentStudioHtml.includes('id="operations"'),'Content Studio work queues have a stable anchor');


// v134 configuration-driven recommendations and release governance gates
const websiteConfig=json('config/website.json');
check(websiteConfig.default_language==='da','Website Configuration default language is Danish');
check(Array.isArray(websiteConfig.enabled_languages)&&websiteConfig.enabled_languages.length===1&&websiteConfig.enabled_languages[0]==='da','Only configured languages are validated');
check(websiteConfig.translation_policy.validate_only_enabled_languages===true,'Translation validation is configuration-driven');
check(websiteConfig.translation_policy.ai_may_enable_languages===false,'AI cannot enable languages automatically');
check(websiteConfig.translation_policy.human_approval_required===true,'Language activation requires human approval');
const recommendations=json('registry/recommendations.json');
for(const recommendation of recommendations.recommendations||[]){
 check(Boolean(recommendation.id&&recommendation.title&&recommendation.reason&&recommendation.expected_benefit),'Recommendation is explainable and complete');
 check(Array.isArray(recommendation.actions)&&['accept','pause','reject','review_later'].every(x=>recommendation.actions.includes(x)),'Recommendation exposes complete human decision lifecycle');
 check(recommendation.automatic_execution===false,'Recommendation cannot execute automatically');
}
check(fs.existsSync(path.join(root,'recommendation-engine.html')),'Recommendation Engine dashboard exists');
check(read('recommendation-engine.html').includes('AI foreslår. Du beslutter.'),'Recommendation dashboard communicates human control');
const governance=json('release-governance.json');
check(governance.self_assessment.score===100,'Release Governance self-assessment score is 100%');
check(governance.approval_policy.block_on_failure===true,'Release Governance blocks failed releases');
check(governance.approval_policy.human_review_required===true,'Release Governance requires human review');
check(governance.categories.every(x=>x.status==='pass'),'All Release Governance categories pass');
check(fs.existsSync(path.join(root,'release-governance.html')),'Release Governance dashboard exists');
check(read('control/index.html').includes('/recommendation-engine.html'),'AI Workspace links to Recommendation Engine');
check(read('control/index.html').includes('/release-governance.html'),'AI Workspace links to Release Governance');


// v136 semantic, operational-navigation and explainable UI gates
const semanticNavigation=json('registry/semantic-navigation.json');
const normalizeLabel=s=>String(s||'').toLocaleLowerCase('da').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const tokenSet=s=>new Set(normalizeLabel(s).split(/\s+/).filter(Boolean));
const similarity=(a,b)=>{const A=tokenSet(a),B=tokenSet(b);if(!A.size||!B.size)return 0;const inter=[...A].filter(x=>B.has(x)).length;return inter/Math.max(A.size,B.size)};
const semanticEntries=semanticNavigation.entries||[];
const seenSemantic=new Map();
for(const entry of semanticEntries){const key=normalizeLabel(entry.label);if(seenSemantic.has(key))check(seenSemantic.get(key)===entry.destination,`Same semantic label resolves consistently (${entry.label})`);else seenSemantic.set(key,entry.destination)}
for(let i=0;i<semanticEntries.length;i++)for(let j=i+1;j<semanticEntries.length;j++){const a=semanticEntries[i],b=semanticEntries[j],score=similarity(a.label,b.label);if(a.role==='operational'&&b.role==='operational'&&a.intent!==b.intent)check(score<0.8,`Operational labels are semantically distinct (${a.label} / ${b.label})`)}
for(const module of workspaceRegistry.modules||[]){check(module.navigation_role==='operational',`Workspace module is operational (${module.id})`);check(!module.subsystem_id,`Workspace module does not intercept into technical metadata (${module.id})`)}
check(workspaceRegistry.modules.find(x=>x.id==='recommendations')?.display_name==='AI-anbefalinger','Recommendation workspace label is user-facing and Danish');
check(registry.subsystems.find(x=>x.id==='recommendation-engine')?.display_name==='AI Recommendation Service','Technical recommendation subsystem has a distinct technical name');
check(!controlHtml.includes('data-open-subsystem="${item.subsystem_id}"'),'Workspace renderer does not generate technical subsystem interception');
const recommendationHtml=read('recommendation-engine.html');
for(const token of ['>Confidence<','Activation should','English is activated','Success means'])check(!recommendationHtml.includes(token),`Recommendation UI excludes mixed-language token (${token})`);
check(recommendationHtml.includes('Datagrundlag'),'Recommendation UI exposes evidence');
check(recommendationHtml.includes('Definition af succes'),'Recommendation UI uses clear Danish terminology');
check(controlHtml.includes('data.uiSelfTest')||controlHtml.includes('uiSelfTest'),'Control Center includes runtime overflow self-test');
check(recommendationHtml.includes('uiSelfTest'),'Recommendation UI includes runtime overflow and language self-test');
check(fs.existsSync(path.join(root,'tools/browser-ui-smoke-test.mjs')),'Optional browser smoke-test runner is packaged for CI environments with Chromium support');



// v137 scalable test-governance and compact workspace-title gates
const testContracts=json('registry/test-contracts.json');
check(testContracts.policy?.new_capability_requires_contract===true,'New capabilities require declarative test contracts');
check(testContracts.policy?.changed_capability_requires_targeted_tests===true,'Changed capabilities require targeted tests');
check(testContracts.policy?.full_platform_consistency_suite_required===true,'Every release runs the full platform consistency suite');
check(testContracts.policy?.automatic_failure_blocks_release===true,'Automatic failures block release');
check(testContracts.policy?.unverifiable_requires_manual_review===true,'Unverifiable behaviour is routed to manual review');
const contractIds=new Set((testContracts.components||[]).map(x=>x.id));
for(const required of ['ai-workspace','recommendation-engine','release-governance'])check(contractIds.has(required),`Test contract exists (${required})`);
for(const component of testContracts.components||[]){check(Array.isArray(component.required_tests)&&component.required_tests.length>0,`Component has automatic tests (${component.id})`);check(Array.isArray(component.manual_review),`Component declares manual review scope (${component.id})`)}
const compactLabels=new Map();
for(const module of workspaceRegistry.modules||[]){
 const compact=module.compact_display_name||module.display_name;
 check(compact.length<=18,`Workspace compact title is bounded (${module.id}: ${compact})`);
 check(!/[\u00ad]/.test(compact),`Workspace compact title avoids forced soft hyphenation (${module.id})`);
 check(!compactLabels.has(normalizeLabel(compact)),`Workspace compact title is unique (${compact})`);compactLabels.set(normalizeLabel(compact),module.id);
 check(Boolean(module.test_contract?.route_resolves&&module.test_contract?.operational_destination&&module.test_contract?.valid_empty_state),`Workspace module declares behavioural contract (${module.id})`);
}
check(workspaceRegistry.modules.find(x=>x.id==='recommendations')?.compact_display_name==='Anbefalinger','Recommendation card uses a compact title that fits');
check(workspaceRegistry.modules.find(x=>x.id==='release-governance')?.compact_display_name==='Release-tjek','Release governance card uses a compact title that fits');
check(controlHtml.includes('item.compact_display_name||item.display_name'),'Workspace renderer uses registered compact titles');
check(controlHtml.includes('hyphens:none'),'Workspace titles disable automatic word splitting');
check(controlHtml.includes("workspace-title-fit"),'Runtime UI self-test detects workspace title fit failures');

console.log(`Release quality gate: ${pass.length} passed, ${fail.length} failed`);
for(const x of fail)console.error(`FAIL: ${x}`);
if(fail.length)process.exit(1);
