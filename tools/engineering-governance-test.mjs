import fs from "node:fs";import path from "node:path";
const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),"..");const j=p=>JSON.parse(fs.readFileSync(path.join(root,p),"utf8"));const failures=[];const pass=[];const check=(ok,m)=>(ok?pass:failures).push(m);
const manifest=j("platform-manifest.json"), eng=j("registry/engineering-governance.json"), caps=j("registry/capabilities.json"), graph=j("registry/dependency-graph.json"), subs=j("registry/subsystems.json"), constitution=j("platform/brain/PLATFORM-CONSTITUTION.json");
const subIds=new Set(subs.subsystems.map(x=>x.id));const capItems=caps.capabilities||caps.items||[];
check(manifest.engineering_governance?.version===eng.version,"Manifest and Engineering Governance versions match");
check(subIds.has("engineering-governance"),"Engineering Governance subsystem is registered");
check(capItems.some(x=>x.id==="engineering-governance"),"Engineering Governance capability is registered");
check(eng.quality_dimensions.length===5,"All five quality dimensions are defined");
check(Object.keys(eng.assessment.dimensions||{}).length===5,"Assessment covers all five dimensions");
check(eng.rules.every(x=>x.id&&x.statement&&x.severity&&x.automated_check),"Every engineering rule is executable and explainable");
check(Array.isArray(eng.technical_debt),"Technical debt registry exists");
check(constitution.articles.length>=10,"Platform Constitution contains the required principles");
check(graph.nodes.every(n=>subIds.has(n.id)),"Every dependency node resolves to a subsystem");
check(graph.edges.every(e=>subIds.has(e.from)&&subIds.has(e.to)&&e.from!==e.to),"Every dependency edge resolves without self-dependencies");
const adrFiles=fs.readdirSync(path.join(root,"platform/brain/adr")).filter(x=>x.endsWith(".json"));check(adrFiles.length>=6,"Architecture Decision Records are present");
const source=fs.readFileSync(path.join(root,"core/casa-engineering-governance.js"),"utf8");check(source.includes('const VERSION="1.1.0"'),"Engineering Governance runtime version matches");
for(const f of ["core","control","registry"].flatMap(d=>fs.readdirSync(path.join(root,d)).filter(x=>x.endsWith(".js")||x.endsWith(".html")||x.endsWith(".json")).map(x=>path.join(d,x)))){const s=fs.readFileSync(path.join(root,f),"utf8");check(!/callGPT|callClaude|openai\.com\/v1|anthropic\.com\/v1/i.test(s),`No direct AI provider lock-in in ${f}`)}
const learning=JSON.parse(fs.readFileSync(path.join(root,'registry/learning-registry.json'),'utf8'));check((learning.entries||[]).every(x=>x.root_cause&&x.learning&&(x.prevention||[]).length&&(x.test_evidence||[]).length),'Learning records contain root cause, learning, prevention and test evidence');
console.log(`${pass.length} Engineering Governance checks passed`);if(failures.length){console.error(failures.join("\n"));process.exit(1)}
