/** Casa Amar domain package for the generic Journey Planner Engine. */
(() => {
  'use strict';
  const items = [
    {id:'home-breakfast',type:'meal',title:'Morgenmad på patioen',summary:'Kaffe, frisk brød og en rolig start hjemme.',duration:75,energy:1,location:'home',tags:['mad','rolig','familie'],time:['morning'],pairs:['home-pool','la-cala-beach','mijas-pueblo']},
    {id:'home-pool',type:'recovery',title:'Pool og pause ved huset',summary:'Et fleksibelt mellemrum tæt på huset.',duration:120,energy:1,location:'home',tags:['rolig','familie','strand'],time:['afternoon'],pairs:['home-dinner','roof-sunset']},
    {id:'roof-sunset',type:'recovery',title:'Solnedgang på tagterrassen',summary:'Slut dagen med udsigt og god tid.',duration:75,energy:1,location:'home',tags:['rolig','mad','kultur'],time:['evening'],pairs:['home-dinner']},
    {id:'home-dinner',type:'meal',title:'Middag hjemme',summary:'Gode råvarer og en rolig aften på patioen.',duration:120,energy:1,location:'home',tags:['mad','rolig','familie'],time:['evening']},
    {id:'hoyo19',type:'restaurant',title:'Hoyo 19',summary:'Lokalt og tæt på huset – godt når dagen skal være enkel.',duration:105,energy:1,location:'cerros',tags:['mad','rolig','familie'],time:['lunch','evening'],pairs:['home-pool','roof-sunset']},
    {id:'la-cala-restaurant',type:'restaurant',title:'Frokost i La Cala',summary:'Spis tæt på vandet og kombiner med strand eller promenade.',duration:120,energy:1,location:'la-cala',tags:['mad','strand'],time:['lunch','evening'],pairs:['la-cala-beach']},
    {id:'fuengirola-tapas',type:'restaurant',title:'Tapas i Fuengirola',summary:'En levende aften med en tur langs promenaden.',duration:135,energy:2,location:'fuengirola',tags:['mad','kultur'],time:['evening'],pairs:['fuengirola-beach']},
    {id:'la-cala-beach',type:'activity',title:'Strand i La Cala',summary:'Badning, strandliv og nem adgang til frokost.',duration:180,energy:2,location:'la-cala',tags:['strand','familie','rolig'],time:['morning','afternoon'],pairs:['la-cala-restaurant']},
    {id:'fuengirola-beach',type:'activity',title:'Strand og promenade i Fuengirola',summary:'Kombiner strand med byliv, is eller tapas.',duration:180,energy:2,location:'fuengirola',tags:['strand','familie'],time:['morning','afternoon'],pairs:['fuengirola-tapas']},
    {id:'mijas-pueblo',type:'destination',title:'Mijas Pueblo',summary:'Hvide gader, udsigter, kaffe og en overskuelig udflugt.',duration:240,energy:2,location:'mijas',tags:['kultur','mad','familie'],time:['morning','afternoon'],pairs:['home-pool','roof-sunset']},
    {id:'ronda',type:'destination',title:'Ronda',summary:'En stor dagstur med broen, gamle gader og lokal frokost.',duration:600,energy:3,location:'ronda',tags:['kultur','aktiv'],time:['full-day'],exclusive:true,pairs:['roof-sunset','home-dinner']},
    {id:'setenil',type:'destination',title:'Setenil de las Bodegas',summary:'Klippebyen kan kombineres med Ronda på en lang dag.',duration:150,energy:2,location:'setenil',tags:['kultur','aktiv'],time:['afternoon'],pairs:['ronda']},
    {id:'mtb',type:'activity',title:'MTB i Mijas-bakkerne',summary:'Aktiv tur i terrænet med tid til bad og pause bagefter.',duration:240,energy:4,location:'mijas',tags:['aktiv','natur'],time:['morning'],pairs:['home-pool','hoyo19']},
    {id:'diving',type:'activity',title:'Dykning ved kysten',summary:'En halv dags aktivitet med briefing, transport og tid på vandet.',duration:300,energy:4,location:'coast',tags:['aktiv','strand'],time:['morning'],pairs:['la-cala-restaurant','home-pool']},
    {id:'golf',type:'activity',title:'Golf i nærområdet',summary:'En runde tæt på Casa Amar med mulighed for frokost på klubben.',duration:330,energy:3,location:'cerros',tags:['golf','aktiv'],time:['morning'],pairs:['hoyo19','home-pool']},
    {id:'gran-parque',type:'activity',title:'Gran Parque Mijas',summary:'En fleksibel familieaktivitet tæt på huset.',duration:150,energy:2,location:'mijas',tags:['familie','aktiv'],time:['morning','afternoon'],pairs:['home-pool','home-dinner']}
  ];
  window.CasaJourneyContent = Object.freeze({domain:'hospitality.stay',version:'1.0.0',items});
})();
