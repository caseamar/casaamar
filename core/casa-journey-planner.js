/** Generic Journey Planner Engine 3.0 — constraint-aware MVP with roles, free time, trip containers and learning hooks. */
(() => {
  'use strict';
  const root = document.querySelector('[data-stay-planner]');
  const source = window.CasaJourneyContent;
  if (!root || !source?.items?.length) return;

  const items = source.items;
  const byId = new Map(items.map(item => [item.id, item]));
  const timeline = root.querySelector('[data-plan-timeline]');
  const labels = {rolig:'Rolig', balanceret:'Balanceret', aktiv:'Aktiv', mad:'Mad', strand:'Strand', familie:'Familie', golf:'Golf', kultur:'Kultur'};
  const paceEnergy = {rolig:1, balanceret:2, aktiv:4};
  const DAY_START = 7*60, DAY_END = 23*60;
  const state = {pace:'rolig', interest:'mad', anchor:null, plan:[], locks:new Map(), history:[], replacements:0};

  const clock = value => `${String(Math.floor(value/60)%24).padStart(2,'0')}.${String(Math.round(value)%60).padStart(2,'0')}`;
  const duration = item => Number(item.duration?.typical ?? item.duration ?? 90);
  const minDuration = item => Number(item.duration?.min ?? Math.min(duration(item),45));
  const windows = item => item.windows?.length ? item.windows : [{start:DAY_START,end:DAY_END}];
  const fitsWindow = (item,start,length=duration(item)) => windows(item).some(w => start>=w.start && start+length<=w.end);
  const travel = (from,to) => !from||!to||from===to ? 0 : Number(source.travel?.[from]?.[to] ?? source.travel?.[to]?.[from] ?? source.defaultTravelMinutes ?? 25);
  const overlaps = (a,b) => a.start < b.end && b.start < a.end;
  const freeInterval = (candidate,blocks) => !blocks.some(block => overlaps(candidate,block));
  const role = item => item.role || item.type || 'activity';
  const group = item => item.exclusiveGroup || null;
  const planIds = () => state.plan.filter(b => !b.item.virtual).map(b => b.item.id);

  const freeTime = targetRole => ({
    id:`free-${targetRole || 'time'}`, virtual:true, type:'free', role:targetRole || 'flex', title:'Fri tid',
    summary:'Bevar plads til spontanitet, afslapning eller noget, I beslutter på dagen.',
    duration:{min:30,typical:90,max:240}, energy:0, location:'home', locationLabel:'Fleksibelt',
    windows:[{start:DAY_START,end:DAY_END}], participants:['all','subgroup','individual']
  });

  function score(item,{previous,anchor}={}) {
    let value = 0;
    if (item.tags?.includes(state.interest)) value += 8;
    value -= Math.abs((item.energy ?? 1)-paceEnergy[state.pace])*1.3;
    if (previous?.pairs?.includes(item.id) || item.pairs?.includes(previous?.id)) value += 3;
    if (anchor && item.id===anchor.id) value += 1000;
    value += item.priority || 0;
    const local = window.CasaJourneyLearning?.insights?.().topChoices?.find(([id]) => id===item.id)?.[1] || 0;
    value += Math.min(local,3)*0.25;
    return value;
  }

  function createBlock(item,start,options={}) {
    const length = options.duration ?? duration(item);
    return {uid:options.uid ?? `block-${item.id}-${Math.random().toString(36).slice(2,8)}`,item,start,end:start+length,duration:length,locked:Boolean(options.locked),source:options.source ?? 'generated',participants:options.participants ?? ['all']};
  }

  function snapshotForUndo() {
    state.history.push({anchor:state.anchor,locks:[...state.locks.entries()],plan:state.plan.map(b=>({id:b.item.id,virtual:b.item.virtual,role:role(b.item),uid:b.uid,start:b.start,duration:b.duration,locked:b.locked,source:b.source,participants:[...b.participants]}))});
    if (state.history.length>12) state.history.shift();
  }
  function hydratePlan(snapshot) {
    state.anchor=snapshot.anchor; state.locks=new Map(snapshot.locks);
    state.plan=snapshot.plan.map(b=>createBlock(b.virtual?freeTime(b.role):byId.get(b.id),b.start,b)).filter(b=>b.item);
  }

  function earliestFit(item,blocks,preferred=DAY_START) {
    const sorted=[...blocks].sort((a,b)=>a.start-b.start), len=duration(item);
    for (const w of windows(item)) {
      let cursor=Math.max(w.start,preferred);
      for (const block of sorted) {
        if (block.end<=cursor) continue;
        const transit=travel(block.item.location,item.location);
        if (cursor+transit+len<=block.start && fitsWindow(item,cursor+transit)) return cursor+transit;
        cursor=Math.max(cursor,block.end+travel(block.item.location,item.location));
      }
      if (cursor+len<=w.end && cursor+len<=DAY_END) return cursor;
    }
    return null;
  }

  function roleAllowed(item,usedRoles,usedGroups) {
    const r=role(item), g=group(item);
    if (g && usedGroups.has(g)) return false;
    if (item.maxPerDay===1 && usedRoles.has(r)) return false;
    return true;
  }

  function compose() {
    const blocks=[], usedIds=new Set(), usedRoles=new Set(), usedGroups=new Set();
    const anchor=state.anchor ? byId.get(state.anchor) : null;
    if (anchor) {
      const start=anchor.preferredStart ?? windows(anchor)[0].start;
      const block=createBlock(anchor,start,{locked:true,source:'anchor'});
      blocks.push(block); usedIds.add(anchor.id); usedRoles.add(role(anchor)); if(group(anchor)) usedGroups.add(group(anchor));
    }
    for (const [uid,lock] of state.locks.entries()) {
      const item=lock.virtual ? freeTime(lock.role) : byId.get(lock.itemId);
      if (!item || usedIds.has(item.id)) continue;
      const start=lock.start ?? earliestFit(item,blocks,item.preferredStart ?? DAY_START);
      if (start==null) continue;
      const block=createBlock(item,start,{uid,locked:true,source:'user',duration:lock.duration});
      if (freeInterval(block,blocks)) {blocks.push(block);usedIds.add(item.id);usedRoles.add(role(item));if(group(item))usedGroups.add(group(item));}
    }
    const target=anchor?.dayWeight==='full'?2:state.pace==='aktiv'?6:state.pace==='balanceret'?5:4;
    while(blocks.length<target) {
      const previous=[...blocks].sort((a,b)=>a.end-b.end).at(-1)?.item;
      const ranked=items.filter(i=>!usedIds.has(i.id)&&!i.hiddenFromSuggestions&&roleAllowed(i,usedRoles,usedGroups)).map(item=>({item,value:score(item,{previous,anchor})})).sort((a,b)=>b.value-a.value);
      let placed=false;
      for(const {item} of ranked) {
        const start=earliestFit(item,blocks,item.preferredStart ?? DAY_START);
        if(start==null) continue;
        const block=createBlock(item,start);
        if(!freeInterval(block,blocks)) continue;
        blocks.push(block);usedIds.add(item.id);usedRoles.add(role(item));if(group(item))usedGroups.add(group(item));placed=true;break;
      }
      if(!placed) break;
    }
    state.plan=blocks.sort((a,b)=>a.start-b.start);
  }

  const previousBlock = block => {const i=state.plan.findIndex(b=>b.uid===block.uid);return i>0?state.plan[i-1]:null;};
  const nextBlock = block => {const i=state.plan.findIndex(b=>b.uid===block.uid);return i>=0?state.plan[i+1]:null;};

  function alternatives(block) {
    const targetRole=role(block.item);
    const compatible = item => item.id!==block.item.id && (
      role(item)===targetRole || item.replaces?.includes(targetRole) || block.item.allowedReplacementRoles?.includes(role(item))
    );
    const result=items.filter(compatible).map(candidate=>{
      const prev=previousBlock(block), next=nextBlock(block);
      const earliest=Math.max(windows(candidate)[0].start,prev?prev.end+travel(prev.item.location,candidate.location):DAY_START);
      const latest=next?next.start-travel(candidate.location,next.item.location):DAY_END;
      const len=Math.min(duration(candidate),Math.max(minDuration(candidate),latest-earliest));
      const fit=latest>earliest && fitsWindow(candidate,earliest,len);
      return {candidate,fit,value:score(candidate,{previous:prev?.item})+(fit?5:-20)};
    }).filter(x=>x.fit).sort((a,b)=>b.value-a.value).slice(0,5).map(x=>x.candidate);
    return [...result,freeTime(targetRole)];
  }

  function replaceBlock(uid,itemId) {
    const current=state.plan.find(b=>b.uid===uid);
    const replacement=itemId.startsWith('free-')?freeTime(role(current?.item)):byId.get(itemId);
    if(!current||!replacement)return;
    snapshotForUndo();
    const prev=previousBlock(current), next=nextBlock(current);
    const earliest=Math.max(windows(replacement)[0].start,prev?prev.end+travel(prev.item.location,replacement.location):DAY_START);
    const latest=next?next.start-travel(replacement.location,next.item.location):DAY_END;
    const len=Math.min(duration(replacement),Math.max(minDuration(replacement),latest-earliest));
    const start=fitsWindow(replacement,earliest,len)?earliest:current.start;
    state.locks.set(uid,{itemId:replacement.id,virtual:Boolean(replacement.virtual),role:role(replacement),start,duration:len});
    if(current.source==='anchor') state.anchor=replacement.virtual?null:replacement.id;
    state.replacements++;
    compose();
    window.CasaJourneyLearning?.record?.('replacement_selected',{domain:source.domain,itemId:current.item.id,replacementId:replacement.id,anchorId:state.anchor,planIds:planIds()});
  }

  function toggleLock(uid) {
    const block=state.plan.find(b=>b.uid===uid); if(!block)return;
    snapshotForUndo();
    if(state.locks.has(uid)) state.locks.delete(uid);
    else state.locks.set(uid,{itemId:block.item.id,virtual:Boolean(block.item.virtual),role:role(block.item),start:block.start,duration:block.duration});
    compose();
  }

  function tripBreakdown(block) {
    if(!block.item.tripContainer)return '';
    const eachWay=travel(source.baseLocation,block.item.location);
    const arrival=block.start+eachWay, departure=block.end-eachWay;
    return `<div class="journey-trip-breakdown" aria-label="Turens tidsforløb"><span><b>${clock(block.start)}</b> Afgang</span><span><b>${clock(arrival)}</b> I ${block.item.locationLabel}</span><span><b>${clock(departure)}</b> Kør hjem</span><span><b>${clock(block.end)}</b> Retur</span></div>`;
  }
  function transportLabel(block,index) {
    if(!index||block.item.tripContainer)return '';
    const previous=state.plan[index-1], minutes=travel(previous.item.location,block.item.location);
    return minutes?`<span class="journey-travel">↳ ca. ${minutes} min. transport</span>`:'';
  }

  function render() {
    compose();
    root.querySelector('[data-plan-profile]').textContent=`${labels[state.pace]} dag · ${labels[state.interest]}`;
    timeline.innerHTML=state.plan.map((block,index)=>{
      const locked=state.locks.has(block.uid)||block.source==='anchor';
      return `<li data-journey-block="${block.uid}" data-journey-item="${block.item.id}"><time><strong>${clock(block.start)}</strong><span>${clock(block.end)}</span></time><div class="journey-item-copy">${transportLabel(block,index)}<strong>${block.item.title}</strong><p>${block.item.summary}</p>${tripBreakdown(block)}<div class="journey-meta"><span>${block.duration} min.</span><span>${block.item.locationLabel??block.item.location}</span><span>${block.participants.includes('all')?'Hele gruppen':'Kan deles'}</span></div><div class="journey-item-actions"><button type="button" class="journey-replace" data-replace-block="${block.uid}">Skift eller vælg fri tid</button><button type="button" class="journey-lock" data-lock-block="${block.uid}" aria-pressed="${locked}">${locked?'Fast i planen':'Lås tidspunkt'}</button></div><div class="journey-alternatives" data-alternatives="${block.uid}" hidden></div></div></li>`;
    }).join('');
    const anchor=state.anchor?byId.get(state.anchor):null;
    root.querySelector('[data-plan-summary]').textContent=anchor?.dayWeight==='full'?'Hovedoplevelsen er fastholdt. Transport ud og hjem indgår i blokken, og resten af dagen planlægges omkring den.':'Planen bruger én valgmulighed pr. måltidsrolle, fleksible blokke, åbningstider og transport.';
    const undo=root.querySelector('[data-plan-undo]'); if(undo)undo.disabled=state.history.length===0;
  }

  function showAlternatives(uid) {
    const host=root.querySelector(`[data-alternatives="${uid}"]`), block=state.plan.find(b=>b.uid===uid); if(!host||!block)return;
    host.innerHTML=alternatives(block).map(item=>`<button type="button" data-use-alternative="${item.id}" data-target-block="${uid}"><strong>${item.title}</strong><span>${item.summary}</span><small>${duration(item)} min. · ${item.locationLabel??item.location}</small></button>`).join('');
    host.hidden=!host.hidden;
  }

  root.addEventListener('click',event=>{
    const pace=event.target.closest('[data-planner-pace]'),interest=event.target.closest('[data-planner-interest]'),replace=event.target.closest('[data-replace-block]'),alternative=event.target.closest('[data-use-alternative]'),destination=event.target.closest('[data-journey-anchor]'),lock=event.target.closest('[data-lock-block]');
    if(pace){snapshotForUndo();state.pace=pace.dataset.plannerPace;root.querySelectorAll('[data-planner-pace]').forEach(b=>{const on=b===pace;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});render();}
    if(interest){snapshotForUndo();state.interest=interest.dataset.plannerInterest;root.querySelectorAll('[data-planner-interest]').forEach(b=>{const on=b===interest;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});render();}
    if(destination){snapshotForUndo();state.anchor=destination.dataset.journeyAnchor||null;root.querySelectorAll('[data-journey-anchor]').forEach(b=>b.classList.toggle('active',b===destination));render();window.CasaJourneyLearning?.record?.('anchor_selected',{domain:source.domain,anchorId:state.anchor,itemId:state.anchor,planIds:planIds()});}
    if(replace)showAlternatives(replace.dataset.replaceBlock);
    if(alternative){replaceBlock(alternative.dataset.targetBlock,alternative.dataset.useAlternative);render();root.querySelector('[data-plan-feedback]').textContent='Dit valg er fastholdt. Kun nødvendige tider er opdateret.';}
    if(lock){toggleLock(lock.dataset.lockBlock);render();}
  });

  root.querySelector('[data-plan-undo]')?.addEventListener('click',()=>{const previous=state.history.pop();if(!previous)return;hydratePlan(previous);render();root.querySelector('[data-plan-feedback]').textContent='Den seneste ændring er fortrudt.';});
  root.querySelector('[data-plan-copy]')?.addEventListener('click',async()=>{const text=[`${labels[state.pace]} dag · ${labels[state.interest]}`,...state.plan.map(b=>`${clock(b.start)}–${clock(b.end)} – ${b.item.title}: ${b.item.summary}`)].join('\n');const feedback=root.querySelector('[data-plan-feedback]');try{await navigator.clipboard.writeText(text);feedback.textContent='Dagsplanen er kopieret.';window.CasaJourneyLearning?.record?.('plan_copied',{domain:source.domain,anchorId:state.anchor,planIds:planIds()});}catch{feedback.textContent='Markér og kopiér planen manuelt.';}});

  render();
  window.CasaJourneyPlanner=Object.freeze({version:'3.0.0',domain:source.domain,snapshot:()=>({pace:state.pace,interest:state.interest,anchor:state.anchor,replacements:state.replacements,plan:state.plan.map(b=>({id:b.item.id,uid:b.uid,start:b.start,end:b.end,duration:b.duration,role:role(b.item),locked:state.locks.has(b.uid)||b.source==='anchor',participants:[...b.participants]})),contentItems:items.length})});
  document.documentElement.dataset.journeyPlanner='3.0.0';
})();
