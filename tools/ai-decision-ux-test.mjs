import fs from 'node:fs';
const root=new URL('../',import.meta.url),read=p=>fs.readFileSync(new URL(p,root),'utf8');
const html=read('asset-intelligence.html');
for(const marker of ['Godkend og gem','Redigér først','Ikke nu','Afvis forslag','AI foreslår','Vælg én handling','recordDecision'])if(!html.includes(marker))throw new Error(`Missing AI Decision UX marker: ${marker}`);
if((html.match(/class="button primary"/g)||[]).length<1)throw new Error('No primary CTA');
if(!html.includes("recordDecision('approved'")||!html.includes("recordDecision('edit'")||!html.includes("recordDecision('postponed'")||!html.includes("recordDecision('rejected'"))throw new Error('Decision outcomes are incomplete');
if(html.includes('Forslag til alt-tekst for'))throw new Error('Meta wording leaked into proposed alt text');
if(!html.includes('CasaAssetIntelligence.saveAltText'))throw new Error('Approve and save does not use governed persistence API');
console.log('AI Decision UX: 12 kontroller bestået');
