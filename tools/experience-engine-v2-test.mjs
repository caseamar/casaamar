import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const engine = fs.readFileSync(path.join(root, 'core/casa-experience-engine-v2.js'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'platform-manifest.json'), 'utf8'));
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

check(html.includes('data-experience-progress'), 'Scroll progress UI is missing');
check(html.includes('data-current-chapter'), 'Current chapter indicator is missing');
check(html.includes('data-back-to-top'), 'Back-to-top action is missing');
check(html.includes('casa-experience-engine-v2.js?v='), 'Experience Engine v2 runtime is not loaded with a release cache key');
check(html.includes('.experience-progress'), 'Experience Engine v2 visual layer is missing');
check(html.includes('@media(prefers-reduced-motion:reduce)'), 'Reduced-motion protection is missing');
check(engine.includes("version: '2.0.0'"), 'Runtime version is not 2.0.0');
check(engine.includes('IntersectionObserver'), 'Section/reveal observer is missing');
check(engine.includes("aria-current"), 'Accessible active navigation is missing');
check(engine.includes('requestAnimationFrame'), 'Scroll work is not animation-frame governed');
check(!engine.includes('localStorage') && !engine.includes('sessionStorage') && !engine.includes('document.cookie'), 'Experience engine must not persist visitor data');
check(manifest.experience_engine?.version === '2.0.0', 'Platform manifest does not register Experience Engine 2.0.0');
check(manifest.public_experience?.experience_engine === '2.0.0', 'Public experience manifest does not activate Experience Engine 2.0.0');

if (failures.length) {
  console.error('Experience Engine v2 Test FAILED');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('Experience Engine v2 VERIFIED: progressive, accessible, responsive and privacy-safe');
