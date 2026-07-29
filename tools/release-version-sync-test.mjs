import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'platform-manifest.json'), 'utf8'));
const expected = manifest.platform_version;
const compactMatch = expected.match(/^v(\d{4})\.(\d{2})\.(\d{2})\.(\d{3})$/);
const expectedCompact = `${compactMatch[1]}${compactMatch[2]}${compactMatch[3]}.${compactMatch[4]}`;
const expectedPackage = expected.replace(/^v/, '').replace(/^([0-9]{4})\.0?([0-9]+)\.0?([0-9]+)\.([0-9]+)$/, '$1.$2.$3-$4');
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

check(packageJson.version === expectedPackage, `package.json version ${packageJson.version} does not match ${expected}`);

const publicHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
check(publicHtml.includes(`<meta content="${expected}" name="casa-amar-version"/>`), 'Public version meta tag is not synchronized');
check(publicHtml.includes(`data-casa-amar-inline="${expected}"`), 'Public inline build marker is not synchronized');
check(publicHtml.includes(`platform-manifest.json?v=${expectedCompact}`), 'Public manifest cache key is not synchronized');
check(publicHtml.includes(`casa-release-identity.js?v=${expectedCompact}`), 'Public release identity asset cache key is not synchronized');

const headers = fs.readFileSync(path.join(root, '_headers'), 'utf8');
check(/(^|\n)\/\n\s+Cache-Control:.*no-store.*no-cache.*must-revalidate.*max-age=0/i.test(headers), 'Root route / must explicitly disable browser and CDN caching');
check(/(^|\n)\/index\.html\n\s+Cache-Control:.*no-store.*no-cache.*must-revalidate.*max-age=0/i.test(headers), '/index.html must explicitly disable browser and CDN caching');
check(headers.includes('Cloudflare-CDN-Cache-Control: no-store'), 'Cloudflare CDN cache control is missing for the public entry document');

const deploymentFiles = ['deployment-manifest.json', 'release-validation.json', 'release-governance.json', 'release-quality-gate.json'];
for (const file of deploymentFiles) {
  const content = fs.readFileSync(path.join(root, file), 'utf8');
  check(content.includes(expected), `${file} does not reference ${expected}`);
}

const forbiddenPrevious = 'v2026.07.24.195';
const forbiddenPreviousCompact = '20260724.195';
const stale = [];
const currentSurfaceFiles = [
  'index.html', 'control/index.html', 'platform-shell.js', '_worker.js',
  'platform-manifest.json', 'deployment-manifest.json', 'release-validation.json',
  'release-governance.json', 'release-quality-gate.json', 'product-manifest.json',
  'asset-manifest.json', 'content-release.json'
];
for (const file of currentSurfaceFiles) {
  const content = fs.readFileSync(path.join(root, file), 'utf8');
  if (content.includes(forbiddenPrevious) || content.includes(forbiddenPreviousCompact)) stale.push(file);
}
check(stale.length === 0, `Previous release identity remains on current deployment surfaces: ${stale.join(', ')}`);

if (failures.length) {
  console.error('Release Version Sync Test FAILED');
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(`Release Version Sync VERIFIED: ${expected} across public and deployment surfaces`);
