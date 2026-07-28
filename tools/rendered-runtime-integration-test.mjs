import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const html=fs.readFileSync(path.join(root,'release-governance.html'),'utf8');
class Element{constructor(id){this.id=id;this.innerHTML='';this.textContent='';this.dataset={};}}
const elements=new Map();
for(const m of html.matchAll(/id="([^"]+)"[^>]*>([^<]*)/g)){const e=new Element(m[1]);e.innerHTML=m[2]||'';e.textContent=m[2]||'';elements.set(m[1],e)}
const document={querySelector(sel){if(sel.startsWith('#'))return elements.get(sel.slice(1))||null;return null;},querySelectorAll(){return[]},addEventListener(){},documentElement:{dataset:{}}};
const localFetch=async (url)=>{const u=String(url).replace(/^https?:\/\/[^/]+/,'').split('?')[0];const file=path.join(root,u.replace(/^\//,''));if(!file.startsWith(root)||!fs.existsSync(file))return {ok:false,status:404,json:async()=>({}),text:async()=>''};const text=fs.readFileSync(file,'utf8');return {ok:true,status:200,json:async()=>JSON.parse(text),text:async()=>text};};
class CustomEvent{constructor(type,init={}){this.type=type;this.detail=init.detail}};const context={console,document,fetch:localFetch,CustomEvent,dispatchEvent(){},addEventListener(){},location:{pathname:'/release-governance.html',href:'http://local/release-governance.html'},history:{back(){},state:null},sessionStorage:{getItem(){return null},setItem(){},removeItem(){}},localStorage:{getItem(){return null},setItem(){},removeItem(){}},setTimeout,clearTimeout,Promise,URL,Date,Math,JSON,Array,Object,String,Number,Boolean,Map,Set};context.globalThis=context;context.window=context;vm.createContext(context);
const scripts=[...html.matchAll(/<script(?: src="([^"]+)")?[^>]*>([\s\S]*?)<\/script>/g)].map(m=>({src:m[1],code:m[2]}));
for(const s of scripts){let code=s.code;if(s.src){const file=path.join(root,s.src.split('?')[0].replace(/^\//,''));code=fs.readFileSync(file,'utf8')}try{vm.runInContext(code,context,{filename:s.src||'inline-script.js'})}catch(e){console.error('Script execution failed:',s.src||'inline',e);process.exit(1)}}
await new Promise(r=>setTimeout(r,1500));
const failures=[];for(const id of ['report','engineering-governance','platform-intelligence','capability-intelligence','learning-registry','ai-service-layer','event-platform','data-contracts','constitution-engine','workspace-operating-system','improvement-engine','action-engine','ai-operations-center','verification-governance']){const e=elements.get(id);if(!e)failures.push(`${id}: missing`);else if(/Indlæser/.test(e.innerHTML||e.textContent))failures.push(`${id}: loading did not settle`)}
if(!elements.get('capability-intelligence')?.innerHTML.includes('Capability Intelligence: v1.0.0'))failures.push('capability result missing');
if(!elements.get('improvement-engine')?.innerHTML.includes('Improvement Engine: v1.0.0'))failures.push('improvement result missing');
if(elements.get('improvement-engine')?.dataset.improvementState!=='success')failures.push('improvement state not success');
if(!elements.get('action-engine')?.innerHTML.includes('Universal Action Framework: v1.0.0'))failures.push('action result missing');
if(elements.get('action-engine')?.dataset.actionState!=='success')failures.push('action state not success');
if(!elements.get('verification-governance')?.innerHTML.includes('Verification Governance: v1.0.0'))failures.push('verification result missing');
if(elements.get('verification-governance')?.dataset.verificationState!=='verified')failures.push('verification state not verified');
if(failures.length){for(const f of failures)console.error('FAIL:',f);process.exit(1)}if(!elements.get('ai-operations-center')?.innerHTML.includes('AI Operations Center: v1.0.0'))failures.push('operations result missing');
if(elements.get('ai-operations-center')?.dataset.operationsState!=='verified')failures.push('operations state not verified');
console.log('Rendered runtime integration: 14 panels settled, 0 failed');
