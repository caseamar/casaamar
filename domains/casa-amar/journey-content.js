/** Casa Amar domain package for the generic Journey Planner Engine. */
(() => {
  'use strict';
  const w=(start,end)=>({start,end});
  const d=(min,typical,max)=>({min,typical,max});
  const items = [
    {id:'work-home',type:'personal',role:'personal',title:'Rolig arbejdstid i huset',summary:'Et fokuseret tidsrum med huset som base.',duration:d(60,120,180),energy:1,location:'home',locationLabel:'Huset',tags:['rolig'],windows:[w(420,660)],preferredStart:420,participants:['individual','subgroup'],priority:1},
    {id:'home-breakfast',type:'meal',role:'breakfast',exclusiveGroup:'meal.breakfast',maxPerDay:1,title:'Morgenmad og kaffe på terrassen',summary:'Kaffe, frisk brød og en rolig start hjemme.',duration:d(45,75,105),energy:1,location:'home',locationLabel:'Huset',tags:['mad','rolig','familie'],windows:[w(420,690)],preferredStart:540,participants:['all','subgroup'],pairs:['gran-parque','home-pool','mijas-pueblo']},
    {id:'hoyo-breakfast',type:'meal',role:'breakfast',exclusiveGroup:'meal.breakfast',maxPerDay:1,title:'Morgenmad på Hoyo 19',summary:'En lokal morgenmad tæt på huset fra kl. 08.',duration:d(45,75,105),energy:1,location:'cerros',locationLabel:'Cerros del Águila',tags:['mad','rolig','familie'],windows:[w(480,720)],preferredStart:510,participants:['all','subgroup']},
    {id:'cerros-breakfast',type:'meal',role:'breakfast',exclusiveGroup:'meal.breakfast',maxPerDay:1,title:'Morgenmad på Restaurant Cerros del Águila',summary:'En senere morgenmad tæt på huset fra kl. 10.',duration:d(45,75,105),energy:1,location:'cerros',locationLabel:'Cerros del Águila',tags:['mad','rolig','familie'],windows:[w(600,780)],preferredStart:600,participants:['all','subgroup']},
    {id:'gran-parque-walk',type:'activity',role:'activity',title:'Tur i Gran Parque Mijas',summary:'En fleksibel gåtur tæt på huset.',duration:d(30,60,120),energy:2,location:'park',locationLabel:'Gran Parque Mijas',tags:['familie','aktiv','rolig'],windows:[w(450,1260)],preferredStart:600,participants:['all','subgroup','individual'],pairs:['home-pool','home-breakfast']},
    {id:'home-pool',type:'recovery',role:'recovery',replaces:['dinner','evening'],title:'Pool og pause ved huset',summary:'Badning eller ro tæt på huset — også som en kort aftensvømning.',duration:d(30,90,180),energy:1,location:'pool',locationLabel:'Poolen',tags:['rolig','familie','strand'],windows:[w(660,1260)],preferredStart:660,participants:['all','subgroup','individual'],pairs:['home-dinner','roof-sunset','ronda']},
    {id:'home-siesta',type:'recovery',role:'recovery',title:'Siesta og ro i huset',summary:'Et fleksibelt pusterum med huset som base.',duration:d(30,90,150),energy:1,location:'home',locationLabel:'Huset',tags:['rolig','familie'],windows:[w(720,1110)],preferredStart:780,participants:['all','subgroup','individual']},
    {id:'shopping',type:'errand',role:'errand',title:'Indkøb til huset',summary:'Dagligvarer og gode råvarer til resten af opholdet.',duration:d(45,75,120),energy:1,location:'fuengirola',locationLabel:'Fuengirola',tags:['mad','familie'],windows:[w(540,1260)],preferredStart:870,participants:['subgroup','individual'],pairs:['la-cala-beach','mijas-pueblo','home-dinner']},
    {id:'roof-sunset',type:'recovery',role:'evening',maxPerDay:1,title:'Solnedgang på tagterrassen',summary:'Slut dagen med udsigt og god tid.',duration:d(30,75,120),energy:1,location:'home',locationLabel:'Huset',tags:['rolig','mad','kultur'],windows:[w(1140,1320)],preferredStart:1200,participants:['all','subgroup'],pairs:['home-dinner']},
    {id:'home-dinner',type:'meal',role:'dinner',exclusiveGroup:'meal.dinner',maxPerDay:1,allowedReplacementRoles:['recovery','evening'],title:'Middag hjemme',summary:'Gode råvarer og en rolig aften på patioen.',duration:d(60,120,180),energy:1,location:'home',locationLabel:'Huset',tags:['mad','rolig','familie'],windows:[w(1080,1380)],preferredStart:1200,participants:['all','subgroup']},
    {id:'hoyo19',type:'restaurant',role:'dinner',exclusiveGroup:'meal.dinner',maxPerDay:1,allowedReplacementRoles:['recovery','evening'],title:'Mad eller en drink på Hoyo 19',summary:'Lokalt og tæt på huset, når dagen skal afsluttes enkelt.',duration:d(45,105,150),energy:1,location:'cerros',locationLabel:'Cerros del Águila',tags:['mad','rolig','familie'],windows:[w(720,1380)],preferredStart:1200,participants:['all','subgroup'],pairs:['home-pool','roof-sunset']},
    {id:'la-cala-restaurant',type:'restaurant',role:'lunch',exclusiveGroup:'meal.lunch',maxPerDay:1,title:'Frokost i La Cala',summary:'Spis tæt på vandet og kombiner med strand eller promenade.',duration:d(60,120,150),energy:1,location:'la-cala',locationLabel:'La Cala',tags:['mad','strand'],windows:[w(750,1020)],preferredStart:810,participants:['all','subgroup'],pairs:['la-cala-beach']},
    {id:'fuengirola-tapas',type:'restaurant',role:'dinner',exclusiveGroup:'meal.dinner',maxPerDay:1,allowedReplacementRoles:['recovery','evening'],title:'Tapas i Fuengirola',summary:'En levende aften med en tur langs promenaden.',duration:d(75,135,180),energy:2,location:'fuengirola',locationLabel:'Fuengirola',tags:['mad','kultur'],windows:[w(1140,1410)],preferredStart:1200,participants:['all','subgroup'],pairs:['fuengirola-beach']},
    {id:'primavera-dinner',type:'restaurant',role:'dinner',exclusiveGroup:'meal.dinner',maxPerDay:1,allowedReplacementRoles:['recovery','evening'],title:'Middag på Primavera',summary:'Aftensmad efter strand eller en rolig eftermiddag.',duration:d(75,120,165),energy:1,location:'coast',locationLabel:'Kysten',tags:['mad','strand'],windows:[w(1140,1380)],preferredStart:1200,participants:['all','subgroup'],pairs:['la-cala-beach','fuengirola-beach']},
    {id:'la-cala-beach',type:'activity',role:'activity',title:'Strand i La Cala',summary:'Badning, strandliv og nem adgang til frokost.',duration:d(90,180,300),energy:2,location:'la-cala',locationLabel:'La Cala',tags:['strand','familie','rolig'],windows:[w(600,1260)],preferredStart:960,participants:['all','subgroup','individual'],pairs:['la-cala-restaurant']},
    {id:'fuengirola-beach',type:'activity',role:'activity',title:'Strand og promenade i Fuengirola',summary:'Kombiner strand med byliv, is eller tapas.',duration:d(90,180,300),energy:2,location:'fuengirola',locationLabel:'Fuengirola',tags:['strand','familie'],windows:[w(600,1260)],preferredStart:960,participants:['all','subgroup','individual'],pairs:['fuengirola-tapas']},
    {id:'mijas-pueblo',type:'destination',role:'destination',title:'Mijas Pueblo',summary:'Hvide gader, udsigter, kaffe og mulighed for et måltid.',duration:d(120,240,330),energy:2,location:'mijas',locationLabel:'Mijas Pueblo',tags:['kultur','mad','familie'],windows:[w(540,1320)],preferredStart:960,participants:['all','subgroup'],pairs:['roof-sunset']},
    {id:'ronda',type:'destination',role:'destination',tripContainer:true,title:'Ronda',summary:'En stor dagstur med broen, gamle gader og lokal frokost.',duration:d(540,660,780),energy:3,location:'ronda',locationLabel:'Ronda',tags:['kultur','aktiv'],windows:[w(420,1140)],preferredStart:420,dayWeight:'full',participants:['all','subgroup'],pairs:['home-pool','hoyo19','home-dinner']},
    {id:'setenil',type:'destination',role:'destination',title:'Setenil de las Bodegas',summary:'Klippebyen kan kombineres med Ronda på en lang dag.',duration:d(90,150,210),energy:2,location:'setenil',locationLabel:'Setenil',tags:['kultur','aktiv'],windows:[w(660,1140)],preferredStart:780,participants:['all','subgroup'],pairs:['ronda']},
    {id:'mtb',type:'activity',role:'activity',title:'MTB i Mijas-bakkerne',summary:'Aktiv tur i terrænet med tid til bad og pause bagefter.',duration:d(150,240,330),energy:4,location:'mijas',locationLabel:'Mijas-bakkerne',tags:['aktiv','natur'],windows:[w(420,900)],preferredStart:480,participants:['subgroup','individual'],pairs:['home-pool','hoyo19']},
    {id:'diving',type:'activity',role:'activity',title:'Dykning ved kysten',summary:'En halv dags aktivitet med briefing, transport og tid på vandet.',duration:d(240,300,390),energy:4,location:'coast',locationLabel:'Kysten',tags:['aktiv','strand'],windows:[w(480,960)],preferredStart:540,participants:['subgroup','individual'],pairs:['la-cala-restaurant','home-pool']},
    {id:'golf',type:'activity',role:'activity',title:'Golf i nærområdet',summary:'En runde tæt på Casa Amar med mulighed for frokost på klubben.',duration:d(180,240,330),energy:3,location:'golf',locationLabel:'Golfbanen',tags:['golf','aktiv'],windows:[w(420,1080)],preferredStart:660,participants:['subgroup','individual'],pairs:['hoyo19','home-pool']},
    {id:'movie-terrace',type:'recovery',role:'evening',maxPerDay:1,title:'Film og drinks på tagterrassen',summary:'En rolig afslutning hjemme efter dagens aktiviteter.',duration:d(60,120,180),energy:1,location:'home',locationLabel:'Huset',tags:['rolig','familie'],windows:[w(1200,1430)],preferredStart:1260,participants:['all','subgroup']}
  ];

  const travel = {
    home:{pool:2,cerros:5,park:7,fuengirola:15,'la-cala':18,mijas:25,ronda:95,setenil:105,coast:20,golf:10},
    pool:{home:2,cerros:5,park:8,fuengirola:17,'la-cala':20,mijas:27,ronda:97,coast:22,golf:12},
    cerros:{home:5,pool:5,park:8,fuengirola:15,'la-cala':18,mijas:25,ronda:95,coast:20,golf:10},
    park:{home:7,pool:8,cerros:8,fuengirola:12,'la-cala':15,mijas:22,ronda:92,coast:17,golf:12},
    fuengirola:{home:15,pool:17,cerros:15,park:12,'la-cala':18,mijas:25,ronda:90,coast:15,golf:18},
    'la-cala':{home:18,pool:20,cerros:18,park:15,fuengirola:18,mijas:30,ronda:95,coast:12,golf:20},
    mijas:{home:25,pool:27,cerros:25,park:22,fuengirola:25,'la-cala':30,ronda:85,coast:30,golf:22},
    ronda:{home:95,pool:97,cerros:95,park:92,fuengirola:90,'la-cala':95,mijas:85,setenil:20,coast:100,golf:90},
    setenil:{ronda:20,home:105},
    coast:{home:20,pool:22,cerros:20,park:17,fuengirola:15,'la-cala':12,mijas:30,ronda:100,golf:25},
    golf:{home:10,pool:12,cerros:10,park:12,fuengirola:18,'la-cala':20,mijas:22,ronda:90,coast:25}
  };

  const discovery = {
    'cerros-breakfast': {title:'Restaurant Cerros del Águila',summary:'Lokalt spisested tæt på huset — morgenmad, frokost, middag eller en drink.',mealMoments:['breakfast','lunch','dinner','drinks'],primaryIntents:['restaurant','morgenmad','frokost','middag','drink','lokalt'],secondaryIntents:['familie','terrasse','nær huset'],discoveryGroup:'dining'},
    'hoyo-breakfast': {title:'Hoyo 19',summary:'Morgenmad, frokost, middag eller en drink ved golfbanen tæt på Casa Amar.',mealMoments:['breakfast','lunch','dinner','drinks'],primaryIntents:['restaurant','morgenmad','frokost','middag','drink','golf'],secondaryIntents:['lokalt','familie','terrasse'],discoveryGroup:'dining'},
    'hoyo19': {hiddenFromSuggestions:true},
    'home-breakfast': {mealMoments:['breakfast'],primaryIntents:['morgenmad','kaffe','hjemme','terrasse'],discoveryGroup:'breakfast'},
    'home-dinner': {mealMoments:['dinner'],primaryIntents:['middag','aftensmad','hjemme','grill'],discoveryGroup:'dinner'},
    'la-cala-restaurant': {title:'Spis ved vandet i La Cala',mealMoments:['lunch','dinner'],primaryIntents:['restaurant','frokost','middag','havudsigt'],secondaryIntents:['strand','promenade','la cala'],relatedIntents:['strand'],discoveryGroup:'dining'},
    'fuengirola-tapas': {mealMoments:['dinner','drinks'],primaryIntents:['tapas','middag','aften','night out','restaurant'],secondaryIntents:['promenade','fuengirola'],discoveryGroup:'dinner'},
    'primavera-dinner': {mealMoments:['dinner'],primaryIntents:['middag','restaurant','aften','primavera'],secondaryIntents:['strand','kysten'],relatedIntents:['strand'],discoveryGroup:'dinner'},
    'la-cala-beach': {primaryIntents:['strand','badning','hav','la cala'],secondaryIntents:['familie','promenade','frokost'],discoveryGroup:'beach'},
    'fuengirola-beach': {primaryIntents:['strand','badning','hav','promenade','fuengirola'],secondaryIntents:['familie','is','tapas'],discoveryGroup:'beach'},
    'home-pool': {primaryIntents:['pool','badning','slappe af','børn'],secondaryIntents:['aften','nær huset'],discoveryGroup:'beach'},
    'mijas-pueblo': {primaryIntents:['mijas pueblo','udflugt','hvide by','udsigt','kultur'],secondaryIntents:['kaffe','middag','familie'],discoveryGroup:'destination'},
    'ronda': {primaryIntents:['ronda','udflugt','bro','kultur','heldagstur'],secondaryIntents:['frokost','historie'],discoveryGroup:'destination'},
    'setenil': {primaryIntents:['setenil','udflugt','klippeby','kultur'],secondaryIntents:['ronda'],discoveryGroup:'destination'},
    'mtb': {primaryIntents:['mtb','cykling','aktiv','sport','natur'],secondaryIntents:['bakker','pool'],discoveryGroup:'active'},
    'diving': {primaryIntents:['dykning','aktiv','hav','sport'],secondaryIntents:['strand','kysten'],discoveryGroup:'active'},
    'golf': {primaryIntents:['golf','aktiv','sport'],secondaryIntents:['frokost','hoyo 19'],discoveryGroup:'active'},
    'gran-parque-walk': {primaryIntents:['park','gåtur','børn','familie','legeplads'],secondaryIntents:['rolig','nær huset'],discoveryGroup:'family'},
    'shopping': {primaryIntents:['indkøb','shopping','supermarked','madvarer'],secondaryIntents:['praktisk','familie'],discoveryGroup:'practical'},
    'roof-sunset': {primaryIntents:['solnedgang','udsigt','tagterrasse','rolig'],secondaryIntents:['drink','aften'],discoveryGroup:'home'},
    'movie-terrace': {primaryIntents:['film','tagterrasse','aften','rolig'],secondaryIntents:['familie','drink'],discoveryGroup:'home'},
    'home-siesta': {primaryIntents:['siesta','slappe af','pause','hjemme','rolig'],discoveryGroup:'home'},
    'work-home': {primaryIntents:['arbejde','workation','hjemme','rolig'],discoveryGroup:'home'}
  };
  items.forEach(item=>Object.assign(item,discovery[item.id]||{}));

  window.CasaJourneyContent = Object.freeze({
    domain:'hospitality.stay',
    version:'4.0.0',
    baseLocation:'home',
    defaultTravelMinutes:25,
    participantModes:['all','subgroup','individual'],
    items,
    travel
  });
})();
