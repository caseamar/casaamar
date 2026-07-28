(function(g){
"use strict";
const VERSION="1.1.0",REGISTRY="/registry/operations-center.json";let data=null;
const fetchJson=async p=>{const r=await fetch(p,{cache:"no-store"});if(!r.ok)throw new Error(`AI Operations Center kunne ikke indlæses (${r.status})`);return r.json()};
const clone=x=>JSON.parse(JSON.stringify(x));
function validate(d){if(!d?.brief||!d?.scores||!Array.isArray(d.opportunities)||!Array.isArray(d.missions))throw new Error("Operations Center registry er ufuldstændigt");for(const o of d.opportunities){for(const k of ["id","title","why","evidence","confidence","expectedValue","effortMinutes","risk","actor","actionLabel","state"])if(o[k]===undefined)throw new Error(`Opportunity mangler felt: ${k}`);if(!o.evidence.length)throw new Error("Opportunity kræver evidens");if(o.state==="action_required"&&!o.href)throw new Error("Brugerhandling kræver et konkret mål");if(o.state==="completed_automatically"&&o.actor!=="system")throw new Error("Automatisk afsluttet handling skal ejes af systemet");}return true}
async function load(){if(!data)data=await fetchJson(REGISTRY);validate(data);return snapshot()}
function snapshot(){return {...clone(data),version:VERSION}}
function topOpportunity(){if(!data)throw new Error("Operations Center er ikke initialiseret");return clone(data.opportunities.find(x=>x.state==="action_required")||data.opportunities[0])}
function assess(){if(!data)throw new Error("Operations Center er ikke initialiseret");const ambiguous=data.opportunities.filter(x=>x.actionLabel.toLowerCase().includes("accept")||(!x.actor));return {status:ambiguous.length?"incomplete_evidence":"verified",ambiguous:ambiguous.map(x=>x.id),actionRequired:data.opportunities.filter(x=>x.state==="action_required").length,automatic:data.opportunities.filter(x=>x.state==="completed_automatically").length}}
g.CasaOperationsCenter={VERSION,load,snapshot,topOpportunity,assess,validate};
})(globalThis);