import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';
const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');const checks=[];const ok=(x,m)=>{if(!x)throw new Error(m);checks.push(m)};
const c={window:null};c.window=c;c.globalThis=c;vm.createContext(c);vm.runInContext(fs.readFileSync(path.join(root,'core/casa-action-language.js'),'utf8'),c);
const samples=[
 {key:'asset:patio',title:'Gennemgå asset og alt-tekst',targetWorkspace:'asset-intelligence'},
 {key:'cap:asset',title:'Opdatér grounded AI-kontekst',targetWorkspace:'asset-intelligence'},
 {key:'cap:content',title:'Opdatér grounded AI-kontekst',targetWorkspace:'content-intelligence'},
 {key:'cap:concierge',title:'Opdatér grounded AI-kontekst',targetWorkspace:'digital-concierge'},
 {key:'content:experience',title:'Gennemgå oplevelsesbeskrivelser',targetWorkspace:'content-intelligence'}
];
for(const a of samples){const u=c.CasaActionLanguage.explain(a);ok(c.CasaActionLanguage.isPlainLanguage(u.title),'Brugertitel er fri for interne platformbegreber');ok(c.CasaActionLanguage.isPlainLanguage(u.description),'Beskrivelse er skrevet i almindeligt sprog');ok(Boolean(u.outcome),'Resultatet af handlingen forklares');ok(Array.isArray(u.benefits)&&u.benefits.length>0,'Brugerværdi vises')}
const html=fs.readFileSync(path.join(root,'domain-intelligence.html'),'utf8');ok(html.includes('Start alle forbedringer'),'Samlet CTA findes');ok(html.includes('én ad gangen'),'Samlet flow forklarer godkendelser');ok(html.includes('Vis tekniske detaljer'),'Interne detaljer er skjult som standard');ok(html.includes('Start opgaven'),'Primær CTA er handlingsorienteret');ok(!html.includes('>Udfør nu</button>'),'Gammel uklar CTA er fjernet fra UI');
console.log(`Action Language UX: ${checks.length} checks passed`);
