import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const notes = JSON.parse(fs.readFileSync(path.join(root, 'release-notes.json'), 'utf8'));
let passed = 0;
const fail = message => { console.error(`FAIL Public Experience: ${message}`); process.exit(1); };
const check = (condition, message) => { if (!condition) fail(message); passed += 1; };

const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
const hashLinks = [...html.matchAll(/href="#([^"]+)"/g)].map(match => match[1]);
const images = [...html.matchAll(/<img\b[^>]*>/g)].map(match => match[0]);
const buttons = [...html.matchAll(/<button\b[^>]*>/g)].map(match => match[0]);
const blankLinks = [...html.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)].map(match => match[0]);

check((html.match(/<h1\b/g) || []).length === 1, 'Public home must have exactly one H1');
check(new Set(ids).size === ids.length && duplicateIds.length === 0, 'IDs must be unique');
check(hashLinks.every(id => ids.includes(id)), 'Every internal hash link must resolve to an element');
check(images.length >= 15, 'Public experience must contain a meaningful image journey');
check(images.filter(tag => !/class=\"lightbox/.test(tag) && !/src=\"\"/.test(tag)).every(tag => /\salt=\"[^\"]+\"/.test(tag)), 'Every content image must have meaningful alt text');
check(buttons.every(tag => /\stype="button"|\stype="submit"/.test(tag)), 'Every button must declare its type');
check(blankLinks.every(tag => /rel="[^"]*noopener/.test(tag)), 'Every target=_blank link must use noopener');
check(/25 minutter fra Málaga Lufthavn/.test(html), 'Airport proximity must be visible in the first screen');
check(/3 km fra stranden/.test(html), 'Beach distance must be visible in the first screen');
check(/class="hero-proof"/.test(html), 'Hero location proof must exist');
check(/data-conversion-rail/.test(html), 'Responsive conversion rail must exist');
check(/class="conversion-rail-action" href="#kontakt"/.test(html), 'Conversion rail action must resolve to contact');
check(!/class="dev-badge"/.test(html), 'Development badge must not be exposed on the public site');
check(/class="release-meta"[^>]*hidden/.test(html), 'Runtime release metadata must remain available without visual noise');
check(/mailto:Larsenmichael@hotmail\.com/.test(html), 'Primary email contact route must exist');
check(/https:\/\/m\.me\/michael\.larsen\.5855/.test(html), 'Messenger contact route must exist');
check(/aria-modal="true"[^>]*role="dialog"/.test(html), 'Gallery lightbox must be exposed as a modal dialog');
check(/aria-controls="main-nav"/.test(html) && /id="main-nav"/.test(html), 'Mobile menu control must point to navigation');
check(/<label[^>]*for="casa-ai-question"/.test(html), 'AI question input must have a label');
check(!/(TODO|FIXME|Lorem ipsum|placeholder text)/i.test(html), 'No unfinished placeholder content may ship');
check(html.includes(`meta content="${notes.release}" name="casa-amar-version"`), 'Public version meta must match release identity');
check(html.includes(`data-casa-amar-inline="${notes.release}"`), 'Inline public assets must carry current release identity');
check(/@media\(max-width:760px\)[\s\S]*\.conversion-rail\{left:10px;right:10px;bottom:10px/.test(html), 'Mobile conversion rail must remain responsive and fixed');
check(/@media\(prefers-reduced-motion:reduce\)/.test(html), 'Reduced-motion handling must exist');

console.log(`Public Experience Quality Gate: ${passed} passed, 0 failed`);
