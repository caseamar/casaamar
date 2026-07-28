(function(){
 "use strict";
 const VERSION="1.1.0";
 const URL="/registry/content-pages.json";
 let cache=null;
 const clone=value=>JSON.parse(JSON.stringify(value));
 async function load(options={}){
  if(cache&&!options.force)return cache;
  const response=await fetch(`${URL}?_content_studio=${Date.now()}`,{cache:"no-store"});
  if(!response.ok)throw new Error(`Content Studio returned HTTP ${response.status}`);
  cache=await response.json();
  const validation=validate();
  window.CasaEvents?.publish?.("content-studio:ready",{...snapshot(),validation});
  window.dispatchEvent(new CustomEvent("casa:content-studio:ready",{detail:{...snapshot(),validation}}));
  return cache;
 }
 function health(page){
  const rules=cache?.health_rules||{}, issues=[];
  if((rules.hero_required_for||[]).includes(page.id)&&!page.hero_asset)issues.push({code:"missing-hero",label:"Mangler hero-billede",severity:"high"});
  for(const lang of rules.required_languages||[])if(!(page.languages||[]).includes(lang))issues.push({code:`missing-${lang}`,label:`Mangler ${lang.toUpperCase()} oversættelse`,severity:"medium"});
  if(rules.seo_title_required&&!page.seo?.title)issues.push({code:"missing-seo-title",label:"Mangler SEO-titel",severity:"high"});
  if(rules.seo_description_required&&!page.seo?.description)issues.push({code:"missing-seo-description",label:"Mangler SEO-beskrivelse",severity:"medium"});
  if((page.sections||0)<(rules.minimum_sections||0))issues.push({code:"short-page",label:"For få indholdssektioner",severity:"medium"});
  if((rules.faq_recommended_for||[]).includes(page.id)&&(page.faq_count||0)===0)issues.push({code:"missing-faq",label:"FAQ anbefales",severity:"low"});
  const penalty=issues.reduce((sum,item)=>sum+(item.severity==="high"?20:item.severity==="medium"?10:5),0);
  return {score:Math.max(0,100-penalty),level:penalty===0?"ready":penalty<=30?"review":"blocked",issues};
 }
 function list(filter={}){return (cache?.pages||[]).filter(page=>(!filter.status||page.status===filter.status)&&(!filter.language||(page.languages||[]).includes(filter.language))).map(page=>({...clone(page),health:health(page)}));}
 function get(id){const page=(cache?.pages||[]).find(page=>page.id===id);return page?{...clone(page),health:health(page)}:null;}
 function suggestions(id){const item=get(id);if(!item)return[];return item.health.issues.map(issue=>({id:`${id}:${issue.code}`,page_id:id,title:issue.label,priority:issue.severity,action:issue.code.startsWith("missing-")?"Review and complete":"Review"}));}
 function validate(){const errors=[],ids=new Set(),routes=new Set(),validStatuses=new Set(cache?.statuses||[]);for(const page of cache?.pages||[]){if(!page.id||!page.display_name||!page.route||!page.status)errors.push({page:page.id||"unknown",code:"incomplete"});if(ids.has(page.id))errors.push({page:page.id,code:"duplicate-id"});ids.add(page.id);if(routes.has(page.route))errors.push({page:page.id,code:"duplicate-route"});routes.add(page.route);if(!validStatuses.has(page.status))errors.push({page:page.id,code:"invalid-status"});}return{consistent:errors.length===0,errors,page_count:ids.size};}
 function snapshot(){const items=list();return{version:VERSION,ready:Boolean(cache),page_count:items.length,ready_count:items.filter(x=>x.health.level==="ready").length,review_count:items.filter(x=>x.health.level==="review").length,blocked_count:items.filter(x=>x.health.level==="blocked").length,issue_count:items.reduce((n,x)=>n+x.health.issues.length,0)};}
 window.CasaContentStudio={version:VERSION,load,list,get,health,suggestions,validate,snapshot,get data(){return cache}};
 window.CasaCore?.modules?.register?.({id:"content-studio",version:VERSION,capabilities:["content.pages","content.health","content.suggestions","content.validate"]});
 load().catch(error=>window.CasaEvents?.publish?.("content-studio:error",{message:error.message}));
})();
