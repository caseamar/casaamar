(()=>{
'use strict';
const VERSION='1.0.0';
const PREFIX='casa:workspace-state:';
const PENDING='casa:workspace-state:pending';
const pageKey=()=>PREFIX+location.pathname;
const save=(reason='navigation')=>{
  try{
    const active=document.activeElement?.closest?.('a,button,[tabindex]');
    sessionStorage.setItem(pageKey(),JSON.stringify({
      pathname:location.pathname,hash:location.hash,scrollX:window.scrollX,scrollY:window.scrollY,
      activeId:active?.id||null,activeHref:active?.getAttribute?.('href')||null,reason,savedAt:Date.now()
    }));
  }catch(_){ }
};
const markPending=()=>{try{sessionStorage.setItem(PENDING,location.pathname)}catch(_){}};
const shouldRestore=()=>{try{return sessionStorage.getItem(PENDING)===location.pathname}catch(_){return false}};
const restore=()=>{
  if(!shouldRestore())return false;
  let state;try{state=JSON.parse(sessionStorage.getItem(pageKey())||'null')}catch(_){return false}
  if(!state)return false;
  let attempts=0;
  const apply=()=>{
    attempts++;
    const maxY=Math.max(0,document.documentElement.scrollHeight-innerHeight);
    const target=Math.min(Number(state.scrollY)||0,maxY);
    window.scrollTo({left:Number(state.scrollX)||0,top:target,behavior:'auto'});
    if(attempts<8 && Math.abs(window.scrollY-target)>4)setTimeout(apply,120);
    else{
      try{sessionStorage.removeItem(PENDING)}catch(_){ }
      const targetEl=state.activeId?document.getElementById(state.activeId):state.activeHref?document.querySelector(`a[href="${CSS.escape(state.activeHref)}"]`):null;
      targetEl?.focus?.({preventScroll:true});
      window.dispatchEvent(new CustomEvent('casa:workspace-state:restored',{detail:{version:VERSION,state}}));
    }
  };
  requestAnimationFrame(()=>setTimeout(apply,80));
  return true;
};
window.addEventListener('scroll',()=>save('scroll'),{passive:true});
window.addEventListener('pagehide',()=>save('pagehide'));
document.addEventListener('click',e=>{
  const link=e.target.closest('a[href]'); if(!link)return;
  let url;try{url=new URL(link.href,location.href)}catch(_){return}
  if(url.origin!==location.origin)return;
  save('link');
  try{sessionStorage.setItem(PENDING,location.pathname)}catch(_){ }
});
window.addEventListener('pageshow',restore);
window.addEventListener('load',()=>setTimeout(restore,150));
window.CasaWorkspaceState={version:VERSION,save,restore,markPending};
window.CasaCore?.registerModule?.('workspace-state-manager',{version:VERSION,ready:()=>true,health:()=>({status:'ok',detail:'Workspace state restore available'})});
})();
