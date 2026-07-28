(()=>{
 const VERSION='1.0.0';
 const patterns=[
  {match:a=>a.key?.startsWith('asset:'),title:'Forbedr beskrivelsen af patio-billedet',description:'AI har fundet, at den nye viden om patioens grill kan gøre billedbeskrivelsen mere præcis.',outcome:'Billedet får en mere præcis beskrivelse, som hjælper både gæster, søgemaskiner og skærmlæsere.',benefits:['Mere præcis billedtekst','Bedre tilgængelighed','Bedre søgbarhed']},
  {match:a=>a.targetWorkspace==='asset-intelligence',title:'Brug den nye viden i fremtidige billedforslag',description:'AI kan bruge den verificerede viden om grillen, når nye billeder analyseres og beskrives.',outcome:'Fremtidige billedforslag bliver mere præcise og kræver færre manuelle rettelser.',benefits:['Bedre AI-forslag','Færre rettelser','Ensartet viden']},
  {match:a=>a.targetWorkspace==='content-intelligence',title:'Brug den nye patio-viden i hjemmesidens tekster',description:'AI har fundet tekster, hvor den nye viden om patioen kan gøre beskrivelsen mere konkret og nyttig.',outcome:'Du får forslag til forbedrede tekster. Intet udgives uden din godkendelse.',benefits:['Mere konkret indhold','Bedre gæsteinformation','Klarere budskaber']},
  {match:a=>a.targetWorkspace==='digital-concierge',title:'Opdatér gæsternes digitale guide',description:'Den digitale guide bør kende den nye verificerede viden om grillen på patioen.',outcome:'Gæster kan få mere præcise svar om patioen og grillen.',benefits:['Bedre gæstesvar','Færre misforståelser','Samme viden overalt']},
  {match:a=>a.key==='content:experience',title:'Forbedr beskrivelserne af patioens oplevelser',description:'AI har fundet beskrivelser, hvor patioens muligheder for afslapning og udendørs måltider kan fremgå tydeligere.',outcome:'Du får konkrete tekstforslag, som du kan godkende enkeltvis.',benefits:['Stærkere oplevelsesbeskrivelse','Bedre forventningsafstemning','Mere relevant indhold']}
 ];
 const fallback=a=>({title:a.title||'Gennemgå den foreslåede forbedring',description:a.reason||'AI har fundet en mulig forbedring.',outcome:a.expectedOutcome||'Du ser forslaget, før noget ændres.',benefits:['Forklarligt forslag']});
 function explain(action){const p=patterns.find(x=>x.match(action))||fallback(action);return {...p,technicalTitle:action.title,technicalTarget:action.targetWorkspace};}
 function isPlainLanguage(text=''){return !/(grounded|grounding|asset\b|capability\b|content intelligence|digital concierge|status:\s*(ready|suggested)|mål:\s*[a-z-]+)/i.test(text)}
 window.CasaActionLanguage={VERSION,explain,isPlainLanguage};
})();
