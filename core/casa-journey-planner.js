/** Generic wish-first Experience Composer. Domain content is supplied through window.CasaJourneyContent. */
(() => {
  'use strict';
  const root = document.querySelector('[data-stay-planner]');
  const source = window.CasaJourneyContent;
  if (!root || !source?.items?.length) return;

  const DAY_START = 420;
  const DAY_END = 1430;
  const items = source.items.filter(item => !item.hiddenFromSuggestions);
  const byId = new Map(items.map(item => [item.id, item]));
  const travel = (from, to) => from === to ? 0 : source.travel?.[from]?.[to] ?? source.travel?.[to]?.[from] ?? source.defaultTravelMinutes ?? 25;
  const typical = item => item.duration?.typical ?? item.duration ?? 90;
  const minDuration = item => item.duration?.min ?? typical(item);
  const clock = minutes => `${String(Math.floor(minutes / 60) % 24).padStart(2,'0')}.${String(minutes % 60).padStart(2,'0')}`;
  const windows = item => item.windows?.length ? item.windows : [{start: DAY_START, end: DAY_END}];
  const role = item => item.role || item.type || 'activity';
  const mealRoles = new Set(['breakfast','lunch','dinner']);

  const state = {
    selected: new Set(['home-pool','mijas-pueblo','primavera-dinner']),
    audience: 'adults',
    rhythm: 'spanish',
    pace: 'balanced',
    activePlan: 0,
    variants: [],
    generation: 0
  };

  const audienceLabels = {adults:'Voksne',family:'Familie med børn',baby:'Familie med baby'};
  const rhythmLabels = {spanish:'Sen spansk middag',danish:'Tidligere middag',flexible:'Fleksibel'};
  const paceLabels = {relaxed:'Rolig',balanced:'Balanceret',active:'Aktiv'};
  const categoryLabels = {destination:'Udflugter',activity:'Aktiviteter',dining:'Spisesteder',meal:'Mad',recovery:'Ro og base',errand:'Praktisk',personal:'Egen tid'};

  const itemCategory = item => item.type === 'destination' ? 'destination' : mealRoles.has(role(item)) ? 'dining' : item.type === 'recovery' ? 'recovery' : item.type === 'errand' ? 'errand' : item.type === 'personal' ? 'personal' : 'activity';
  const selectedItems = () => [...state.selected].map(id => byId.get(id)).filter(Boolean);

  function preferenceScore(item) {
    let score = item.priority || 0;
    if (state.audience !== 'adults' && item.tags?.includes('familie')) score += 4;
    if (state.audience === 'baby' && item.location === 'home') score += 2;
    if (state.pace === 'relaxed' && item.energy <= 2) score += 3;
    if (state.pace === 'active' && item.energy >= 3) score += 3;
    score += Math.min(2, window.CasaJourneyLearning?.insights?.().topChoices?.find(([id]) => id === item.id)?.[1] || 0) * .1;
    return score;
  }

  function diningWindow(item) {
    if (role(item) !== 'dinner') return windows(item);
    if (state.rhythm === 'danish') return windows(item).map(w => ({start:Math.max(w.start,1050),end:Math.min(w.end,1260)})).filter(w=>w.end>w.start);
    if (state.rhythm === 'spanish') return windows(item).map(w => ({start:Math.max(w.start,1200),end:w.end})).filter(w=>w.end>w.start);
    return windows(item);
  }

  function effectiveWindows(item) { return role(item) === 'dinner' ? diningWindow(item) : windows(item); }

  function dedupeMeals(list) {
    const seen = new Set();
    return list.filter(item => {
      if (!mealRoles.has(role(item))) return true;
      if (seen.has(role(item))) return false;
      seen.add(role(item)); return true;
    });
  }

  function orderCandidates(list, variant) {
    const preferred = item => effectiveWindows(item)[0]?.start ?? DAY_START;
    return [...list].sort((a,b) => {
      if (a.dayWeight === 'full') return -1;
      if (b.dayWeight === 'full') return 1;
      const aw = preferred(a), bw = preferred(b);
      const locationBonus = variant === 1 && a.location === 'home' ? -90 : 0;
      return (aw + locationBonus) - (bw + (variant === 1 && b.location === 'home' ? -90 : 0));
    });
  }

  function placePlan(chosen, variant = 0) {
    let list = dedupeMeals(orderCandidates(chosen, variant));
    const full = list.find(item => item.dayWeight === 'full');
    if (full) list = [full, ...list.filter(item => item !== full && (item.location === 'home' || item.location === 'cerros') && typical(item) <= 120).slice(0,2)];

    const blocks = [];
    let cursor = DAY_START;
    let previousLocation = source.baseLocation;
    for (const item of list) {
      const trip = travel(previousLocation, item.location);
      const duration = typical(item);
      const wins = effectiveWindows(item);
      let start = null;
      for (const w of wins) {
        const candidate = Math.max(cursor + trip, w.start, item.preferredStart || DAY_START);
        if (candidate + duration <= w.end && candidate + duration <= DAY_END) { start = candidate; break; }
      }
      if (start == null) {
        const w = wins[0];
        if (!w) continue;
        const short = Math.max(minDuration(item), Math.min(duration, w.end - Math.max(cursor + trip, w.start)));
        const candidate = Math.max(cursor + trip, w.start);
        if (short < minDuration(item) || candidate + short > DAY_END) continue;
        blocks.push({item,start:candidate,end:candidate+short,duration:short,travel:trip});
        cursor = candidate + short; previousLocation = item.location; continue;
      }
      blocks.push({item,start,end:start+duration,duration,travel:trip});
      cursor = start + duration; previousLocation = item.location;
    }
    return blocks;
  }

  function enrichSelection(base, variant) {
    const list = [...base];
    const ids = new Set(list.map(i=>i.id));
    const hasDinner = list.some(i=>role(i)==='dinner');
    const hasRecovery = list.some(i=>i.type==='recovery');
    const ranked = items.filter(i=>!ids.has(i.id)).sort((a,b)=>preferenceScore(b)-preferenceScore(a));
    if (!hasRecovery && variant !== 2) list.push(ranked.find(i=>i.type==='recovery') || byId.get('home-siesta'));
    if (!hasDinner) list.push(ranked.find(i=>role(i)==='dinner') || byId.get('home-dinner'));
    if (variant === 2 && list.length < 5) list.push(ranked.find(i=>i.energy>=3 && !list.includes(i)) || ranked[0]);
    return list.filter(Boolean);
  }

  function makeVariants() {
    const base = selectedItems();
    const alternatives = [
      {name:'Bedste rækkefølge',tone:'Den mest naturlige rute med jeres valgte oplevelser.'},
      {name:'Mere luft',tone:'Mere tid hjemme og færre skift i løbet af dagen.'},
      {name:'Mere oplevelse',tone:'En lidt mere aktiv udgave, hvis der er plads.'}
    ];
    state.variants = alternatives.map((meta,index) => ({...meta,blocks:placePlan(enrichSelection(base,index),index)}));
    state.activePlan = 0;
    state.generation++;
    window.CasaJourneyLearning?.record?.('plan_generated',{domain:source.domain,planIds:base.map(i=>i.id),itemId:`audience.${state.audience}`,anchorId:`rhythm.${state.rhythm}`});
  }

  function tripDetails(block) {
    if (!block.item.tripContainer) return '';
    const eachWay = travel(source.baseLocation, block.item.location);
    return `<div class="composer-trip"><span><b>${clock(block.start)}</b>Afgang</span><span><b>${clock(block.start+eachWay)}</b>Ankomst</span><span><b>${clock(block.end-eachWay)}</b>Kør hjem</span><span><b>${clock(block.end)}</b>Retur</span></div>`;
  }

  function renderCatalogue() {
    const host = root.querySelector('[data-wish-catalogue]');
    const groups = new Map();
    items.filter(i=>!['breakfast','lunch'].includes(role(i))).forEach(item => {
      const category = itemCategory(item); if (!groups.has(category)) groups.set(category,[]); groups.get(category).push(item);
    });
    host.innerHTML = [...groups].map(([category,group]) => `<section class="wish-group"><h3>${categoryLabels[category] || category}</h3><div class="wish-grid">${group.map(item => `<button type="button" class="wish-card ${state.selected.has(item.id)?'selected':''}" data-wish-id="${item.id}" aria-pressed="${state.selected.has(item.id)}"><span>${item.title}</span><small>${item.summary}</small><em>${typical(item)} min. · ${item.locationLabel || item.location}</em></button>`).join('')}</div></section>`).join('');
  }

  function renderSelection() {
    const host = root.querySelector('[data-selected-wishes]');
    const chosen = selectedItems();
    host.innerHTML = chosen.length ? chosen.map(item=>`<button type="button" data-remove-wish="${item.id}" title="Fjern ${item.title}">${item.title}<span>×</span></button>`).join('') : '<span class="empty-selection">Vælg mindst én oplevelse nedenfor.</span>';
    root.querySelector('[data-compose-day]').disabled = chosen.length === 0;
  }

  function renderPlans() {
    const host = root.querySelector('[data-plan-results]');
    if (!state.variants.length) { host.hidden = true; return; }
    host.hidden = false;
    host.querySelector('[data-plan-tabs]').innerHTML = state.variants.map((plan,index)=>`<button type="button" class="${index===state.activePlan?'active':''}" data-plan-variant="${index}">${plan.name}</button>`).join('');
    const plan = state.variants[state.activePlan];
    host.querySelector('[data-plan-explanation]').textContent = plan.tone;
    host.querySelector('[data-plan-timeline]').innerHTML = plan.blocks.map(block=>`<li><time><strong>${clock(block.start)}</strong><span>${clock(block.end)}</span></time><div>${block.travel?`<small class="journey-travel">Ca. ${block.travel} min. transport</small>`:''}<strong>${block.item.title}</strong><p>${block.item.summary}</p>${tripDetails(block)}<div class="journey-meta"><span>${block.duration} min.</span><span>${block.item.locationLabel || block.item.location}</span></div></div></li>`).join('') || '<li class="plan-warning">Kombinationen kan ikke placeres realistisk på én dag. Fjern et ønske eller vælg en anden sammensætning.</li>';
  }

  function renderControls() {
    root.querySelectorAll('[data-audience]').forEach(b=>b.classList.toggle('active',b.dataset.audience===state.audience));
    root.querySelectorAll('[data-rhythm]').forEach(b=>b.classList.toggle('active',b.dataset.rhythm===state.rhythm));
    root.querySelectorAll('[data-pace]').forEach(b=>b.classList.toggle('active',b.dataset.pace===state.pace));
  }

  function refresh() { renderControls(); renderSelection(); renderCatalogue(); renderPlans(); }

  function inspire() {
    const pools = {
      relaxed:['home-pool','mijas-pueblo','roof-sunset','home-dinner'],
      balanced:['gran-parque-walk','home-pool','la-cala-beach','primavera-dinner'],
      active:['mtb','home-pool','hoyo19']
    };
    state.selected = new Set(pools[state.pace] || pools.balanced);
    makeVariants(); refresh();
    root.querySelector('[data-plan-results]')?.scrollIntoView({behavior:'smooth',block:'start'});
  }

  async function copyPlan() {
    const plan = state.variants[state.activePlan]; if (!plan) return;
    const text = [`Vores dag fra Casa Amar — ${plan.name}`,`Gruppe: ${audienceLabels[state.audience]} · Måltidsrytme: ${rhythmLabels[state.rhythm]}`,'',...plan.blocks.map(b=>`${clock(b.start)}–${clock(b.end)}  ${b.item.title}${b.travel?` (ca. ${b.travel} min. transport)`:''}`)].join('\n');
    const feedback = root.querySelector('[data-plan-feedback]');
    try { await navigator.clipboard.writeText(text); feedback.textContent='Planen er kopieret.'; } catch { feedback.textContent='Kunne ikke kopiere automatisk.'; }
    window.CasaJourneyLearning?.record?.('plan_copied',{domain:source.domain,planIds:plan.blocks.map(b=>b.item.id)});
    return text;
  }

  root.addEventListener('click', async event => {
    const wish = event.target.closest('[data-wish-id]');
    const remove = event.target.closest('[data-remove-wish]');
    const audience = event.target.closest('[data-audience]');
    const rhythm = event.target.closest('[data-rhythm]');
    const pace = event.target.closest('[data-pace]');
    const variant = event.target.closest('[data-plan-variant]');
    if (wish) { const id=wish.dataset.wishId; state.selected.has(id)?state.selected.delete(id):state.selected.add(id); state.variants=[]; refresh(); window.CasaJourneyLearning?.record?.('wish_toggled',{domain:source.domain,itemId:id,planIds:[...state.selected]}); }
    if (remove) { state.selected.delete(remove.dataset.removeWish); state.variants=[]; refresh(); }
    if (audience) { state.audience=audience.dataset.audience; state.variants=[]; refresh(); }
    if (rhythm) { state.rhythm=rhythm.dataset.rhythm; state.variants=[]; refresh(); }
    if (pace) { state.pace=pace.dataset.pace; state.variants=[]; refresh(); }
    if (variant) { state.activePlan=Number(variant.dataset.planVariant); renderPlans(); }
  });
  root.querySelector('[data-compose-day]')?.addEventListener('click',()=>{makeVariants();refresh();root.querySelector('[data-plan-results]')?.scrollIntoView({behavior:'smooth',block:'start'});});
  root.querySelector('[data-inspire-day]')?.addEventListener('click',inspire);
  root.querySelector('[data-plan-another]')?.addEventListener('click',()=>{state.activePlan=(state.activePlan+1)%state.variants.length;renderPlans();});
  root.querySelector('[data-plan-copy]')?.addEventListener('click',copyPlan);
  root.querySelector('[data-plan-email]')?.addEventListener('click',async()=>{const text=await copyPlan();if(text)location.href=`mailto:?subject=${encodeURIComponent('Vores plan fra Casa Amar')}&body=${encodeURIComponent(text)}`;});
  root.querySelector('[data-plan-download]')?.addEventListener('click',()=>{const plan=state.variants[state.activePlan];if(!plan)return;const text=[`Vores dag fra Casa Amar — ${plan.name}`,'',...plan.blocks.map(b=>`${clock(b.start)}–${clock(b.end)}  ${b.item.title}`)].join('\n');const blob=new Blob([text],{type:'text/plain;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='casa-amar-dagsplan.txt';a.click();URL.revokeObjectURL(a.href);window.CasaJourneyLearning?.record?.('plan_downloaded',{domain:source.domain,planIds:plan.blocks.map(b=>b.item.id)});});

  refresh();
  window.CasaJourneyPlanner = Object.freeze({version:'4.0.0',domain:source.domain,snapshot:()=>({selected:[...state.selected],audience:state.audience,rhythm:state.rhythm,pace:state.pace,generation:state.generation,variants:state.variants.map(v=>v.blocks.map(b=>({id:b.item.id,start:b.start,end:b.end,travel:b.travel})) )})});
  document.documentElement.dataset.journeyPlanner='4.0.0';
})();
