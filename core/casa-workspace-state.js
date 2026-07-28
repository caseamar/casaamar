(()=>{
'use strict';
const VERSION='1.5.0';
const KEY='casa:workspace-return:v2';
const MAX_AGE_MS=30*60*1000;
const now=()=>Date.now();
const read=()=>{try{const x=JSON.parse(sessionStorage.getItem(KEY)||'null');if(!x||now()-x.savedAt>MAX_AGE_MS){sessionStorage.removeItem(KEY);return null}return x}catch(_){return null}};
const write=x=>{try{sessionStorage.setItem(KEY,JSON.stringify(x));return true}catch(_){return false}};
const clear=()=>{try{sessionStorage.removeItem(KEY)}catch(_){}};
const pathOf=value=>{try{return new URL(value,location.href).pathname}catch(_){return ''}};
const selectorFor=el=>{const t=el?.closest?.('a,button,[tabindex]');if(!t)return null;if(t.id)return '#'+CSS.escape(t.id);const href=t.getAttribute?.('href');return href?`a[href="${CSS.escape(href)}"]`:null};
const saveOrigin=(destination,el=document.activeElement)=>{
  if(location.pathname!=='/control/'&&location.pathname!=='/control')return false;
  const destinationPath=pathOf(destination);
  if(!destinationPath||destinationPath.startsWith('/control'))return false;
  return write({schema:'2.0',origin:'/control/',destination:destinationPath,scrollX:window.scrollX||0,scrollY:window.scrollY||0,selector:selectorFor(el),savedAt:now(),returnRequested:false});
};
const requestReturn=()=>{const state=read();if(!state)return false;state.returnRequested=true;state.returnRequestedAt=now();return write(state)};
const navType=()=>{try{return performance.getEntriesByType('navigation')[0]?.type||''}catch(_){return ''}};
const shouldRestore=()=>{
 const state=read(); if(!state||!location.pathname.startsWith('/control'))return false;
 return Boolean(state.returnRequested||location.hash==='#ai-workspace');
};
const restore=()=>{
 if(window.__casaWorkspaceRestoreStarted||!shouldRestore())return false;
 const state=read(); if(!state)return false;
 window.__casaWorkspaceRestoreStarted=true;
 const target=Math.max(0,Number(state.scrollY)||0);
 const started=now(); let lastHeight=-1,stable=0;
 const attempt=()=>{
   const height=document.documentElement.scrollHeight;
   stable=height===lastHeight?stable+1:0; lastHeight=height;
   const maxY=Math.max(0,height-window.innerHeight);
   const reachable=maxY>=target-12;
   if(reachable){window.scrollTo({top:Math.min(target,maxY),left:Number(state.scrollX)||0,behavior:'auto'})}
   const reached=Math.abs(window.scrollY-Math.min(target,maxY))<=12;
   if(reachable&&reached&&stable>=2){
     const el=state.selector?document.querySelector(state.selector):null;el?.focus?.({preventScroll:true});
     clear();window.dispatchEvent(new CustomEvent('casa:workspace-state:restored',{detail:{version:VERSION,target}}));return;
   }
   if(now()-started<8000){requestAnimationFrame(()=>setTimeout(attempt,100));return}
   // Reliable fallback: the workspace section is still better than the top.
   document.querySelector('#ai-workspace')?.scrollIntoView({block:'start',behavior:'auto'});
   clear();window.dispatchEvent(new CustomEvent('casa:workspace-state:restored',{detail:{version:VERSION,target:'workspace-fallback'}}));
 };
 requestAnimationFrame(()=>setTimeout(attempt,150));return true;
};
// Use native browser restoration for browser Back/Forward. Custom code is only for explicit return links.
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
window.CasaWorkspaceState={version:VERSION,saveOrigin,requestReturn,restore,shouldRestore,read};
window.CasaCore?.registerModule?.('workspace-state-manager',{version:VERSION,ready:()=>true,health:()=>({status:'ok',detail:'Native back navigation plus explicit workspace return restoration available'})});
})();
