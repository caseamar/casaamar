/** Platform Lifecycle UI 1.0.2 — visible state, awaited actions and cache-safe runtime. */
(()=>{'use strict';
 const get=id=>document.getElementById(id);
 const refs={chain:get('chain'),summary:get('summary'),status:get('journey-status'),stages:get('stages'),implementation:get('implementation'),improvement:get('improvement'),complete:get('complete'),next:get('next'),feedback:get('feedback')};
 function requireRefs(){for(const [name,node] of Object.entries(refs))if(!node)throw new Error(`Lifecycle UI missing element: ${name}`)}
 function showFeedback(message,type='success'){
   refs.feedback.textContent=message;
   refs.feedback.dataset.type=type;
   refs.feedback.hidden=false;
   sessionStorage.setItem('casa.lifecycle.feedback.v322',JSON.stringify({message,type}));
 }
 function restoreFeedback(){
   try{const value=JSON.parse(sessionStorage.getItem('casa.lifecycle.feedback.v322')||'null');if(value?.message)showFeedback(value.message,value.type)}catch{}
 }
 function setBusy(busy){
   [refs.implementation,refs.improvement,refs.complete].forEach(button=>button.disabled=busy);
   document.body.dataset.lifecycleBusy=busy?'true':'false';
 }
 async function render(){
   await window.CasaPlatformOrchestrator.load();
   const snapshot=window.CasaPlatformOrchestrator.snapshot();
   refs.chain.innerHTML=snapshot.valueChain.map(item=>`<div class="node">${item}</div>`).join('');
   refs.summary.innerHTML=`<p><strong>${snapshot.journey.display_name}</strong><br>${snapshot.journey.purpose}</p>`;
   const stateLabel=snapshot.state.status==='not-started'?'Ikke startet':snapshot.state.status==='completed'?'Gennemført':'Aktiv';
   refs.status.innerHTML=`<strong>${stateLabel}</strong> · ${snapshot.journey.display_name} · ${snapshot.stage.display_name}`;
   refs.stages.innerHTML=snapshot.journey.stages.map(stage=>{
     const active=stage.id===snapshot.stage.id;
     const complete=(snapshot.state.completedStages||[]).includes(stage.id);
     return `<div class="node ${active?'active':''} ${complete?'completed':''}" data-stage-id="${stage.id}"><strong>${stage.display_name}</strong><p>${stage.outcome}</p><small>${stage.capabilities.join(' · ')}</small></div>`;
   }).join('');
   refs.next.href=snapshot.nextAction.href;
   refs.next.textContent=`Åbn næste handling: ${snapshot.nextAction.title}`;
   refs.complete.disabled=snapshot.state.status!=='active';
   return snapshot;
 }
 async function run(action,success){
   setBusy(true);
   try{
     await action();
     const snapshot=await render();
     showFeedback(success(snapshot));
     return snapshot;
   }catch(error){
     console.error(error);
     showFeedback(`Handlingen kunne ikke gennemføres: ${error.message}`,'error');
     return null;
   }finally{setBusy(false)}
 }
 async function init(){
   requireRefs();
   refs.implementation.addEventListener('click',event=>{event.preventDefault();return run(()=>window.CasaPlatformOrchestrator.start('implementation','demo'),snapshot=>`Implementeringsrejsen er startet. Aktivt trin: ${snapshot.stage.display_name}.`)});
   refs.improvement.addEventListener('click',event=>{event.preventDefault();return run(()=>window.CasaPlatformOrchestrator.start('continuous-improvement','observe'),snapshot=>`Forbedringsloopet er startet. Aktivt trin: ${snapshot.stage.display_name}.`)});
   refs.complete.addEventListener('click',event=>{event.preventDefault();return run(()=>window.CasaPlatformOrchestrator.completeStage('Manuelt accepteret i lifecycle-visningen'),snapshot=>snapshot.state.status==='completed'?'Rejsen er gennemført.':`Trinnet er gennemført. Nyt aktivt trin: ${snapshot.stage.display_name}.`)});
   await render();
   restoreFeedback();
 }
 window.CasaPlatformLifecycleUI={init,render,refs};
 document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>init().catch(error=>showFeedback(error.message,'error')),{once:true}):init().catch(error=>showFeedback(error.message,'error'));
})();
