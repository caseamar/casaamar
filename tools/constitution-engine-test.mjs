import fs from 'node:fs';
const root=new URL('../',import.meta.url),json=p=>JSON.parse(fs.readFileSync(new URL(p,root),'utf8')),exists=p=>fs.existsSync(new URL(p,root));
const c=json('platform/brain/PLATFORM-CONSTITUTION.json'),r=json('registry/constitution-rules.json');
if(!c.executable)throw new Error('Constitution is not executable');
if(c.articles.length!==r.principles.length)throw new Error('Constitution coverage count mismatch');
for(const p of r.principles){if(!p.principle_id||!p.automated_tests?.length)throw new Error(`Missing automated coverage for ${p.principle_id}`);for(const t of p.automated_tests)if(!exists(t))throw new Error(`Missing test file ${t}`)}
if(r.principles.some(x=>x.coverage_status!=='covered'))throw new Error('Incomplete constitution coverage');
if(!c.articles.some(x=>String(x.id).toUpperCase()==='ARTICLE-21'))throw new Error('AI Decision UX principle missing');
console.log(`Constitution Engine: ${r.principles.length} principper · 100% automatisk coverage`);
