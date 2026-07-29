import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let passed = 0;
const fail = message => { console.error(`FAIL ${message}`); process.exit(1); };
const check = (condition, message) => { if (!condition) fail(message); passed += 1; };
const json = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const text = file => fs.readFileSync(path.join(root, file), 'utf8');

const platform = json('platform-manifest.json');
const deployment = json('deployment-manifest.json');
const validation = json('release-validation.json');
const governance = json('release-governance.json');
const gate = json('release-quality-gate.json');
const notes = json('release-notes.json');
const packageJson = json('package.json');
const config = json('config/configuration-manifest.json');
const roadmap = json('platform/brain/roadmap.json');
const repository = json('registry/repository.json');
const worker = text('_worker.js');

const canonicalRelease = notes.release;
const canonicalName = notes.release_name;
const canonicalBuild = notes.build;
const packageVersion = canonicalRelease.replace(/^v/, '').replace(/^(\d{4})\.0?(\d+)\.0?(\d+)\./, '$1.$2.$3-');

check(/^v\d{4}\.\d{2}\.\d{2}\.\d+$/.test(canonicalRelease), 'Canonical release must use vYYYY.MM.DD.N format');
check(notes.platform_version === canonicalRelease, 'Release notes platform version must match release');
check(notes.name === canonicalName && notes.title === canonicalName, 'Release notes names must be internally consistent');
check(platform.platform_version === canonicalRelease, 'Platform manifest release mismatch');
check(platform.release_name === canonicalName, 'Platform manifest release name mismatch');
check(platform.build === canonicalBuild && platform.generated_at === canonicalBuild, 'Platform manifest build timestamps mismatch');
check(deployment.release === canonicalRelease && deployment.platform_version === canonicalRelease, 'Deployment manifest identity mismatch');
check(validation.release === canonicalRelease && validation.platform_version === canonicalRelease, 'Release validation identity mismatch');
check(governance.release === canonicalRelease && governance.platform_version === canonicalRelease, 'Release governance identity mismatch');
check(gate.release === canonicalRelease && gate.platform_version === canonicalRelease, 'Quality gate identity mismatch');
check(config.platform_version === canonicalRelease, 'Configuration manifest identity mismatch');
check(roadmap.current_release === canonicalRelease && roadmap.platform_version === canonicalRelease, 'Roadmap current identity mismatch');
check(repository.release === canonicalRelease && repository.platform_version === canonicalRelease, 'Repository registry identity mismatch');
check(packageJson.version === packageVersion, `Package version ${packageJson.version} must match ${packageVersion}`);
check(worker.includes(`platform_version: "${canonicalRelease}"`), 'Worker platform identity mismatch');
check(worker.includes(`worker_version: "${platform.worker_version}"`), 'Worker version must match platform manifest');
check(!worker.includes('15.55-guided-work-completion'), 'Stale worker version remains');
check(!text('platform-manifest.json').includes('Governed AI Learning Engine'), 'Stale release name remains in platform manifest');

for (const file of ['deployment-manifest.json', 'release-validation.json', 'release-governance.json', 'release-quality-gate.json']) {
  const data = json(file);
  check(data.generated_at === canonicalBuild || data.updated_at === canonicalBuild, `${file} timestamp must align with canonical build`);
}

console.log(`Release semantic consistency tests: ${passed} passed, 0 failed`);
