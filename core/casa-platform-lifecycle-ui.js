/** Platform Lifecycle UI 1.0.1 — explicit, testable DOM bindings. */
(()=>{'use strict';
 const byId=id=>document.getElementById(id);
 const refs={chain:byId('chain'),summary:byId('summary'),stages:byId('stages'),implementation:byId('implementation'),improvement:byId('improvement'),complete:byId('complete'),next:byId('next'),feedback:byId('feedback')};
 function requireRefs(){for(const [name,node] of Object.entries(refs))if(!node)throw new Error(`Lifecycle UI missing element: ${name}`)}
 function feedback(message,type='success'){refs.feedback.textContent=message;refs.feedback.dataset.type=type;refs.feedback.hidden=false}
 function setBusy(busy){[refs.implementation,refs.improvement,refs.complete].forEach(button=>button.disabled=busy)}
 async function render(){await window.CasaPlatformOrchestrator.load();const s=window.CasaPlatformOrchestrator.snapshot();refs.chain.innerHTML=s.valueChain.map(x=>`<div class="node">${x}</div>`).join('');refs.summary.innerHTML=`<p><strong>${s.journey.display_name}</strong><br>${s.journey.purpose}</p>`;refs.stages.innerHTML=s.journey.stages.map(x=>`<div class="node ${x.id===s.stage.id?'active':''}"><strong>${x.display_name}</strong><p>${x.outcome}</p><small>${x.capabilities.join(' · ')}</small></div>`).join('');refs.next.href=s.nextAction.href;refs.next.textContent=`Åbn næste handling: ${s.nextAction.title}`;refs.complete.disabled=s.state.status==='completed';return s}
 async function run(action,success){setBusy(true);try{action();const s=await render();feedback(success(s));return s}catch(error){console.error(error);feedback(`Handlingen kunne ikke gennemføres: ${error.message}`,'error');throw error}finally{setBusy(false)}}
 async function init(){requireRefs();refs.implementation.addEventListener('click',()=>run(()=>window.CasaPlatformOrchestrator.start('implementation','demo'),s=>`Implementeringsrejsen er startet ved ${s.stage.display_name}.`));refs.improvement.addEventListener('click',()=>run(()=>window.CasaPlatformOrchestrator.start('continuous-improvement','observe'),s=>`Forbedringsloopet er startet ved ${s.stage.display_name}.`));refs.complete.addEventListener('click',()=>run(()=>window.CasaPlatformOrchestrator.completeStage('Manuelt accepteret i lifecycle-visningen'),s=>s.state.status==='completed'?'Rejsen er gennemført.':`Trinnet er gennemført. Næste trin er ${s.stage.display_name}.`));await render()}
 window.CasaPlatformLifecycleUI={init,render,refs};
 document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>init().catch(()=>{}),{once:true}):init().catch(()=>{});
})();
