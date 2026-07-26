
(()=>{

function casaFormatDateTime(value){return window.CasaRuntimeState?.formatDateTime(value)||String(value||"Ikke registreret")}
async function fetchPlatformManifest(){await window.CasaRuntimeState.refresh();return window.CasaRuntimeState.getPlatform()}
function removeSupervisorBanner(){document.querySelector("#caSupervisorBanner")?.remove()}
function showUpdateAvailable(manifest){
 let banner=document.querySelector("#caSupervisorBanner");
 if(!banner){banner=document.createElement("aside");banner.id="caSupervisorBanner";banner.style.cssText="position:fixed;left:50%;top:16px;transform:translateX(-50%);z-index:1500;width:min(640px,calc(100vw - 28px));background:#17352b;color:white;border-radius:16px;padding:14px 16px;box-shadow:0 20px 55px rgba(20,35,30,.28);font-family:Inter,system-ui,sans-serif";document.body.appendChild(banner)}
 banner.innerHTML=`<div style="display:flex;align-items:center;justify-content:space-between;gap:14px"><div><strong style="display:block;font-size:.85rem">En ny platformversion er klar</strong><span style="display:block;margin-top:3px;color:rgba(255,255,255,.72);font-size:.72rem">Version ${manifest.platform_version}. Dit autosavede arbejde bevares.</span></div><button id="caSupervisorUpdateButton" style="border:0;border-radius:11px;padding:10px 13px;background:#e66542;color:white;font-weight:850;white-space:nowrap;cursor:pointer">Opdater platformen</button></div>`;
 banner.querySelector("#caSupervisorUpdateButton").onclick=()=>{banner.querySelector("#caSupervisorUpdateButton").textContent="Opdaterer…";location.reload()};
}
function showPausedSupervisor(){
 if(document.querySelector("#caSupervisorPause"))return;
 const panel=document.createElement("aside");panel.id="caSupervisorPause";panel.style.cssText="position:fixed;right:20px;bottom:20px;z-index:1300;width:min(380px,calc(100vw - 40px));background:white;border:1px solid #e4e2dc;border-radius:16px;padding:15px;box-shadow:0 18px 45px rgba(20,35,30,.18);font-family:Inter,system-ui,sans-serif";
 panel.innerHTML=`<strong style="display:block;color:#14231e;font-size:.82rem">Automatiske kontroller er sat på pause</strong><p style="margin:5px 0 11px;color:#66736e;font-size:.72rem;line-height:1.5">Der har ikke været aktivitet i 15 minutter. Dit arbejde er gemt, og platformen sender ikke flere versionsforespørgsler.</p><button id="caSupervisorResume" style="border:0;border-radius:10px;padding:9px 12px;background:#e66542;color:white;font-weight:850;cursor:pointer">Jeg er aktiv igen</button>`;
 document.body.appendChild(panel);panel.querySelector("#caSupervisorResume").onclick=resumeSupervisor;
}
async function checkForPlatformUpdate(){
 if(casaSupervisorPaused||document.visibilityState!=="visible")return;
 try{const manifest=await fetchPlatformManifest();if(!casaInstalledVersion)casaInstalledVersion=document.documentElement.dataset.platformVersion||window.CASA_PLATFORM_MANIFEST?.platform_version||manifest.platform_version;if(manifest.platform_version===casaInstalledVersion)removeSupervisorBanner();else showUpdateAvailable(manifest)}catch(error){console.warn("Platform Supervisor kunne ikke kontrollere versionen",error)}
}
function stopSupervisor(){if(casaSupervisorTimer)clearInterval(casaSupervisorTimer);casaSupervisorTimer=null}
function startSupervisor(){stopSupervisor();if(casaSupervisorPaused||document.visibilityState!=="visible")return;casaSupervisorTimer=setInterval(()=>{if(Date.now()-casaSupervisorLastActivity>=CASA_SUPERVISOR_IDLE_MS){casaSupervisorPaused=true;stopSupervisor();showPausedSupervisor();return}checkForPlatformUpdate()},CASA_SUPERVISOR_INTERVAL_MS)}
async function resumeSupervisor(){casaSupervisorPaused=false;casaSupervisorLastActivity=Date.now();document.querySelector("#caSupervisorPause")?.remove();await checkForPlatformUpdate();startSupervisor()}
function registerSupervisorActivity(){casaSupervisorLastActivity=Date.now()}
["pointerdown","keydown","input","change","wheel","touchstart"].forEach(n=>document.addEventListener(n,registerSupervisorActivity,{passive:true,capture:true}));
async function loadPlatformManifest(){await window.CasaRuntimeReady;window.CasaRuntimeState?.applyToDom();return window.CasaRuntimeState?.getPlatform()||null};
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
 <div class="ca-platform-status"><span>Platformstatus</span><strong id="caPlatformVersion">Indlæser…</strong><small>Bygget <b data-platform-build>Indlæser…</b></small><small>Live siden <b id="caPlatformLiveAt">Kontrollerer…</b></small></div>
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

window.CasaRuntimeReady.then(()=>{
 const runtime=window.CasaRuntimeState;
 document.querySelector("#caContentVersion").textContent=runtime?.getContent()?.content_version||"Ukendt";
 const liveEl=document.querySelector("#caPlatformLiveAt");if(liveEl)liveEl.textContent=runtime?.formatDateTime(runtime?.getLiveAt());
});
})();
