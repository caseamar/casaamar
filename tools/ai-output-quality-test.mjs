import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const code=fs.readFileSync(new URL('../core/casa-ai-output-quality.js',import.meta.url),'utf8');const context={window:{}};vm.createContext(context);vm.runInContext(code,context);const q=context.window.CasaAIOutputQuality;
const bad=['Hero patio asset casa amar hero patio casa amar hero patio ved Casa Amar.','casa amar v2 entre','IMG_2045 final.jpg','Forslag til alt-tekst for billede 7','Casa Amar Casa Amar køkken køkken.'];
for(const text of bad)assert.equal(q.validate(text).status,'failed',`Should reject: ${text}`);
const good='Terrassen ved Casa Amar med siddepladser og plads til afslapning.';assert.equal(q.validate(good).status,'verified');
const known=q.proposeAlt({id:'asset-casa-amar-v2-hero-patio'});assert.equal(known.status,'verified');assert.equal(known.text,good);assert.ok(!/hero|asset|v2/i.test(known.text));
const unknown=q.proposeAlt({id:'unknown'});assert.equal(unknown.status,'manual_review');assert.equal(unknown.text,'');
const snap=q.snapshot();assert.equal(snap.verified,snap.knownAssets);assert.equal(snap.targetStraightThroughApproval,90);
console.log('AI Output Quality: 12 checks passed');
