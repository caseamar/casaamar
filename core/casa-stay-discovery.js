/** Casa Amar Stay Discovery & Gallery Engine 1.0 */
(() => {
  'use strict';
  const root = document.querySelector('[data-stay-planner]');
  const timeline = root?.querySelector('[data-plan-timeline]');
  if (!root || !timeline) return;

  const plans = {
    rolig: {
      mad: [['09.00','Langsom morgen på patioen','Espresso, frisk brød og tid uden en fast agenda.'],['12.30','Frokost ved kysten','Kør til La Cala eller Fuengirola og vælg et sted tæt på vandet.'],['16.00','Pause hjemme','Skygge, bog eller en tur i poolen, når den er åben.'],['20.00','Middag hjemme','Gode råvarer fra Carrefour og en rolig aften på patioen.']],
      strand: [['09.30','Morgen uden hast','Start hjemme og pak kun det nødvendige.'],['11.00','Et par timer ved stranden','Vælg Fuengirola eller La Cala efter stemning.'],['15.00','Tilbage til huset','Frokost, aircondition og en pause.'],['20.30','Solnedgang og let middag','Tagterrassen først, derefter tapas eller mad hjemme.']],
      familie: [['08.30','Morgenmad sammen','Rolig start og dagens plan over morgenmaden.'],['10.30','Pool eller Gran Parque','Kort transport og fleksibilitet, hvis energien skifter.'],['14.00','Frokost og pause','Hjem til skygge, mad og hvile.'],['18.30','Tidlig aften ude','Strandpromenade, is og en enkel middag.']],
      golf: [['08.00','Rolig morgen','Kaffe og let morgenmad før afgang.'],['10.00','En afslappet golfrunde','Vælg en bane i nærområdet og giv dagen plads.'],['16.00','Tilbage til Casa Amar','Bad, hvile og en drink på tagterrassen.'],['20.00','Middag i området','Spis lokalt eller kør til La Cala.']],
      kultur: [['09.00','Morgen på patioen','Start langsomt, før turen går mod byen.'],['11.00','Mijas Pueblo','Gå gennem gaderne, se udsigten og spis frokost.'],['16.00','Pause hjemme','Et par timer uden planer.'],['20.00','Aften i Fuengirola','Tapas og en tur langs promenaden.']]
    },
    balanceret: {
      mad: [['08.30','Kaffe hjemme','Start med espresso og morgenmad på patioen.'],['10.30','Marked eller specialbutikker','Find råvarer til senere og oplev hverdagslivet.'],['13.30','Frokost ude','Prøv fisk, tapas eller dagens menu ved kysten.'],['17.00','Pool eller tagterrasse','Et roligt mellemrum før aftenen.'],['20.30','Lav middag sammen','Brug køkkenet og spis ude på patioen.']],
      strand: [['08.30','Morgenmad hjemme','Pak strandtasken uden at gøre dagen for stram.'],['10.00','Strand og badning','Nyd formiddagen ved vandet.'],['14.00','Frokost ved stranden','Espeto eller en enkel salat.'],['17.00','Pause ved huset','Pool, læsning eller aircondition.'],['20.30','Aften på tagterrassen','Se lyset falde over bakkerne.']],
      familie: [['08.00','Fælles morgenmad','Fordel dagen i korte, overskuelige dele.'],['09.30','Gran Parque eller strand','Aktiv formiddag tæt på huset.'],['13.30','Frokost hjemme','Let at tilpasse til børn og pauser.'],['16.00','Pooltid','Nær huset og nemt at afslutte.'],['19.30','Middag og filmaften','Spis tidligt og brug projektoren senere.']],
      golf: [['07.30','Tidlig start','Kaffe og afgang, før dagen bliver varm.'],['09.00','Golf','En fuld runde på en bane langs kysten.'],['15.00','Sen frokost','Spis på klubben eller i La Cala.'],['18.00','Ro hjemme','Tagterrasse, bad og pause.'],['21.00','Let aftensmad','Noget enkelt hjemme eller lokalt.']],
      kultur: [['08.00','Afgang mod Málaga','Kom ind, før byen bliver travl.'],['10.00','Museum og gamle bydel','Vælg ét museum og gå resten.'],['14.00','Frokost i byen','Tapas eller markedshal.'],['17.30','Tilbage og pause','Et roligt mellemrum ved huset.'],['20.30','Middag på patioen','Afslut dagen hjemme.']]
    },
    aktiv: {
      mad: [['07.30','Tidlig kaffe','En hurtig espresso før dagens første tur.'],['08.30','Løb eller gåtur','Gran Parque og bakkerne omkring huset.'],['11.00','Indkøb og marked','Find lokale råvarer og specialiteter.'],['14.00','Frokost i Málaga','Kombinér by, mad og en gåtur.'],['18.30','Tilbage via kysten','Stop til en drink eller et bad.'],['21.00','Sen middag','Spis ude eller lav små retter hjemme.']],
      strand: [['07.30','Morgentur','Start dagen aktivt i bakkerne.'],['09.30','Strand og vandsport','Brug formiddagen ved kysten.'],['13.30','Frokost ved vandet','Hold pausen, før næste aktivitet.'],['16.00','Tur til Mijas Pueblo','Udsigt, gader og kaffe.'],['20.30','Solnedgang hjemme','Slut dagen på tagterrassen.']],
      familie: [['08.00','Morgenmad og afgang','Gør taskerne klar fra start.'],['09.30','Park eller zoo','Vælg en større familieoplevelse.'],['14.00','Frokost og kort pause','Find et roligt sted eller kør hjem.'],['16.30','Pool eller strand','En ny aktivitet i kortere format.'],['20.00','Grill og filmaften','Saml dagen hjemme.']],
      golf: [['07.00','Tidlig afgang','Kør ud, mens temperaturen er lavere.'],['08.00','18 huller','En aktiv runde med god tid.'],['13.30','Frokost på klubben','Lad måltidet være dagens pause.'],['16.00','Strand eller padel','En ekstra aktivitet, hvis energien er der.'],['20.30','Middag i La Cala','Afslut dagen ved kysten.']],
      kultur: [['07.30','Afgang på dagstur','Vælg Ronda, Caminito del Rey eller Granada.'],['10.00','Dagens hovedoplevelse','Gå, se og oplev uden at skynde jer gennem det.'],['14.00','Lokal frokost','Spis der, hvor dagen foregår.'],['16.00','Mere tid på stedet','En gåtur, udsigt eller endnu et besøg.'],['20.30','Tilbage til Casa Amar','En enkel sen middag og ro.']]
    }
  };

  let pace = 'rolig'; let interest = 'mad';
  const labels = {rolig:'Rolig dag',balanceret:'Balanceret dag',aktiv:'Aktiv dag',mad:'Mad',strand:'Strand',familie:'Familie',golf:'Golf',kultur:'Kultur'};
  function render(){
    const entries=plans[pace][interest];
    root.querySelector('[data-plan-profile]').textContent=`${labels[pace]} · ${labels[interest]}`;
    timeline.innerHTML=entries.map(([time,title,text])=>`<li><time>${time}</time><div><strong>${title}</strong><p>${text}</p></div></li>`).join('');
    root.dataset.planPace=pace; root.dataset.planInterest=interest;
  }
  root.querySelectorAll('[data-planner-pace]').forEach(button=>button.addEventListener('click',()=>{pace=button.dataset.plannerPace;root.querySelectorAll('[data-planner-pace]').forEach(b=>{const on=b===button;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});render();}));
  root.querySelectorAll('[data-planner-interest]').forEach(button=>button.addEventListener('click',()=>{interest=button.dataset.plannerInterest;root.querySelectorAll('[data-planner-interest]').forEach(b=>{const on=b===button;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});render();}));
  root.querySelector('[data-plan-copy]')?.addEventListener('click',async()=>{const text=[`${labels[pace]} · ${labels[interest]}`,...plans[pace][interest].map(x=>`${x[0]} – ${x[1]}: ${x[2]}`)].join('\n');const feedback=root.querySelector('[data-plan-feedback]');try{await navigator.clipboard.writeText(text);feedback.textContent='Dagsplanen er kopieret.';}catch{feedback.textContent='Markér og kopiér planen manuelt.';}setTimeout(()=>feedback.textContent='',3500);});
  render();

  // Gallery intelligence: counts, animated filtering and filmstrip navigation.
  const items=[...document.querySelectorAll('[data-gallery] .gallery-item')];
  document.querySelectorAll('[data-gallery-filter]').forEach(button=>{const filter=button.dataset.galleryFilter;const count=items.filter(item=>filter==='all'||(item.dataset.category||'').split(' ').includes(filter)).length;button.insertAdjacentHTML('beforeend',` <span class="filter-count">${count}</span>`);button.addEventListener('click',()=>{requestAnimationFrame(()=>items.filter(i=>!i.hidden).forEach(i=>{i.classList.remove('is-filtered-in');void i.offsetWidth;i.classList.add('is-filtered-in');}));});});
  const lightbox=document.querySelector('[data-lightbox]');
  if(lightbox){
    const strip=document.createElement('div');strip.className='lightbox-filmstrip';strip.setAttribute('aria-label','Billeder i den valgte kategori');lightbox.append(strip);
    const meta=document.createElement('div');meta.className='lightbox-meta';lightbox.querySelector('figure')?.append(meta);
    const rebuild=()=>{const visible=items.filter(i=>!i.hidden);strip.innerHTML=visible.map((item,index)=>`<button type="button" data-film-index="${index}" aria-label="Vis billede ${index+1}"><img alt="" src="${item.querySelector('img').getAttribute('src')}"></button>`).join('');strip.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{const target=visible[Number(b.dataset.filmIndex)];target?.click();}));};
    const observer=new MutationObserver(rebuild);items.forEach(i=>observer.observe(i,{attributes:true,attributeFilter:['hidden']}));rebuild();
    const update=()=>{if(lightbox.hidden)return;const current=lightbox.querySelector('[data-lightbox-count]')?.textContent?.split('/')[0]?.trim();strip.querySelectorAll('button').forEach((b,i)=>b.classList.toggle('active',String(i+1)===current));const active=items.filter(i=>!i.hidden)[Number(current)-1];meta.textContent=active?.dataset.category?.replaceAll(' ',' · ')||'';};
    new MutationObserver(update).observe(lightbox,{attributes:true,subtree:true,childList:true,characterData:true});
  }
  window.CasaStayDiscovery=Object.freeze({version:'1.0.0',snapshot:()=>({pace,interest,plans:Object.keys(plans).length,galleryItems:items.length})});
  document.documentElement.dataset.stayDiscovery='1.0.0';
})();
