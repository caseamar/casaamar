import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const manifest = JSON.parse(read('platform-manifest.json'));
const html = read('index.html');
const moduleSource = read('core/casa-release-identity.js');
const failures = [];
const check = (value, message) => { if (!value) failures.push(message); };

check(manifest.release_identity, 'platform-manifest.json is missing release_identity');
check(['beta', 'production'].includes(manifest.release_identity?.channel), 'release_identity.channel must be beta or production');
check(typeof manifest.release_identity?.public_badge === 'boolean', 'release_identity.public_badge must be boolean');
check(html.includes('/core/casa-release-identity.js?v=20260724.200'), 'Public website does not load the release identity module for the current release');
check(html.includes('class="dev-badge"') === false, 'Public website must not hard-code beta badge markup');
check(moduleSource.includes("identity.public_badge === true"), 'Release identity module does not explicitly require the badge flag');
check(moduleSource.includes("!== 'production'"), 'Release identity module does not suppress production badges');
check(moduleSource.includes('textContent = manifest.platform_version'), 'Release identity module does not render manifest platform version safely');
check(!moduleSource.includes('innerHTML = `'), 'Release identity module must not interpolate manifest data into innerHTML');

if (manifest.release_identity?.channel === 'beta') {
  check(manifest.release_identity.public_badge === true, 'Beta releases must expose their release identity');
}

if (failures.length) {
  console.error('Release Identity Test FAILED');
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(`Release Identity VERIFIED: ${manifest.platform_version} / ${manifest.release_identity.channel}`);
