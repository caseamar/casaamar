(function(){
 "use strict";
 const VERSION="1.0.0", CONFIG_URL="/registry/content-intelligence.json";
 let config=null;
 const clone=v=>JSON.parse(JSON.stringify(v));
 async function load(options={}){
  if(config&&!options.force)return snapshot();
  const [cfg]=await Promise.all([
   fetch(`${CONFIG_URL}?_ci=${Date.now()}`,{cache:"no-store"}).then(r=>{if(!r.ok)throw new Error(`Content Intelligence returned HTTP ${r.status}`);return r.json()}),
   window.CasaContentStudio?.load?.(options)
  ]);
  config=cfg;
  try{window.CasaEvents?.publish?.("content.intelligence.ready",snapshot())}catch(_e){}
  return snapshot();
 }
 function score(page){
  if(!config)throw new Error("Content Intelligence is not loaded");
  const required=["da","en","es"], w=config.weights, breakdown={};
  breakdown.publication=page.status==="published"?100:page.status==="ready"?85:page.status==="review"?65:40;
  breakdown.seo=((page.seo?.title?50:0)+(page.seo?.description?50:0));
  breakdown.languages=Math.round((required.filter(x=>(page.languages||[]).includes(x)).length/required.length)*100);
  breakdown.assets=page.hero_asset?100:60;
  breakdown.structure=Math.min(100,Math.round(((page.sections||0)/6)*80+((page.faq_count||0)>0?20:0)));
  breakdown.journey=(page.experience_stages||[]).length?100:40;
  const total=Math.round(Object.entries(w).reduce((n,[k,v])=>n+(breakdown[k]||0)*v/100,0));
  return {total,breakdown};
 }
 function findings(page){
  const out=[];
  for(const lang of ["en","es"])if(!(page.languages||[]).includes(lang))out.push({code:"add-translation",severity:"medium",title:`Mangler ${lang.toUpperCase()} version`,evidence:`Siden er kun tilgængelig på ${(page.languages||[]).map(x=>x.toUpperCase()).join(", ")}.`,target:lang});
  if(!page.seo?.description)out.push({code:"add-seo-description",severity:"high",title:"Mangler SEO-beskrivelse",evidence:"Sideregisteret markerer meta description som manglende."});
  if(!page.seo?.title)out.push({code:"add-seo-title",severity:"high",title:"Mangler SEO-titel",evidence:"Sideregisteret markerer SEO title som manglende."});
  if(!page.hero_asset&&["home","gallery","experiences"].includes(page.id))out.push({code:"add-hero",severity:"high",title:"Mangler hero-billede",evidence:"Denne sidetype kræver et hero-asset i content-reglerne."});
  if((page.faq_count||0)===0&&["home","practical","concierge","faq"].includes(page.id))out.push({code:"add-faq",severity:"low",title:"FAQ kan styrke siden",evidence:"Siden har ingen FAQ-punkter, selv om brugerrejsen typisk skaber spørgsmål."});
  if((page.sections||0)<4)out.push({code:"expand-content",severity:"medium",title:"Siden er meget kort",evidence:`Siden har ${page.sections||0} sektioner.`});
  if(!out.length&&page.status!=="published")out.push({code:"review-ready",severity:"low",title:"Gennemgå publiceringsklarhed",evidence:`Indholdskvaliteten er høj, men status er ${page.status}.`});
  return out;
 }
 function confidence(page,finding){
  let value=.82;
  if(["add-seo-description","add-seo-title","add-translation"].includes(finding.code))value=.98;
  if(finding.code==="add-hero")value=.94;
  if(finding.code==="add-faq")value=.78;
  return {value,basis:["Strukturerede felter i content registry","Deterministiske kvalitetsregler",`Side opdateret ${page.updated_at||"ukendt"}`]};
 }
 function impact(f){
  const map={
   "add-translation":["International brugeroplevelse","AI-svar","SEO"],
   "add-seo-description":["SEO","Klikrate fra søgeresultater"],
   "add-seo-title":["SEO","Søgerelevans"],
   "add-hero":["Førstehåndsindtryk","Engagement"],
   "add-faq":["AI-dækning","Selvbetjening"],
   "expand-content":["Informationsdækning","Brugerrejse"],
   "review-ready":["Releasekvalitet"]
  }; return map[f.code]||["Content quality"];
 }
 function actionFor(page,finding){
  const meta=config.action_catalog[finding.code], conf=confidence(page,finding);
  return {id:`content:${page.id}:${finding.code}${finding.target?':'+finding.target:''}`,type:finding.code,title:finding.title,label:meta.label,evidence:[finding.evidence],confidence:conf.value,confidenceBasis:conf.basis,expectedValue:meta.expected_value,effortMinutes:meta.effort_minutes,risk:meta.risk,affectedAreas:impact(finding),owner:"content-owner",approvalRequired:true,status:"suggested",nextStep:"Forbered et forslag og gennemgå forskellen før godkendelse."};
 }
 function analyze(id){
  const page=window.CasaContentStudio?.get?.(id); if(!page)return null;
  const s=score(page), fs=findings(page), actions=fs.map(f=>actionFor(page,f));
  return {...page,intelligence:{score:s.total,breakdown:s.breakdown,findings:fs,actions,nextBestAction:actions[0]||null,publicationReady:s.total>=90&&page.status!=="draft"}};
 }
 function list(){return (window.CasaContentStudio?.list?.()||[]).map(x=>analyze(x.id));}
 function proposal(actionId){
  const pageId=String(actionId).split(":")[1], analysis=analyze(pageId); if(!analysis)throw new Error("Ukendt side");
  const a=analysis.intelligence.actions.find(x=>x.id===actionId); if(!a)throw new Error("Ukendt action");
  const before={status:analysis.status,languages:analysis.languages,seo:analysis.seo,hero_asset:analysis.hero_asset,sections:analysis.sections,faq_count:analysis.faq_count};
  const after=clone(before); let summary="";
  if(a.type==="add-translation"){const lang=actionId.split(":").pop();after.languages=[...new Set([...after.languages,lang])];summary=`Forbered en ${lang.toUpperCase()}-version uden at publicere den.`;}
  if(a.type==="add-seo-description"){after.seo={...after.seo,description:"AI-udkast klar til menneskelig gennemgang"};summary="Forbered et meta description-udkast baseret på sidens verificerede indhold.";}
  if(a.type==="add-seo-title"){after.seo={...after.seo,title:"AI-udkast klar til menneskelig gennemgang"};summary="Forbered et SEO title-udkast.";}
  if(a.type==="add-hero"){after.hero_asset="Forslag vælges i Asset Studio";summary="Åbn Asset Studio med kravene til hero-billedet.";}
  if(a.type==="add-faq"){after.faq_count=Math.max(3,after.faq_count||0);summary="Forbered tre FAQ-forslag ud fra kendt content og brugerrejse.";}
  if(a.type==="expand-content"){after.sections=Math.max(4,after.sections||0);summary="Forbered en ekstra indholdssektion til review.";}
  if(a.type==="review-ready"){after.status="review";summary="Opret en afgrænset publiceringsreview-opgave.";}
  return {action:a,page:{id:analysis.id,name:analysis.display_name},summary,before,after,execution:"proposal-only",requiresApproval:true,published:false};
 }
 function snapshot(){const items=config?list():[];return{version:VERSION,ready:Boolean(config),pages:items.length,averageScore:items.length?Math.round(items.reduce((n,x)=>n+x.intelligence.score,0)/items.length):0,opportunities:items.reduce((n,x)=>n+x.intelligence.actions.length,0),publicationReady:items.filter(x=>x.intelligence.publicationReady).length,principles:clone(config?.principles||{})};}
 window.CasaContentIntelligence={version:VERSION,load,list,analyze,proposal,snapshot,get config(){return clone(config)}};
 window.CasaCore?.modules?.register?.({id:"content-intelligence",version:VERSION,capabilities:["content.analysis","content.next-best-action","content.diff-preview","content.publication-readiness"]});
})();
