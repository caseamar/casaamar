
(()=>{
const PAGES={
 "/knowledge-center.html":{
  title:"Mission Control",
  eyebrow:"Din AI-arbejdsplan",
  description:"Her får du én prioriteret plan, tydelig status og den sikreste vej fra idé til en opdateret hjemmeside.",
  cta:"Se min vigtigste opgave",href:"#next-best-action",
  next:"AI analyserer viden, billeder, hjemmeside og udgivelsesstatus."
 },
 "/knowledge-studio.html":{
  title:"Viden",
  eyebrow:"Indhold og fakta",
  description:"Tilføj idéer og oplysninger med almindelige ord. AI foreslår, hvilke eksisterende emner der skal opdateres, eller om der skal oprettes noget nyt.",
  cta:"Tilføj ny viden",href:"#",
  next:"Skriv først. AI hjælper med struktur, dubletter og kvalitet bagefter."
 },
 "/knowledge-review.html":{
  title:"Godkend AI-forslag",
  eyebrow:"Kun det der kræver dig",
  description:"Her ser du forslag, hvor AI har brug for din vurdering. Start øverst; de vigtigste vises først.",
  cta:"Start første review",href:"#",
  next:"Godkend, ret eller afvis. AI gemmer resultatet og foreslår næste opgave."
 },
 "/knowledge-architect.html":{
  title:"Struktur og oprydning",
  eyebrow:"Hold viden enkel",
  description:"AI finder dubletter, brede emner og uklar struktur. Du tager kun stilling til de anbefalede ændringer.",
  cta:"Se vigtigste forslag",href:"#",
  next:"Tekniske objektnavne vises kun som ekstra information."
 },
 "/brand-studio.html":{
  title:"Stil og tone",
  eyebrow:"Sådan skal Casa Amar lyde",
  description:"Her lærer AI den ønskede stemme, så tekster til hjemmeside og chatbot bliver ensartede uden at lyde generiske.",
  cta:"Gennemgå AI's forståelse",href:"#",
  next:"Ret kun det, AI har misforstået. Resten gemmes automatisk."
 },
 "/page-studio.html":{
  title:"Hjemmesiden",
  eyebrow:"Forbedr gæstens oplevelse",
  description:"Arbejd med budskaber, billeder og sektioner. AI udfylder forslag og forklarer, hvad der mangler, og hvorfor det er vigtigt.",
  cta:"Se vigtigste forbedring",href:"#",
  next:"Fokus er opmærksomhed, tryghed og flere relevante henvendelser."
 },
 "/asset-studio.html":{
  title:"Billeder",
  eyebrow:"Dit visuelle bibliotek",
  description:"Tilføj billeder, få AI-beskrivelser, find dubletter og se, hvilke motiver der bedst kan forbedre hjemmesiden.",
  cta:"Tilføj billeder",href:"#uploadDropzone",
  next:"AI gør standardarbejdet. Du kan altid rette beskrivelse, sæson og valg."
 },
 "/photo-missions.html":{
  title:"Fotoopgaver",
  eyebrow:"Hvad skal du fotografere næste gang?",
  description:"AI omsætter hjemmesidens mangler til konkrete fotoopgaver med formål, motiv, tidspunkt og praktisk vejledning.",
  cta:"Start vigtigste fotoopgave",href:"#missions",
  next:"Tag flere varianter. Upload dem bagefter under Billeder; AI vælger de bedste."
 },
 "/asset-brief.html":{
  title:"Billedplan",
  eyebrow:"Visuel dækning",
  description:"Se hvilke dele af hjemmesiden der allerede har gode billeder, og hvor nye billeder vil gøre størst forskel.",
  cta:"Se største billedmangel",href:"#",
  next:"Billedplanen styrer Fotoopgaver og AI's anbefalinger."
 },
 "/ai-test-runner.html":{
  title:"Kvalitetstjek",
  eyebrow:"Test kun det relevante",
  description:"Kør ændrede og fejlede tests først. Beståede tests genbruges, medmindre den relevante funktion er ændret.",
  cta:"Kør relevante tests",href:"#",
  next:"Målet er at finde nye problemer — ikke at gentage de samme test manuelt."
 },
 "/knowledge-debug.html":{
  title:"Teknisk hjælp",
  eyebrow:"Kun når noget fejler",
  description:"Her findes tekniske detaljer og fejlsøgning. Normalt sender Mission Control dig kun her, når det er nødvendigt.",
  cta:"Se aktuelle fejl",href:"#",
  next:"Almindeligt arbejde foregår i de øvrige arbejdsområder."
 }
};
const path=location.pathname.endsWith("/")?"/knowledge-center.html":location.pathname;
const cfg=PAGES[path]||PAGES["/knowledge-center.html"];
const main=document.querySelector("main");
if(!main)return;
main.classList.add("ca-shell");

document.querySelectorAll(".platform-nav").forEach(el=>el.remove());
document.querySelectorAll(".release-panel").forEach(el=>el.classList.add("ca-hidden"));

const top=document.createElement("div");
top.className="ca-topbar";
top.innerHTML=`
 <a class="ca-brand" href="/knowledge-center.html">
  <span class="ca-logo">CA</span>
  <span class="ca-brand-copy"><strong>Casa Amar AI</strong><span>AI arbejder. Du beslutter.</span></span>
 </a>
 <div class="ca-top-actions">
  <span class="ca-pill"><span class="ca-dot"></span><span id="caLiveStatus">Platform online</span></span>
  <a class="ca-pill" href="/">Se hjemmesiden</a>
 </div>`;
main.prepend(top);

const nav=document.createElement("nav");
nav.className="ca-nav";
const links=[
 ["/knowledge-center.html","Mission Control"],
 ["/page-studio.html","Hjemmesiden"],
 ["/asset-studio.html","Billeder"],
 ["/knowledge-studio.html","Viden"],
 ["/photo-missions.html","Fotoopgaver"],
 ["/ai-test-runner.html","Kvalitetstjek"]
];
nav.innerHTML=links.map(([href,label])=>`<a href="${href}" ${path===href?'aria-current="page"':''}>${label}</a>`).join("")+
 `<a href="#" id="caMoreTools">Alle værktøjer</a>`;
top.insertAdjacentElement("afterend",nav);

const guide=document.createElement("section");
guide.className="ca-page-guide";
guide.innerHTML=`
 <div>
  <div class="eyebrow">${cfg.eyebrow}</div>
  <h1>${cfg.title}</h1>
  <p>${cfg.description}</p>
  <div class="ca-next-step"><strong>Næste:</strong> ${cfg.next}</div>
 </div>
 <a class="ca-guide-cta" href="${cfg.href}">${cfg.cta} →</a>`;
nav.insertAdjacentElement("afterend",guide);

const status=document.createElement("section");
status.className="ca-status-strip";
status.innerHTML=`
 <div><span>Platformversion</span><strong id="caPlatformVersion">v2026.07.24.70</strong></div>
 <div><span>Senest udgivet indhold</span><strong id="caContentVersion">Indlæser…</strong></div>
 <div><span>Ikke udgivet arbejde</span><strong id="caWorkspaceState">Kontrollerer…</strong></div>
 <div><span>Seneste autosave</span><strong id="caLastSaved">–</strong></div>`;
guide.insertAdjacentElement("afterend",status);

const more=document.createElement("div");
more.className="ca-help-panel ca-hidden";
more.id="caToolsPanel";
more.innerHTML=`<h3>Alle arbejdsområder</h3>
 <p>Du behøver normalt ikke vælge selv. Mission Control sender dig til det rigtige sted.</p>
 <div class="ca-nav">
  <a href="/knowledge-review.html">Godkend forslag</a>
  <a href="/knowledge-architect.html">Struktur og oprydning</a>
  <a href="/brand-studio.html">Stil og tone</a>
  <a href="/asset-brief.html">Billedplan</a>
  <a href="/knowledge-debug.html">Teknisk hjælp</a>
 </div>`;
document.body.appendChild(more);
document.querySelector("#caMoreTools")?.addEventListener("click",e=>{e.preventDefault();more.classList.toggle("ca-hidden")});

const help=document.createElement("div");
help.className="ca-help";
help.innerHTML=`<button aria-label="Hjælp">?</button>`;
document.body.appendChild(help);
const helpPanel=document.createElement("div");
helpPanel.className="ca-help-panel ca-hidden";
helpPanel.innerHTML=`<h3>Hvad gør jeg her?</h3><p>${cfg.description}</p><p><strong>Anbefalet næste skridt:</strong> ${cfg.next}</p>`;
document.body.appendChild(helpPanel);
help.querySelector("button").onclick=()=>helpPanel.classList.toggle("ca-hidden");

function localJson(key,fallback){try{return JSON.parse(localStorage.getItem(key)||"null")||fallback}catch{return fallback}}
const changes=localJson("casaKnowledgeChanges",[]);
const website=localStorage.getItem("casaWebsiteContentDraft");
const brand=localStorage.getItem("casaBrandProfile");
const assets=localStorage.getItem("casaAssetLibrary");
const workspaceCount=changes.length+[website,brand,assets].filter(Boolean).length;
document.querySelector("#caWorkspaceState").textContent=workspaceCount?`${workspaceCount} ændringer`:"Alt udgivet";
const saved=localStorage.getItem("casaWorkspaceLastSaved");
document.querySelector("#caLastSaved").textContent=saved?new Date(saved).toLocaleString("da-DK"):"Ingen lokale ændringer";
fetch("/content-release.json",{cache:"no-store"}).then(r=>r.json()).then(data=>{
 document.querySelector("#caContentVersion").textContent=data.content_version||"Ukendt";
}).catch(()=>document.querySelector("#caContentVersion").textContent="Kunne ikke læses");
})();
