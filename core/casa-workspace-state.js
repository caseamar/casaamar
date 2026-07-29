(()=>{
'use strict';
const VERSION='1.6.0';
const RELEASE='v2026.07.24.300';
const KEY='casa:workspace-return:v3';
const MAX_AGE_MS=10*60*1000;
const now=()=>Date.now();
const navType=()=>{try{return performance.getEntriesByType('navigation')[0]?.type||''}catch(_){return ''}};
const readRaw=()=>{try{return JSON.parse(sessionStorage.getItem(KEY)||'null')}catch(_){return null}};
const clear=()=>{try{sessionStorage.removeItem(KEY)}catch(_){}};
const read=()=>{
 const x=readRaw();
 if(!x||x.release!==RELEASE||now()-Number(x.savedAt||0)>MAX_AGE_MS){clear();return null}
 return x;
};
const write=x=>{try{sessionStorage.setItem(KEY,JSON.stringify(x));return true}catch(_){return false}};
const pathOf=value=>{try{return new URL(value,location.href).pathname}catch(_){return ''}};
const selectorFor=el=>{const t=el?.closest?.('a,button,[tabindex]');if(!t)return null;if(t.id)return '#'+CSS.escape(t.id);const href=t.getAttribute?.('href');return href?`a[href="${CSS.escape(href)}"]`:null};
const saveOrigin=(destination,el=document.activeElement)=>{
 if(location.pathname!=='/control/'&&location.pathname!=='/control')return false;
 const destinationPath=pathOf(destination);
 if(!destinationPath||destinationPath.startsWith('/control'))return false;
 return write({schema:'3.0',release:RELEASE,origin:'/control/',destination:destinationPath,scrollX:window.scrollX||0,scrollY:window.scrollY||0,selector:selectorFor(el),savedAt:now(),returnRequested:false});
};
const requestReturn=()=>{
 const state=read();
 if(!state)return false;
 state.returnRequested=true;
 state.returnRequestedAt=now();
 return write(state);
};
const shouldRestore=()=>{
 const state=read();
 if(!state||!location.pathname.startsWith('/control'))return false;
 return state.returnRequested===true;
};
const restore=()=>{
 if(window.__casaWorkspaceRestoreStarted||!shouldRestore())return false;
 const state=read();if(!state)return false;
 window.__casaWorkspaceRestoreStarted=true;
 const target=Math.max(0,Number(state.scrollY)||0);
 const started=now();let lastHeight=-1,stable=0;
 const attempt=()=>{
  const height=document.documentElement.scrollHeight;
  stable=height===lastHeight?stable+1:0;lastHeight=height;
  const maxY=Math.max(0,height-window.innerHeight);
  const desired=Math.min(target,maxY);
  const reachable=maxY>=target-12;
  if(reachable)window.scrollTo({top:desired,left:Number(state.scrollX)||0,behavior:'auto'});
  const reached=reachable&&Math.abs(window.scrollY-desired)<=12;
  if(reached&&stable>=2){
   const el=state.selector?document.querySelector(state.selector):null;el?.focus?.({preventScroll:true});
   clear();
   window.dispatchEvent(new CustomEvent('casa:workspace-state:restored',{detail:{version:VERSION,target}}));
   return;
  }
  if(now()-started<8000){requestAnimationFrame(()=>setTimeout(attempt,100));return}
  document.querySelector('#ai-workspace')?.scrollIntoView({block:'start',behavior:'auto'});
  clear();
  window.dispatchEvent(new CustomEvent('casa:workspace-state:restored',{detail:{version:VERSION,target:'workspace-fallback'}}));
 };
 requestAnimationFrame(()=>setTimeout(attempt,150));
 return true;
};
const isFreshEntry=()=>{
 const type=navType();
 return type==='reload'||type==='navigate';
};
// A normal reload, direct visit, new release or new tab must always start clean.
if(location.pathname.startsWith('/control')&&isFreshEntry()&&!shouldRestore())clear();
if('scrollRestoration' in history)history.scrollRestoration='auto';
document.addEventListener('click',event=>{
 const link=event.target.closest?.('a[href]');if(!link)return;
 let url;try{url=new URL(link.href,location.href)}catch(_){return}
 if(url.origin!==location.origin||link.target==='_blank'||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
 if(location.pathname.startsWith('/control'))saveOrigin(url.href,link);
 else if(url.pathname.startsWith('/control'))requestReturn();
});
addEventListener('pageshow',()=>{if(navType()==='back_forward')return;restore()});
addEventListener('load',()=>setTimeout(restore,150));
window.addEventListener('casa:workspace-state',()=>setTimeout(restore,0));
window.CasaWorkspaceState={version:VERSION,release:RELEASE,saveOrigin,requestReturn,restore,shouldRestore,read,clear};
window.CasaCore?.registerModule?.('workspace-state-manager',{version:VERSION,ready:()=>true,health:()=>({status:'ok',detail:'One-time same-release workspace return restoration available'})});
})();
