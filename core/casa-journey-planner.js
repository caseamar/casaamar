/** Generic open experience explorer with an optional manual day board. */
(() => {
  'use strict';
  const root = document.querySelector('[data-stay-planner]');
  const source = window.CasaJourneyContent;
  if (!root || !source?.items?.length) return;

  const items = source.items.filter(item => !item.hiddenFromSuggestions);
  const byId = new Map(items.map(item => [item.id, item]));
  const storageKey = `casa.day-board.${source.domain}.v1`;
  const labels = {all:'Alle',dining:'Spisning',breakfast:'Morgenmad',lunch:'Frokost',dinner:'Aften & night out',beach:'Strand & pool',destination:'Udflugter',active:'Aktiv',family:'Med børn',home:'Hjemme',practical:'Praktisk'};
  const order = ['all','dining','breakfast','lunch','dinner','beach','destination','active','family','home','practical'];
  const groupLabels = {breakfast:'Morgenmad',lunch:'Frokost',dinner:'Aften, middag & night out',destination:'Udflugter',beach:'Strand & pool',active:'Aktive oplevelser',home:'Ro og tid hjemme',practical:'Praktisk',other:'Andre muligheder'};
  const state = {filter:'all',query:'',expanded:new Set(),plan:loadPlan(),dragId:null};

  function categories(item) {
    const result = new Set();
    const role = item.role || '';
    const tags = item.tags || [];
    if (item.type === 'restaurant' || item.type === 'meal' || ['breakfast','lunch','dinner'].includes(role)) result.add('dining');
    if (['breakfast','lunch','dinner'].includes(role)) result.add(role);
    if (role === 'evening' || role === 'dinner') result.add('dinner');
    if (tags.includes('strand') || item.id.includes('pool') || item.id.includes('beach')) result.add('beach');
    if (item.type === 'destination') result.add('destination');
    if (tags.includes('aktiv') || (item.energy || 0) >= 3) result.add('active');
    if (tags.includes('familie')) result.add('family');
    if (item.location === 'home' || item.type === 'recovery' || item.type === 'personal') result.add('home');
    if (item.type === 'errand') result.add('practical');
    return [...result];
  }
  function groupFor(item) {
    const cats=categories(item), role=item.role;
    if (role==='breakfast') return 'breakfast';
    if (role==='lunch') return 'lunch';
    if (role==='dinner' || role==='evening') return 'dinner';
    if (cats.includes('destination')) return 'destination';
    if (cats.includes('beach')) return 'beach';
    if (cats.includes('active')) return 'active';
    if (cats.includes('home')) return 'home';
    if (cats.includes('practical')) return 'practical';
    return 'other';
  }
  function text(item){ return [item.title,item.summary,item.locationLabel,item.location,...(item.tags||[]),...categories(item).map(c=>labels[c])].join(' ').toLowerCase(); }
  function visibleItems(){
    const q=state.query.trim().toLowerCase();
    return items.filter(item => (state.filter==='all'||categories(item).includes(state.filter)) && (!q||text(item).includes(q)));
  }
  function loadPlan(){ try { const v=JSON.parse(localStorage.getItem(storageKey)||'[]'); return Array.isArray(v)?v:[]; } catch { return []; } }
  function savePlan(){ localStorage.setItem(storageKey,JSON.stringify(state.plan)); }
  function planItem(key){ if(key.startsWith('custom:')) return {id:key,title:key.slice(7),summary:'Eget punkt',custom:true}; return byId.get(key); }
  function addToPlan(id){ state.plan.push(id); savePlan(); renderPlan(); window.CasaJourneyLearning?.record?.('plan_item_added',{domain:source.domain,itemId:id,planIds:state.plan.filter(x=>!x.startsWith('custom:'))}); }
  function removeAt(index){ state.plan.splice(index,1); savePlan(); renderPlan(); }
  function move(from,to){ if(from===to||from<0||to<0)return; const [v]=state.plan.splice(from,1); state.plan.splice(to,0,v); savePlan(); renderPlan(); }

  function renderFilters(){
    const counts={all:items.length}; items.forEach(i=>categories(i).forEach(c=>counts[c]=(counts[c]||0)+1));
    root.querySelector('[data-experience-filters]').innerHTML=order.filter(k=>counts[k]).map(k=>`<button type="button" class="${state.filter===k?'active':''}" data-filter="${k}">${labels[k]} <span>${counts[k]}</span></button>`).join('');
  }
  function card(item){
    const meta=[item.locationLabel||item.location,item.duration?.typical?`${item.duration.typical} min.`:''].filter(Boolean).join(' · ');
    return `<article class="experience-card" draggable="true" data-experience-id="${item.id}"><h4>${item.title}</h4><button type="button" data-add-item="${item.id}" aria-label="Tilføj ${item.title} til min dag">+</button><p>${item.summary||''}</p><div class="experience-card-meta"><span>${meta}</span></div></article>`;
  }
  function renderCatalogue(){
    const result=visibleItems(), groups=new Map();
    result.forEach(item=>{const g=groupFor(item);if(!groups.has(g))groups.set(g,[]);groups.get(g).push(item);});
    root.querySelector('[data-result-count]').textContent=`${result.length} muligheder`;
    const host=root.querySelector('[data-experience-catalogue]');
    if(!result.length){host.innerHTML='<div class="experience-empty"><strong>Ingen præcise resultater.</strong><p>Prøv et bredere ord — eller tilføj jeres eget punkt direkte i planen.</p></div>';return;}
    const groupOrder=['breakfast','lunch','dinner','destination','beach','active','home','practical','other'];
    host.innerHTML=groupOrder.filter(g=>groups.has(g)).map(g=>{
      const all=groups.get(g), expanded=state.expanded.has(g), shown=expanded?all:all.slice(0,5);
      return `<section class="experience-group"><div class="experience-group-head"><h3>${groupLabels[g]}</h3>${all.length>5?`<button type="button" data-expand-group="${g}">${expanded?'Vis færre':`Vis alle ${all.length}`}</button>`:''}</div><div class="experience-grid">${shown.map(card).join('')}</div></section>`;
    }).join('');
  }
  function renderPlan(){
    const host=root.querySelector('[data-day-plan-list]');
    if(!state.plan.length){host.innerHTML='<li class="day-plan-empty"><div><strong>Jeres dag er åben.</strong><p>Træk inspiration hertil eller brug +. I behøver ikke lave en plan.</p></div></li>';return;}
    host.innerHTML=state.plan.map((key,index)=>{const item=planItem(key);if(!item)return'';return `<li class="day-plan-item" draggable="true" data-plan-index="${index}"><span class="day-plan-number">${index+1}</span><div><strong>${item.title}</strong><small>${item.custom?'Eget punkt':item.locationLabel||item.location||''}</small></div><div class="day-plan-controls"><button type="button" data-move-up="${index}" aria-label="Flyt op">↑</button><button type="button" data-move-down="${index}" aria-label="Flyt ned">↓</button><button type="button" data-remove-index="${index}" aria-label="Fjern">×</button></div></li>`;}).join('');
  }
  function refresh(){renderFilters();renderCatalogue();renderPlan();}
  function planText(){return ['Vores idéer til dagen fra Casa Amar','',...state.plan.map((key,i)=>`${i+1}. ${planItem(key)?.title||key}`)].join('\n');}
  async function copyPlan(){const feedback=root.querySelector('[data-plan-feedback]');if(!state.plan.length){feedback.textContent='Tilføj mindst ét punkt først.';return'';}try{await navigator.clipboard.writeText(planText());feedback.textContent='Planen er kopieret.';}catch{feedback.textContent='Kunne ikke kopiere automatisk.';}return planText();}

  root.addEventListener('click',async e=>{
    const filter=e.target.closest('[data-filter]'), add=e.target.closest('[data-add-item]'), expand=e.target.closest('[data-expand-group]'), remove=e.target.closest('[data-remove-index]'), up=e.target.closest('[data-move-up]'), down=e.target.closest('[data-move-down]');
    if(filter){state.filter=filter.dataset.filter;renderFilters();renderCatalogue();}
    if(add)addToPlan(add.dataset.addItem);
    if(expand){const g=expand.dataset.expandGroup;state.expanded.has(g)?state.expanded.delete(g):state.expanded.add(g);renderCatalogue();}
    if(remove)removeAt(Number(remove.dataset.removeIndex));
    if(up)move(Number(up.dataset.moveUp),Math.max(0,Number(up.dataset.moveUp)-1));
    if(down)move(Number(down.dataset.moveDown),Math.min(state.plan.length-1,Number(down.dataset.moveDown)+1));
  });
  root.querySelector('[data-experience-search]')?.addEventListener('input',e=>{state.query=e.target.value;renderCatalogue();});
  root.querySelector('[data-add-custom]')?.addEventListener('click',()=>{const input=root.querySelector('[data-custom-plan-text]'),value=input.value.trim();if(!value)return;addToPlan(`custom:${value}`);input.value='';});
  root.querySelector('[data-custom-plan-text]')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();root.querySelector('[data-add-custom]').click();}});
  root.querySelector('[data-clear-plan]')?.addEventListener('click',()=>{state.plan=[];savePlan();renderPlan();});
  root.querySelector('[data-plan-copy]')?.addEventListener('click',copyPlan);
  root.querySelector('[data-plan-email]')?.addEventListener('click',async()=>{const txt=await copyPlan();if(txt)location.href=`mailto:?subject=${encodeURIComponent('Vores idéer fra Casa Amar')}&body=${encodeURIComponent(txt)}`;});
  root.querySelector('[data-plan-download]')?.addEventListener('click',()=>{if(!state.plan.length)return;const blob=new Blob([planText()],{type:'text/plain;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='casa-amar-min-dag.txt';a.click();URL.revokeObjectURL(a.href);});

  root.addEventListener('dragstart',e=>{const card=e.target.closest('[data-experience-id]'),row=e.target.closest('[data-plan-index]');if(card){state.dragId=card.dataset.experienceId;e.dataTransfer.effectAllowed='copy';e.dataTransfer.setData('text/plain',state.dragId);}if(row){state.dragId=`plan:${row.dataset.planIndex}`;row.classList.add('dragging');e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',state.dragId);}});
  root.addEventListener('dragend',e=>{e.target.closest('.dragging')?.classList.remove('dragging');state.dragId=null;root.querySelector('[data-day-plan-list]')?.classList.remove('drag-over');});
  const board=root.querySelector('[data-day-plan-list]');
  board?.addEventListener('dragover',e=>{e.preventDefault();board.classList.add('drag-over');});
  board?.addEventListener('dragleave',()=>board.classList.remove('drag-over'));
  board?.addEventListener('drop',e=>{e.preventDefault();board.classList.remove('drag-over');const payload=e.dataTransfer.getData('text/plain')||state.dragId,target=e.target.closest('[data-plan-index]'),to=target?Number(target.dataset.planIndex):state.plan.length;if(payload?.startsWith('plan:'))move(Number(payload.slice(5)),to);else if(byId.has(payload)){state.plan.splice(to,0,payload);savePlan();renderPlan();}});

  refresh();
  window.CasaJourneyPlanner=Object.freeze({version:'5.0.0',domain:source.domain,snapshot:()=>({filter:state.filter,query:state.query,plan:[...state.plan]})});
  document.documentElement.dataset.journeyPlanner='5.0.0';
})();
