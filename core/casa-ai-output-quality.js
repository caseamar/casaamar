(()=>{
 const VERSION='1.0.0';
 const forbidden=/\b(v\d+|final|copy|new|hero|asset|section|page|component|img[_ -]?\d+|dsc[_ -]?\d+)\b|\.(jpe?g|png|webp|gif|svg)\b/i;
 const duplicate=/\b([\p{L}]+)(?:\s+\1){1,}\b/iu;
 const known={
  'asset-casa-amar-koekken-ovn':'Køkkenet i Casa Amar med ovn, lyse træfronter og mørk bordplade.',
  'asset-casa-amar-v2-entre':'Indgangen til Casa Amar med hvid facade og beplantning.',
  'asset-casa-amar-v2-hero-patio':'Terrassen ved Casa Amar med siddepladser og plads til afslapning.',
  'asset-casa-amar-v2-kaffe':'Kaffe serveret på terrassen ved Casa Amar.',
  'asset-casa-amar-v2-koekken':'Det lyse køkken i Casa Amar med træfronter og mørk bordplade.',
  'asset-casa-amar-v2-master-bedroom':'Soveværelse i Casa Amar med dobbeltseng og lyst interiør.',
  'asset-casa-amar-v2-patio-detalje':'Detalje fra terrassen ved Casa Amar med middelhavsstemning.',
  'asset-casa-amar-v2-patio-spiseplads':'Spisepladsen på terrassen ved Casa Amar.',
  'asset-casa-amar-v2-pool':'Fælles poolområde nær Casa Amar med grønne omgivelser.',
  'asset-casa-amar-v2-projektor':'Projektoropsætning på tagterrassen ved Casa Amar.',
  'asset-casa-amar-v2-solnedgang':'Solnedgang set fra tagterrassen ved Casa Amar.',
  'asset-casa-amar-v2-sovevaerelse-2':'Soveværelse i Casa Amar med to sovepladser.',
  'asset-casa-amar-v2-sovevaerelse-3':'Soveværelse i Casa Amar med lyst interiør.',
  'asset-casa-amar-v2-stue':'Stuen i Casa Amar med sofa og lyst interiør.',
  'asset-casa-amar-v2-tagterrasse':'Tagterrassen ved Casa Amar med opholdsområde og udsigt.',
  'asset-casa-amar-v2-udsigt':'Udsigt over området omkring Casa Amar.'
 };
 function clean(s){return String(s||'').replace(/[-_]+/g,' ').replace(/\s+/g,' ').trim()}
 function validate(text,{purpose='alt-text'}={}){
  const value=clean(text),issues=[];
  if(!value)issues.push('empty');
  if(forbidden.test(value))issues.push('technical-token');
  if(duplicate.test(value.toLowerCase()))issues.push('repetition');
  if(value.length<18)issues.push('too-short');
  if(value.length>160)issues.push('too-long');
  if(/forslag til|billede af|foto af/i.test(value))issues.push('meta-language');
  const words=value.toLowerCase().match(/[\p{L}]+/gu)||[];
  if(words.length){const unique=new Set(words);if(unique.size/words.length<0.65)issues.push('keyword-stuffing')}
  if(purpose==='alt-text'&&!/[.!?]$/.test(value))issues.push('not-finished');
  return {status:issues.length?'failed':'verified',issues,score:Math.max(0,100-issues.length*20),text:value,purpose};
 }
 function proposeAlt(asset){
  const grounded=window.CasaDomainIntelligence?.proposeAlt?.(asset?.id);
  if(grounded?.status==='verified'){const review=validate(grounded.text,{purpose:'alt-text'});if(review.status==='verified')return {status:'verified',text:review.text,review,reason:'Forslaget er grounded i verificeret domænekontekst.',grounding:grounded.grounding,confidence:grounded.confidence};}
  const candidate=known[asset?.id]||'';
  const review=validate(candidate,{purpose:'alt-text'});
  if(review.status!=='verified')return {status:'manual_review',text:'',review,reason:'Der kunne ikke genereres en publiceringsklar alt-tekst ud fra verificeret billedkontekst.'};
  return {status:'verified',text:review.text,review,reason:'Forslaget er baseret på registreret billedkontekst og har bestået den semantiske kvalitetskontrol.'};
 }
 function snapshot(){const samples=Object.values(known).map(t=>validate(t));return{version:VERSION,contracts:1,knownAssets:Object.keys(known).length,verified:samples.filter(x=>x.status==='verified').length,targetStraightThroughApproval:90,forbiddenTokens:true,repetitionDetection:true,manualReviewFallback:true}}
 window.CasaAIOutputQuality={VERSION,validate,proposeAlt,snapshot};
})();
