/** Generic Journey Planner Engine 1.0 — domain content is injected separately. */
(() => {
  'use strict';
  const root=document.querySelector('[data-stay-planner]');
  const source=window.CasaJourneyContent;
  if(!root||!source?.items?.length)return;
  const items=source.items;
  const timeline=root.querySelector('[data-plan-timeline]');
  const labels={rolig:'Rolig',balanceret:'Balanceret',aktiv:'Aktiv',mad:'Mad',strand:'Strand',familie:'Familie',golf:'Golf',kultur:'Kultur'};
  const state={pace:'rolig',interest:'mad',anchor:null,plan:[],replacements:0};
  const paceEnergy={rolig:1,balanceret:2,aktiv:4};
  const clocks=['09.00','11.00','13.30','16.30','20.00'];

  const score=(item,index)=>{
    let value=0;
    if(item.tags.includes(state.interest))value+=7;
    value-=Math.abs(item.energy-paceEnergy[state.pace])*1.4;
    if(index===0&&item.time.includes('morning'))value+=3;
    if(index===2&&(item.type==='meal'||item.time.includes('lunch')))value+=3;
    if(index===4&&item.time.includes('evening'))value+=3;
    if(state.anchor&&item.id===state.anchor)value+=100;
    return value;
  };
  const compatible=(candidate,chosen)=>!chosen.some(item=>item.id===candidate.id||(
    item.exclusive&&candidate.location!=='home'&&!item.pairs?.includes(candidate.id)
  ));
  function compose(){
    const anchor=state.anchor?items.find(x=>x.id===state.anchor):null;
    if(anchor?.exclusive){
      const companion=items.find(x=>anchor.pairs?.includes(x.id)&&x.location==='home');
      state.plan=[anchor,companion].filter(Boolean);
      return;
    }
    const chosen=[];
    for(let slot=0;slot<5;slot++){
      const ranked=items.filter(x=>compatible(x,chosen)).sort((a,b)=>score(b,slot)-score(a,slot));
      const next=ranked[0]; if(next)chosen.push(next);
    }
    state.plan=chosen;
  }
  function alternatives(item){
    return items.filter(candidate=>candidate.id!==item.id&&candidate.type===item.type)
      .sort((a,b)=>score(b,1)-score(a,1)).slice(0,4);
  }
  function render(){
    compose();
    root.querySelector('[data-plan-profile]').textContent=`${labels[state.pace]} dag · ${labels[state.interest]}`;
    timeline.innerHTML=state.plan.map((item,index)=>`<li data-journey-item="${item.id}"><time>${item.exclusive?'Heldag':clocks[Math.min(index,clocks.length-1)]}</time><div class="journey-item-copy"><strong>${item.title}</strong><p>${item.summary}</p><button type="button" class="journey-replace" data-replace="${item.id}">Vis alternativer</button><div class="journey-alternatives" data-alternatives="${item.id}" hidden></div></div></li>`).join('');
    root.querySelector('[data-plan-summary]').textContent=state.plan.some(x=>x.exclusive)?'En stor udflugt giver bedst plads til en rolig aften.':'Planen er sammensat af indhold og relationer i platformen.';
  }
  function showAlternatives(id){
    const host=root.querySelector(`[data-alternatives="${id}"]`); const item=items.find(x=>x.id===id);
    if(!host||!item)return;
    host.innerHTML=alternatives(item).map(alt=>`<button type="button" data-use-alternative="${alt.id}"><strong>${alt.title}</strong><span>${alt.summary}</span></button>`).join('')||'<p>Der er endnu ingen relevante alternativer.</p>';
    host.hidden=!host.hidden;
  }
  root.addEventListener('click',event=>{
    const pace=event.target.closest('[data-planner-pace]');
    const interest=event.target.closest('[data-planner-interest]');
    const replace=event.target.closest('[data-replace]');
    const alternative=event.target.closest('[data-use-alternative]');
    const destination=event.target.closest('[data-journey-anchor]');
    if(pace){state.pace=pace.dataset.plannerPace;root.querySelectorAll('[data-planner-pace]').forEach(b=>{const on=b===pace;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});state.anchor=null;render();}
    if(interest){state.interest=interest.dataset.plannerInterest;root.querySelectorAll('[data-planner-interest]').forEach(b=>{const on=b===interest;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});state.anchor=null;render();}
    if(destination){state.anchor=destination.dataset.journeyAnchor||null;root.querySelectorAll('[data-journey-anchor]').forEach(b=>b.classList.toggle('active',b===destination));render();}
    if(replace)showAlternatives(replace.dataset.replace);
    if(alternative){state.anchor=alternative.dataset.useAlternative;state.replacements++;render();root.querySelector('[data-plan-feedback]').textContent='Planen er opdateret omkring dit valg.';}
  });
  root.querySelector('[data-plan-copy]')?.addEventListener('click',async()=>{const text=[`${labels[state.pace]} dag · ${labels[state.interest]}`,...state.plan.map((x,i)=>`${x.exclusive?'Heldag':clocks[Math.min(i,4)]} – ${x.title}: ${x.summary}`)].join('\n');const f=root.querySelector('[data-plan-feedback]');try{await navigator.clipboard.writeText(text);f.textContent='Dagsplanen er kopieret.';}catch{f.textContent='Markér og kopiér planen manuelt.';}});
  render();
  window.CasaJourneyPlanner=Object.freeze({version:'1.0.0',domain:source.domain,snapshot:()=>({...state,plan:state.plan.map(x=>x.id),contentItems:items.length})});
  document.documentElement.dataset.journeyPlanner='1.0.0';
})();
