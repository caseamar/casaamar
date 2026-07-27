
(()=>{

function casaFormatDateTime(value){
 if(!value)return "Ikke registreret";
 const date=new Date(value);
 if(Number.isNaN(date.getTime()))return String(value);
 return new Intl.DateTimeFormat("da-DK",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit",timeZone:"Europe/Copenhagen"}).format(date).replace(" kl. "," · kl. ");
}
function casaLatestLiveAt(){
 try{const s=JSON.parse(localStorage.getItem("casaReleaseSessionV2")||"null");if(s?.state==="live"&&s?.live_at)return s.live_at}catch{}
 return localStorage.getItem("casaLastConfirmedLiveAt");
}


const CASA_SUPERVISOR_INTERVAL_MS=60*1000;
const CASA_SUPERVISOR_IDLE_MS=15*60*1000;
let casaSupervisorTimer=null,casaSupervisorLastActivity=Date.now(),casaSupervisorPaused=false,casaInstalledVersion=null;

/* Canonical workspace state v1 */
const CASA_WORKSPACE_STATE_KEY="casaWorkspaceStateV1";
const CASA_WORKSPACE_BACKUP_KEY="casaLegacyWorkspaceBackupV101";
const CASA_WORKSPACE_MIGRATION_KEY="casaWorkspaceMigrationV101";
const CASA_WORKSPACE_KEYS=[
 "casaKnowledgeChanges","casaKnowledgeWorkspaceChanges","casaWebsiteContentDraft",
 "casaBrandProfile","casaAssetLibrary","casaRelationRegistry","casaPhotoMissions"
];
const casaNativeSetItem=Storage.prototype.setItem;
const casaNativeRemoveItem=Storage.prototype.removeItem;
function casaSafeJson(value,fallback=null){try{return JSON.parse(value)??fallback}catch{return fallback}}
function casaWorkspaceRawCount(){
 const a=casaSafeJson(localStorage.getItem("casaKnowledgeChanges"),[]);
 const b=casaSafeJson(localStorage.getItem("casaKnowledgeWorkspaceChanges"),[]);
 return (Array.isArray(a)?a.length:0)+(Array.isArray(b)?b.length:0)+
  CASA_WORKSPACE_KEYS.slice(2).filter(key=>localStorage.getItem(key)!==null).length;
}
function casaReleaseState(){return casaSafeJson(localStorage.getItem("casaReleaseSessionV2"),null)}
function casaDeriveWorkspaceState(){
 const release=casaReleaseState(),count=casaWorkspaceRawCount();
 let status="idle";
 if(release?.active===true)status="releasing";
 else if(count>0)status="draft";
 else if(release?.state==="live")status="live";
 const previous=casaSafeJson(localStorage.getItem(CASA_WORKSPACE_STATE_KEY),{});
 const state={schema_version:"1.0",status,count,updated_at:new Date().toISOString(),
  last_live_at:release?.live_at||previous.last_live_at||localStorage.getItem("casaLastConfirmedLiveAt")||null,
  active_release_id:release?.active===true?release.release_id||null:null};
 casaNativeSetItem.call(localStorage,CASA_WORKSPACE_STATE_KEY,JSON.stringify(state));
 window.dispatchEvent(new CustomEvent("casa:workspace-state",{detail:state}));
 return state;
}
function casaMigrateLegacyWorkspace(){
 if(localStorage.getItem(CASA_WORKSPACE_MIGRATION_KEY))return;
 const release=casaReleaseState();
 if(release?.active===true){
  casaNativeSetItem.call(localStorage,CASA_WORKSPACE_MIGRATION_KEY,JSON.stringify({migrated_at:new Date().toISOString(),action:"deferred_active_release"}));
  casaDeriveWorkspaceState();return;
 }
 const backup={created_at:new Date().toISOString(),platform_version:"v2026.07.24.124",items:{}};
 CASA_WORKSPACE_KEYS.forEach(key=>{const value=localStorage.getItem(key);if(value!==null)backup.items[key]=value});
 if(Object.keys(backup.items).length){
  casaNativeSetItem.call(localStorage,CASA_WORKSPACE_BACKUP_KEY,JSON.stringify(backup));
  CASA_WORKSPACE_KEYS.forEach(key=>casaNativeRemoveItem.call(localStorage,key));
 }
 casaNativeSetItem.call(localStorage,CASA_WORKSPACE_MIGRATION_KEY,JSON.stringify({
  migrated_at:new Date().toISOString(),
  action:Object.keys(backup.items).length?"legacy_state_archived":"nothing_to_archive",
  archived_keys:Object.keys(backup.items)
 }));
 casaDeriveWorkspaceState();
}
Storage.prototype.setItem=function(key,value){
 casaNativeSetItem.call(this,key,value);
 if(this===localStorage&&(CASA_WORKSPACE_KEYS.includes(key)||key==="casaReleaseSessionV2"))queueMicrotask(casaDeriveWorkspaceState);
};
Storage.prototype.removeItem=function(key){
 casaNativeRemoveItem.call(this,key);
 if(this===localStorage&&(CASA_WORKSPACE_KEYS.includes(key)||key==="casaReleaseSessionV2"))queueMicrotask(casaDeriveWorkspaceState);
};
window.CasaWorkspace={
 getState(){return casaSafeJson(localStorage.getItem(CASA_WORKSPACE_STATE_KEY),null)||casaDeriveWorkspaceState()},
 getCount(){return this.getState().count||0},
 refresh:casaDeriveWorkspaceState,
 hasArchivedLegacyState(){return localStorage.getItem(CASA_WORKSPACE_BACKUP_KEY)!==null},
 restoreArchivedLegacyState(){
  const backup=casaSafeJson(localStorage.getItem(CASA_WORKSPACE_BACKUP_KEY),null);
  if(!backup?.items)return false;
  Object.entries(backup.items).forEach(([key,value])=>casaNativeSetItem.call(localStorage,key,value));
  casaNativeRemoveItem.call(localStorage,CASA_WORKSPACE_BACKUP_KEY);
  casaDeriveWorkspaceState();return true;
 }
};
casaMigrateLegacyWorkspace();

function applyPlatformManifest(manifest){
 const version=manifest?.platform_version||"Ukendt",build=manifest?.build||"Ukendt",worker=manifest?.worker_version||"Ukendt";
 document.querySelectorAll("[data-platform-version],#caPlatformVersion").forEach(el=>el.textContent=version);
 document.querySelectorAll("[data-platform-build]").forEach(el=>el.textContent=casaFormatDateTime(build));
 document.querySelectorAll("[data-worker-version]").forEach(el=>el.textContent=worker);
 document.documentElement.dataset.platformVersion=version;
 document.documentElement.dataset.platformBuild=build;
 document.documentElement.dataset.workerVersion=worker;
 window.CASA_PLATFORM_MANIFEST=manifest;
 const confirmationKey=`casaPlatformConfirmedAt:${version}`;
 const confirmedAt=localStorage.getItem(confirmationKey);
 document.querySelectorAll("[data-platform-confirmed-at]").forEach(el=>el.textContent=casaFormatDateTime(confirmedAt));
}
async function fetchPlatformManifest(){
 const response=await fetch(`/platform-manifest.json?v=20260724.124&_=${Date.now()}`,{cache:"no-store",headers:{"cache-control":"no-cache"}});
 if(!response.ok)throw new Error(`HTTP ${response.status}`);return response.json();
}

function showPlatformConsistencyWarning(manifest,meta){
 let panel=document.querySelector("#caPlatformConsistencyWarning");
 if(!panel){
  panel=document.createElement("aside");
  panel.id="caPlatformConsistencyWarning";
  panel.style.cssText="position:fixed;left:50%;top:16px;transform:translateX(-50%);z-index:1700;width:min(720px,calc(100vw - 28px));background:#8a2f20;color:white;border-radius:16px;padding:14px 16px;box-shadow:0 20px 55px rgba(20,35,30,.28);font-family:Inter,system-ui,sans-serif";
  document.body.appendChild(panel);
 }
 panel.innerHTML=`<strong style="display:block">Platformen er ikke færdig med at synkronisere</strong>
 <span style="display:block;margin-top:4px;font-size:.73rem;line-height:1.45">
 Hjemmesiden og kontrolcentret viser endnu ikke samme release. Manifest: ${manifest?.platform_version||"ukendt"} · Worker: ${meta?.platform_version||"ukendt"}.
 Vent på den grønne Cloudflare-deployment og genindlæs derefter siden.
 </span>`;
}
function removePlatformConsistencyWarning(){
 document.querySelector("#caPlatformConsistencyWarning")?.remove();
}

function removeSupervisorBanner(){document.querySelector("#caSupervisorBanner")?.remove()}
function showUpdateAvailable(manifest){
 let banner=document.querySelector("#caSupervisorBanner");
 if(!banner){banner=document.createElement("aside");banner.id="caSupervisorBanner";banner.style.cssText="position:fixed;left:50%;top:16px;transform:translateX(-50%);z-index:1500;width:min(640px,calc(100vw - 28px));background:#17352b;color:white;border-radius:16px;padding:14px 16px;box-shadow:0 20px 55px rgba(20,35,30,.28);font-family:Inter,system-ui,sans-serif";document.body.appendChild(banner)}
 banner.innerHTML=`<div style="display:flex;align-items:center;justify-content:space-between;gap:14px"><div><strong style="display:block;font-size:.85rem">En ny platformversion er klar</strong><span style="display:block;margin-top:3px;color:rgba(255,255,255,.72);font-size:.72rem">Version ${manifest.platform_version}. Dit autosavede arbejde bevares.</span></div><button id="caSupervisorUpdateButton" style="border:0;border-radius:11px;padding:10px 13px;background:#e66542;color:white;font-weight:850;white-space:nowrap;cursor:pointer">Opdater platformen</button></div>`;
 banner.querySelector("#caSupervisorUpdateButton").onclick=()=>{
  const button=banner.querySelector("#caSupervisorUpdateButton");
  button.textContent="Opdaterer…";
  button.disabled=true;
  const isControlRoute=location.pathname==="/control/"||location.pathname==="/control"||/^\/mission-control-v\d+\.html$/.test(location.pathname)||["/knowledge-center","/knowledge-center.html"].includes(location.pathname);
  const target=new URL(isControlRoute?"/control/":location.pathname,location.origin);
  target.hash=location.hash;
  target.searchParams.set("_refresh",Date.now().toString());
  location.replace(target.toString());
 };
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
function canonicalizeReleaseUrl(manifest){
 const url=new URL(location.href);
 let changed=false;
 ["v","_platform_release","_refresh"].forEach(key=>{if(url.searchParams.has(key)){url.searchParams.delete(key);changed=true;}});
 const canonical=manifest?.canonical_mission_control_path||"/control/";
 if(location.pathname==="/control"||/^\/mission-control-v\d+\.html$/.test(location.pathname)||["/knowledge-center","/knowledge-center.html"].includes(location.pathname)){url.pathname=canonical;changed=true;}
 if(changed)history.replaceState(history.state,"",url.pathname+(url.search?url.search:"")+url.hash);
}

async function fetchPlatformIdentityPair(){
 const [manifest,metaResponse]=await Promise.all([
  fetchPlatformManifest(),
  fetch(`/api/platform-meta?v=20260724.124&_=${Date.now()}`,{cache:"no-store",headers:{"cache-control":"no-cache"}})
 ]);
 const meta=metaResponse.ok?await metaResponse.json():null;
 return {manifest,meta,consistent:Boolean(meta&&manifest.platform_version===meta.platform_version&&manifest.worker_version===meta.worker_version)};
}
function wait(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
async function loadPlatformManifest(){
 const retryDelays=[0,800,1600,3200];
 let latest=null;
 try{
  // URL cleanup is independent of release identity and must never be blocked by a transient mismatch.
  canonicalizeReleaseUrl({canonical_mission_control_path:"/control/"});
  for(const delay of retryDelays){
   if(delay)await wait(delay);
   latest=await fetchPlatformIdentityPair();
   if(latest.consistent)break;
  }
  const {manifest,meta,consistent}=latest||{};
  if(!consistent){
   showPlatformConsistencyWarning(manifest,meta);
   throw new Error("Platformfilerne er ikke synkroniserede efter readiness retries.");
  }
  removePlatformConsistencyWarning();
  casaInstalledVersion=manifest.platform_version||null;
  const confirmationKey=`casaPlatformConfirmedAt:${manifest.platform_version}`;
  if(!localStorage.getItem(confirmationKey))localStorage.setItem(confirmationKey,new Date().toISOString());
  applyPlatformManifest(manifest);
  canonicalizeReleaseUrl(manifest);
  const canonical=manifest.canonical_mission_control_path||"/control/";
  if((/^\/mission-control-v\d+\.html$/.test(location.pathname)||["/knowledge-center","/knowledge-center.html"].includes(location.pathname))&&location.pathname!==canonical)location.replace(canonical+location.hash);
  return manifest;
 }catch(error){
  console.error("Platformstatus kunne ikke synkroniseres",error);
  return null;
 }
}
window.CasaPlatformManifestPromise=new Promise(resolve=>{const initial=()=>loadPlatformManifest().then(result=>{startSupervisor();resolve(result)});if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initial,{once:true});else initial()});
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden")stopSupervisor();else if(!casaSupervisorPaused){casaSupervisorLastActivity=Date.now();checkForPlatformUpdate();startSupervisor()}});
window.addEventListener("focus",()=>{if(!casaSupervisorPaused){casaSupervisorLastActivity=Date.now();checkForPlatformUpdate();startSupervisor()}});


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

fetch(`/content-release.json?v=20260724.124&_=${Date.now()}`,{cache:"no-store"}).then(r=>r.json()).then(data=>{
 document.querySelector("#caContentVersion").textContent=data.content_version||"Ukendt";
 const liveValue=casaLatestLiveAt()||data.verified_live_at||data.live_at||data.published_at;
 const liveEl=document.querySelector("#caPlatformLiveAt");if(liveEl)liveEl.textContent=casaFormatDateTime(liveValue);
}).catch(()=>{document.querySelector("#caContentVersion").textContent="Kunne ikke læses";const liveEl=document.querySelector("#caPlatformLiveAt");if(liveEl)liveEl.textContent=casaFormatDateTime(casaLatestLiveAt())});
})();
