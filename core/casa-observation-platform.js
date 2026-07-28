(function(g){
"use strict";
const VERSION="1.0.0",REGISTRY="/registry/observation-registry.json";let data=null;
const fetchJson=async p=>{const r=await fetch(p,{cache:"no-store"});if(!r.ok)throw new Error(`Observation Platform kunne ikke indlæses (${r.status})`);return r.json()};
const clone=x=>JSON.parse(JSON.stringify(x));
function validateObservation(o,types){const required=["id","type","schemaVersion","source","category","observedAt","evidence","confidence","severity","status","relations","privacy"];for(const k of required)if(o[k]===undefined)throw new Error(`Observation mangler felt: ${k}`);if(o.schemaVersion!=="1.0")throw new Error("Ukendt observation schema-version");if(!types.some(t=>t.type===o.type))throw new Error(`Uregistreret observationstype: ${o.type}`);if(!Array.isArray(o.evidence)||!o.evidence.length)throw new Error("Observation kræver evidens");if(o.evidence.some(e=>!e.verified))throw new Error("Observation kan ikke valideres med uverificeret evidens");if(typeof o.confidence!=="number"||o.confidence<0||o.confidence>1)throw new Error("Confidence skal være mellem 0 og 1");if(!Array.isArray(o.relations.capabilityIds)||!o.relations.capabilityIds.length)throw new Error("Observation må ikke være orphan");if(Number.isNaN(Date.parse(o.observedAt)))throw new Error("Observation kræver gyldigt timestamp");return true}
function validate(d){if(!d||d.version!==VERSION||!Array.isArray(d.types)||!d.types.length||!d.sample)throw new Error("Observation Registry er ufuldstændigt");validateObservation(d.sample,d.types);return true}
async function load(){if(!data)data=await fetchJson(REGISTRY);validate(data);return snapshot()}
function snapshot(){return {...clone(data),version:VERSION}}
function assess(){if(!data)throw new Error("Observation Platform er ikke initialiseret");const s=data.summary;return {version:VERSION,status:s.status,types:data.types.length,evidenceCoverage:s.evidence_coverage,confidenceCoverage:s.confidence_coverage,orphans:s.orphans,sample:clone(data.sample),because:"Observationer er kontraktstyrede, evidensbaserede og koblet til registrerede capabilities."}}
function create(input){if(!data)throw new Error("Observation Platform er ikke initialiseret");validateObservation(input,data.types);return clone(input)}
g.CasaObservationPlatform={VERSION,load,snapshot,assess,create,validate,validateObservation};
})(globalThis);
