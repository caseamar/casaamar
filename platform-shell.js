
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


const workflow=document.createElement("section");
workflow.className="ca-workflow";
workflow.id="caWorkflow";
workflow.innerHTML=`
 <div class="ca-workflow-head">
  <div><strong id="caWorkflowTitle">Sådan bliver en ændring gennemført</strong><span id="caWorkflowHelp">AI arbejder først. Du læser og retter resultatet. Du godkender. Til sidst gør du ændringerne live.</span></div>
  <span class="ca-pill" id="caWorkflowState">Trin 1 af 4</span>
 </div>
 <div class="ca-workflow-steps">
  <div class="ca-workflow-step active" data-ca-step="1"><i>1</i>AI arbejder</div>
  <div class="ca-workflow-step" data-ca-step="2"><i>2</i>Du læser og retter</div>
  <div class="ca-workflow-step" data-ca-step="3"><i>3</i>Du godkender</div>
  <div class="ca-workflow-step" data-ca-step="4"><i>4</i>Gør ændringerne live</div>
 </div>`;
guide.insertAdjacentElement("afterend",workflow);

window.CasaWorkflow={
 set(step,title,help){
  const safe=Math.max(1,Math.min(4,Number(step)||1));
  document.querySelectorAll("[data-ca-step]").forEach(el=>{
   const n=Number(el.dataset.caStep);
   el.classList.toggle("done",n<safe);
   el.classList.toggle("active",n===safe);
  });
  const state=document.querySelector("#caWorkflowState");
  if(state)state.textContent=`Trin ${safe} af 4`;
  if(title)document.querySelector("#caWorkflowTitle").textContent=title;
  if(help)document.querySelector("#caWorkflowHelp").textContent=help;
  localStorage.setItem("casaWorkflowState",JSON.stringify({path:location.pathname,step:safe,title,help,updated_at:new Date().toISOString()}));
 },
 coach({title,text,href,label,id="caInlineCoach"}){
  document.querySelector("#"+id)?.remove();
  const box=document.createElement("section");box.className="ca-coach";box.id=id;
  box.innerHTML=`<div class="ca-coach-icon">→</div><div><strong>${title}</strong><p>${text}</p></div>${href?`<a href="${href}">${label||"Fortsæt"} →</a>`:""}`;
  const target=document.querySelector("#caWorkflow");
  target?.insertAdjacentElement("afterend",box);
  return box;
 }
};

const status=document.createElement("section");
status.className="ca-status-strip";
status.innerHTML=`
 <div><span>Platformversion</span><strong id="caPlatformVersion">v2026.07.24.72</strong></div>
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
const approvedWebsite=localStorage.getItem("casaWebsiteApprovedAt");
const approvedKnowledge=localStorage.getItem("casaKnowledgeApprovedAt");
if(path==="/knowledge-center.html"){
 const hasWork=workspaceCount>0;
 window.CasaWorkflow.set(hasWork?4:1,
  hasWork?"Dit arbejde er klar til sidste trin":"AI finder din vigtigste opgave",
  hasWork?"Du har autosavede ændringer. Gå til udgivelse, kontrollér indholdet i pakken, og gør ændringerne live.":"Start den opgave, AI anbefaler. Platformen guider dig videre bagefter.");
}else if(path==="/page-studio.html"){
 window.CasaWorkflow.set(approvedWebsite?4:1,
  approvedWebsite?"Hjemmesideændringerne er godkendt":"Lad AI hjælpe med hjemmesiden",
  approvedWebsite?"Du er færdig her. Gå nu til udgivelse og gør dine godkendte ændringer live.":"Start AI. Når AI er færdig, læser og retter du direkte på siden, før du godkender.");
}else if(path==="/knowledge-review.html"){
 window.CasaWorkflow.set(2,"Læs og ret AI's forslag","Tag stilling til teksten direkte. Godkend, når du er tilfreds, eller afvis forslaget.");
}else if(path==="/ai-test-runner.html"){
 window.CasaWorkflow.set(3,"Kontrollér det godkendte arbejde","Kør kun relevante tests. Når de er bestået, går du videre til udgivelse.");
}else{
 window.CasaWorkflow.set(1,"AI hjælper dig med opgaven","Brug den primære handling på siden. AI viser resultat, status og det næste du skal gøre.");
}

fetch("/content-release.json",{cache:"no-store"}).then(r=>r.json()).then(data=>{
 document.querySelector("#caContentVersion").textContent=data.content_version||"Ukendt";
}).catch(()=>document.querySelector("#caContentVersion").textContent="Kunne ikke læses");
})();
