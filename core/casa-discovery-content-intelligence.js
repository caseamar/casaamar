/** Generic Discovery Content Intelligence workspace service. */
(() => {
  'use strict';
  const VERSION='1.0.0';
  const DRAFT_KEY='casa.discovery-content-intelligence.draft.v1';
  const clone=value=>JSON.parse(JSON.stringify(value));
  const load=()=>{try{return JSON.parse(localStorage.getItem(DRAFT_KEY)||'{}')}catch{return{}}};
  const save=draft=>localStorage.setItem(DRAFT_KEY,JSON.stringify(draft||{}));
  const validate=asset=>{
    const issues=[];
    if(!asset?.id)issues.push('missing-id');
    if(!asset?.title)issues.push('missing-title');
    if(!asset?.primaryIntents?.length)issues.push('missing-primary-intents');
    if(asset?.role==='dining'&&!asset?.mealMoments?.length)issues.push('dining-asset-without-meal-moments');
    for(const [intent,weight] of Object.entries(asset?.intentWeights||{}))if(!Number.isFinite(Number(weight))||Number(weight)<0||Number(weight)>100)issues.push(`invalid-weight:${intent}`);
    return issues;
  };
  const suggest=asset=>{
    const text=`${asset?.title||''} ${asset?.summary||''} ${(asset?.tags||[]).join(' ')}`.toLowerCase();
    const suggestions=[];
    if(/morgenmad|kaffe|brunch/.test(text))suggestions.push({intent:'breakfast',weight:85});
    if(/frokost|lunch/.test(text))suggestions.push({intent:'lunch',weight:85});
    if(/middag|aften|drink|tapas/.test(text))suggestions.push({intent:'evening',weight:88});
    if(/strand|hav|kyst/.test(text))suggestions.push({intent:'beach',weight:85});
    if(/børn|familie/.test(text))suggestions.push({intent:'family',weight:78});
    return suggestions.filter(x=>!(asset?.intentWeights||{})[x.intent]);
  };
  window.CasaDiscoveryContentIntelligence=Object.freeze({
    version:VERSION,
    list(){return clone(window.CasaDiscovery?.assets||[]).map(asset=>({...asset,issues:validate(asset),suggestions:suggest(asset)}));},
    getDraft(){return clone(load());},
    update(assetId,patch){const draft=load();draft[assetId]={...(draft[assetId]||{}),...clone(patch),updatedAt:new Date().toISOString()};save(draft);return clone(draft[assetId]);},
    clear(assetId){const draft=load();delete draft[assetId];save(draft);},
    validate,
    suggest
  });
})();
