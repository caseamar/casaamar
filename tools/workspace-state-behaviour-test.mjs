import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../core/casa-workspace-state.js',import.meta.url),'utf8');
class Storage{constructor(){this.m=new Map()}getItem(k){return this.m.has(k)?this.m.get(k):null}setItem(k,v){this.m.set(k,String(v))}removeItem(k){this.m.delete(k)}}
const listeners={window:{},document:{}};const storage=new Storage();let pathname='/control/';let scrollY=1420;let navType='navigate';
const active={id:'workspace-recommendations',getAttribute:n=>n==='href'?'/recommendation-engine.html':null,closest(){return this}};
const makeContext=()=>{
 const context={console,URL,Date,JSON,Math,setTimeout:(fn)=>{fn();return 1},clearTimeout(){},requestAnimationFrame:fn=>fn(),CustomEvent:class{constructor(type,opts){this.type=type;this.detail=opts?.detail}},CSS:{escape:s=>s},sessionStorage:storage,performance:{getEntriesByType:()=>[{type:navType}]}};
 context.location={get pathname(){return pathname},hash:'',href:'https://example.test'+pathname,origin:'https://example.test'};context.history={scrollRestoration:'auto'};
 context.document={referrer:'',activeElement:active,documentElement:{scrollHeight:4000},getElementById:()=>active,querySelector:()=>active,addEventListener:(t,f)=>(listeners.document[t]??=[]).push(f)};
 context.window=context;context.innerHeight=900;context.scrollX=0;Object.defineProperty(context,'scrollY',{get:()=>scrollY});context.scrollTo=({top})=>{scrollY=top};context.addEventListener=(t,f)=>(listeners.window[t]??=[]).push(f);context.dispatchEvent=()=>{};context.CasaCore=null;
 return vm.createContext(context);
};
const ctx=makeContext();vm.runInContext(source,ctx,{filename:'casa-workspace-state.js'});
const click=href=>{const link={href:'https://example.test'+href,target:'',getAttribute:n=>n==='href'?href:null,closest(){return this},id:'return-link'};for(const f of listeners.document.click||[])f({target:link,metaKey:false,ctrlKey:false,shiftKey:false,altKey:false})};
click('/recommendation-engine.html');
let tx=ctx.CasaWorkspaceState.readTransaction();
if(tx.origin!=='/control/'||tx.destination!=='/recommendation-engine.html'||tx.scrollY!==1420)throw new Error('origin state was not captured');
pathname='/recommendation-engine.html';ctx.location.href='https://example.test'+pathname;scrollY=0;
click('/control/');
tx=ctx.CasaWorkspaceState.readTransaction();
if(tx.origin!=='/control/'||tx.destination!=='/recommendation-engine.html'||tx.status!=='returning')throw new Error('return click overwrote origin transaction');
pathname='/control/';ctx.location.href='https://example.test'+pathname;navType='navigate';scrollY=0;
// Real browsers may emit an initial scroll event at the top before restoration.
for(const f of listeners.window.scroll||[])f();
if(!ctx.CasaWorkspaceState.restore())throw new Error('explicit return was not eligible for restoration');
if(Math.abs(scrollY-1420)>1)throw new Error(`scroll restoration failed: ${scrollY}`);
if(ctx.CasaWorkspaceState.readTransaction()!==null)throw new Error('transaction was not cleared after restoration');
// A fresh direct visit must not restore stale state.
pathname='/control/';scrollY=300;ctx.CasaWorkspaceState.beginNavigation('/asset-intelligence.html',active);pathname='/control/';scrollY=0;navType='navigate';
if(ctx.CasaWorkspaceState.shouldRestore())throw new Error('fresh direct navigation incorrectly restores state');

// Normal return-link navigation must restore via referrer even without an explicit returning status.
pathname='/control/';scrollY=980;navType='navigate';ctx.document.referrer='';ctx.CasaWorkspaceState.beginNavigation('/recommendation-engine.html',active);
pathname='/control/';scrollY=0;ctx.document.referrer='https://example.test/recommendation-engine.html';
if(!ctx.CasaWorkspaceState.shouldRestore())throw new Error('referrer-based return was not eligible for restoration');
if(!ctx.CasaWorkspaceState.restore()||Math.abs(scrollY-980)>1)throw new Error('referrer-based restoration failed');

for(const page of ['recommendation-engine.html','release-governance.html','asset-intelligence.html','knowledge-graph.html','experience-engine.html','content-studio.html']){
 const html=fs.readFileSync(new URL('../'+page,import.meta.url),'utf8');
 if(!html.includes('/core/casa-workspace-state.js?v=20260724.141'))throw new Error(page+' does not load workspace state manager');
}
console.log('Workspace state behaviour test: 15 passed, 0 failed');
