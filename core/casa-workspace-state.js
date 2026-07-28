(()=>{
'use strict';
const VERSION='1.3.0';
const PREFIX='casa:workspace-state:';
const TRANSACTION_KEY=PREFIX+'return-transaction';
const MAX_AGE_MS=30*60*1000;
const pageKey=pathname=>PREFIX+'page:'+pathname;
const now=()=>Date.now();
const readJson=key=>{try{return JSON.parse(sessionStorage.getItem(key)||'null')}catch(_){return null}};
const writeJson=(key,value)=>{try{sessionStorage.setItem(key,JSON.stringify(value));return true}catch(_){return false}};
const remove=key=>{try{sessionStorage.removeItem(key)}catch(_){}};
const normalizePath=value=>{try{return new URL(value,location.href).pathname}catch(_){return String(value||'')}};
const readTransaction=()=>{
  const tx=readJson(TRANSACTION_KEY);
  if(!tx||!tx.origin||!tx.destination||!tx.savedAt||now()-tx.savedAt>MAX_AGE_MS){remove(TRANSACTION_KEY);return null}
  return tx;
};
const savePageState=(reason='navigation',activeElement=document.activeElement)=>{
  // Initial browser scroll events during a return must never overwrite the authoritative origin snapshot.
  if(window.__casaWorkspaceRestorePending || reason==='scroll' && shouldRestore())return false;
  const active=activeElement?.closest?.('a,button,[tabindex]');
  return writeJson(pageKey(location.pathname),{
    pathname:location.pathname,
    hash:location.hash,
    scrollX:Number(window.scrollX)||0,
    scrollY:Number(window.scrollY)||0,
    activeId:active?.id||null,
    activeHref:active?.getAttribute?.('href')||null,
    reason,
    savedAt:now()
  });
};
const beginNavigation=(destination,activeElement=document.activeElement)=>{
  const destinationPath=normalizePath(destination);
  if(!destinationPath||destinationPath===location.pathname)return false;
  const existing=readTransaction();
  // A return link must never replace the original page and scroll position.
  if(existing&&destinationPath===existing.origin&&location.pathname===existing.destination){
    existing.status='returning';existing.returnRequestedAt=now();writeJson(TRANSACTION_KEY,existing);return true;
  }
  savePageState('navigation',activeElement);
  return writeJson(TRANSACTION_KEY,{
    schema:'1.1',origin:location.pathname,destination:destinationPath,
    scrollX:Number(window.scrollX)||0,scrollY:Number(window.scrollY)||0,
    activeId:activeElement?.closest?.('a,button,[tabindex]')?.id||null,
    activeHref:activeElement?.closest?.('a[href]')?.getAttribute?.('href')||null,
    status:'awaiting-return',savedAt:now()
  });
};
const navigationType=()=>{try{return performance.getEntriesByType('navigation')[0]?.type||''}catch(_){return ''}};
const referrerPath=()=>{try{return document.referrer?new URL(document.referrer,location.href).pathname:''}catch(_){return ''}};
const shouldRestore=()=>{
  const tx=readTransaction();if(!tx||tx.origin!==location.pathname)return false;
  const returnedFromDestination=referrerPath()===tx.destination;
  return tx.status==='returning'||navigationType()==='back_forward'||returnedFromDestination;
};
const restore=()=>{
  if(!shouldRestore())return false;
  const tx=readTransaction();if(!tx)return false;
  // The transaction is the immutable snapshot captured before navigation.
  // A page-state record may already have been rewritten to scrollY=0 during return-page startup.
  const state=tx;
  let attempts=0;
  window.__casaWorkspaceRestorePending=true;
  if('scrollRestoration' in history)history.scrollRestoration='manual';
  const apply=()=>{
    attempts++;
    const maxY=Math.max(0,document.documentElement.scrollHeight-window.innerHeight);
    const target=Math.min(Math.max(0,Number(state.scrollY)||0),maxY);
    window.scrollTo({left:Number(state.scrollX)||0,top:target,behavior:'auto'});
    if(attempts<12&&Math.abs(window.scrollY-target)>6){setTimeout(apply,100);return}
    remove(TRANSACTION_KEY);
    window.__casaWorkspaceRestorePending=false;
    const targetEl=state.activeId?document.getElementById(state.activeId):state.activeHref?document.querySelector(`a[href="${CSS.escape(state.activeHref)}"]`):null;
    targetEl?.focus?.({preventScroll:true});
    window.dispatchEvent(new CustomEvent('casa:workspace-state:restored',{detail:{version:VERSION,state,target,attempts}}));
  };
  requestAnimationFrame(()=>setTimeout(apply,40));
  return true;
};
let scrollTimer=0;
window.addEventListener('scroll',()=>{clearTimeout(scrollTimer);scrollTimer=setTimeout(()=>savePageState('scroll'),80)},{passive:true});
window.addEventListener('pagehide',()=>savePageState('pagehide'));
document.addEventListener('click',event=>{
  const link=event.target.closest?.('a[href]');if(!link)return;
  let url;try{url=new URL(link.href,location.href)}catch(_){return}
  if(url.origin!==location.origin||link.target==='_blank'||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  beginNavigation(url.pathname+url.search+url.hash,link);
});
window.addEventListener('pageshow',restore);
window.addEventListener('load',()=>setTimeout(restore,80));
window.CasaWorkspaceState={version:VERSION,save:savePageState,beginNavigation,restore,shouldRestore,readTransaction};
window.CasaCore?.registerModule?.('workspace-state-manager',{version:VERSION,ready:()=>true,health:()=>({status:'ok',detail:'Transactional workspace return state available'})});
})();
