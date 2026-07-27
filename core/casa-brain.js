(function(){
 "use strict";
 const VERSION="1.0.0";
 const BASE="/platform/brain/";
 const FILES=["manifest","roadmap","architecture","backlog","decisions","release-history","principles","capabilities"];
 let cache=null;
 async function fetchJson(name){
  const response=await fetch(`${BASE}${name}.json?_brain=${Date.now()}`,{cache:"no-store"});
  if(!response.ok)throw new Error(`Project Brain: ${name} returned HTTP ${response.status}`);
  return response.json();
 }
 async function load(options={}){
  if(cache&&!options.force)return cache;
  const entries=await Promise.all(FILES.map(async name=>[name,await fetchJson(name)]));
  cache=Object.fromEntries(entries);
  window.CasaEvents?.publish?.("project-brain:ready",snapshot());
  window.dispatchEvent(new CustomEvent("casa:brain:ready",{detail:snapshot()}));
  return cache;
 }
 function snapshot(){
  const roadmap=cache?.roadmap||{};
  const backlog=cache?.backlog||{};
  const decisions=cache?.decisions||{};
  const releases=cache?.["release-history"]||{};
  return {
   version:VERSION,
   ready:Boolean(cache),
   current_release:cache?.manifest?.current_release||null,
   current_epic:roadmap.current_epic||null,
   current_subsystem:roadmap.current_subsystem||null,
   next_release:roadmap.next_release||null,
   backlog_items:(backlog.items||[]).length,
   architecture_decisions:(decisions.decisions||[]).length,
   release_count:(releases.releases||[]).length,
   capability_count:(cache?.capabilities?.capabilities||[]).length,
   files:FILES.map(name=>`${name}.json`)
  };
 }
 function area(name){return cache?.[name]||null;}
 function search(term){
  const query=String(term||"").trim().toLowerCase();
  if(!query||!cache)return [];
  const matches=[];
  for(const [areaName,value] of Object.entries(cache)){
   const text=JSON.stringify(value).toLowerCase();
   if(text.includes(query))matches.push({area:areaName,value});
  }
  return matches;
 }
 window.CasaBrain={version:VERSION,load,snapshot,area,search,get data(){return cache}};
 window.CasaCore?.modules?.register?.({id:"project-brain",version:VERSION,capabilities:["brain.load","brain.snapshot","brain.search","brain.roadmap"]});
 load().catch(error=>window.CasaEvents?.publish?.("project-brain:error",{message:error.message}));
})();
