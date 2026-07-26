
(()=>{
 const listeners=new Set();
 const state={ready:false,platform:null,content:null,release:null,error:null};

 function formatDateTime(value){
  if(!value)return "Ikke registreret";
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return String(value);
  return new Intl.DateTimeFormat("da-DK",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit",timeZone:"Europe/Copenhagen"}).format(date).replace(" kl. "," · kl. ");
 }
 async function fetchJson(path){
  const response=await fetch(`${path}${path.includes("?")?"&":"?"}_=${Date.now()}`,{cache:"no-store",headers:{"cache-control":"no-cache"}});
  if(!response.ok)throw new Error(`${path}: HTTP ${response.status}`);
  return response.json();
 }
 function localRelease(){
  try{return JSON.parse(localStorage.getItem("casaReleaseSessionV2")||"null")}catch{return null}
 }
 function liveAt(){
  const s=state.release,c=state.content||{};
  return s?.state==="live"&&s?.live_at?s.live_at:
   localStorage.getItem("casaLastConfirmedLiveAt")||c.verified_live_at||c.live_at||c.published_at||null;
 }
 function apply(){
  const p=state.platform||{},c=state.content||{};
  document.querySelectorAll("[data-platform-version],#caPlatformVersion").forEach(el=>el.textContent=p.platform_version||"Ukendt");
  document.querySelectorAll("[data-platform-build]").forEach(el=>{el.textContent=formatDateTime(p.build);if(el.tagName==="TIME"&&p.build)el.setAttribute("datetime",p.build)});
  document.querySelectorAll("[data-worker-version]").forEach(el=>el.textContent=p.worker_version||"Ukendt");
  document.querySelectorAll("[data-platform-live-at],#caPlatformLiveAt,#mcPlatformLiveAt").forEach(el=>el.textContent=formatDateTime(liveAt()));
  document.querySelectorAll("[data-content-version],#caContentVersion").forEach(el=>el.textContent=c.content_version||"Ukendt");
  document.documentElement.dataset.platformVersion=p.platform_version||"";
  window.CASA_PLATFORM_MANIFEST=p;
 }
 function emit(){
  listeners.forEach(fn=>{try{fn({...state})}catch(e){console.error(e)}});
  window.dispatchEvent(new CustomEvent("casa:runtime-updated",{detail:{...state}}));
 }
 async function refresh(){
  try{
   const [platform,content]=await Promise.all([fetchJson("/platform-manifest.json"),fetchJson("/content-release.json").catch(()=>({}))]);
   state.platform=platform;state.content=content;state.release=localRelease();state.ready=true;state.error=null;
   apply();emit();return {...state};
  }catch(error){state.error=String(error?.message||error);state.ready=true;emit();return {...state}}
 }
 function subscribe(fn){listeners.add(fn);if(state.ready)fn({...state});return()=>listeners.delete(fn)}
 const api={get state(){return {...state}},refresh,subscribe,formatDateTime,applyToDom:apply,getPlatform:()=>state.platform,getContent:()=>state.content,getRelease:()=>state.release,getLiveAt:liveAt};
 window.CasaRuntimeState=api;
 window.CasaRuntimeReady=new Promise(resolve=>{
  const run=()=>refresh().then(resolve);
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",run,{once:true});else run();
 });
 window.addEventListener("storage",e=>{if(["casaReleaseSessionV2","casaLastConfirmedLiveAt"].includes(e.key))refresh()});
})();
