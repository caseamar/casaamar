(()=>{
'use strict';
const VERSION='1.4.0';
const PREFIX='casa:workspace-state:';
const TRANSACTION_KEY=PREFIX+'return-transaction';
const MAX_AGE_MS=30*60*1000;
const RESTORE_TIMEOUT_MS=7000;
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
const selectorFor=el=>{
  const target=el?.closest?.('a,button,[tabindex]');
  if(!target)return null;
  if(target.id)return '#'+CSS.escape(target.id);
  const href=target.getAttribute?.('href');
  return href?`a[href="${CSS.escape(href)}"]`:null;
};
const savePageState=(reason='navigation',activeElement=document.activeElement)=>{
  if(window.__casaWorkspaceRestorePending)return false;
  return writeJson(PREFIX+'page:'+location.pathname,{
    pathname:location.pathname,scrollX:Number(scrollX)||0,scrollY:Number(scrollY)||0,
    selector:selectorFor(activeElement),reason,savedAt:now()
  });
};
const beginNavigation=(destination,activeElement=document.activeElement)=>{
  const destinationPath=normalizePath(destination);
  if(!destinationPath||destinationPath===location.pathname)return false;
  const existing=readTransaction();
  if(existing&&destinationPath===existing.origin&&location.pathname===existing.destination){
    existing.status='returning'; existing.returnRequestedAt=now();
    return writeJson(TRANSACTION_KEY,existing);
  }
  savePageState('navigation',activeElement);
  return writeJson(TRANSACTION_KEY,{
    schema:'1.2',origin:location.pathname,destination:destinationPath,
    scrollX:Number(scrollX)||0,scrollY:Number(scrollY)||0,
    selector:selectorFor(activeElement),status:'awaiting-return',savedAt:now()
  });
};
const navigationType=()=>{try{return performance.getEntriesByType('navigation')[0]?.type||''}catch(_){return ''}};
const referrerPath=()=>{try{return document.referrer?new URL(document.referrer,location.href).pathname:''}catch(_){return ''}};
const shouldRestore=()=>{
  const tx=readTransaction(); if(!tx||tx.origin!==location.pathname)return false;
  return tx.status==='returning'||navigationType()==='back_forward'||referrerPath()===tx.destination;
};
const restore=()=>{
  if(window.__casaWorkspaceRestoreStarted||!shouldRestore())return false;
  const tx=readTransaction(); if(!tx)return false;
  window.__casaWorkspaceRestoreStarted=true;
  window.__casaWorkspaceRestorePending=true;
  if('scrollRestoration' in history)history.scrollRestoration='manual';
  const started=now();
  let stableCount=0,lastHeight=-1;
  const finish=(target)=>{
    remove(TRANSACTION_KEY);
    window.__casaWorkspaceRestorePending=false;
    const el=tx.selector?document.querySelector(tx.selector):null;
    el?.focus?.({preventScroll:true});
    window.dispatchEvent(new CustomEvent('casa:workspace-state:restored',{detail:{version:VERSION,state:tx,target}}));
  };
  const apply=()=>{
    const height=document.documentElement.scrollHeight;
    stableCount=height===lastHeight?stableCount+1:0; lastHeight=height;
    const maxY=Math.max(0,height-innerHeight);
    const requested=Math.max(0,Number(tx.scrollY)||0);
    const canReach=maxY>=requested-8;
    const timedOut=now()-started>=RESTORE_TIMEOUT_MS;
    if(!canReach && !timedOut){requestAnimationFrame(()=>setTimeout(apply,100));return}
    const target=Math.min(requested,maxY);
    scrollTo({left:Number(tx.scrollX)||0,top:target,behavior:'auto'});
    const reached=Math.abs(scrollY-target)<=8;
    if((!reached||stableCount<2) && !timedOut){requestAnimationFrame(()=>setTimeout(apply,100));return}
    finish(target);
  };
  requestAnimationFrame(()=>setTimeout(apply,120));
  return true;
};
let scrollTimer=0;
addEventListener('scroll',()=>{if(window.__casaWorkspaceRestorePending)return;clearTimeout(scrollTimer);scrollTimer=setTimeout(()=>savePageState('scroll'),100)},{passive:true});
addEventListener('pagehide',()=>{if(!window.__casaWorkspaceRestorePending)savePageState('pagehide')});
document.addEventListener('click',event=>{
  const link=event.target.closest?.('a[href]'); if(!link)return;
  let url; try{url=new URL(link.href,location.href)}catch(_){return}
  if(url.origin!==location.origin||link.target==='_blank'||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  beginNavigation(url.pathname+url.search+url.hash,link);
});
addEventListener('pageshow',restore);
addEventListener('load',()=>setTimeout(restore,120));
window.CasaWorkspaceState={version:VERSION,save:savePageState,beginNavigation,restore,shouldRestore,readTransaction};
window.CasaCore?.registerModule?.('workspace-state-manager',{version:VERSION,ready:()=>true,health:()=>({status:'ok',detail:'Layout-aware transactional workspace return state available'})});
})();
