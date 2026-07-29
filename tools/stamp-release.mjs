import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = Object.fromEntries(process.argv.slice(2).map(arg => {
  const [key, ...value] = arg.replace(/^--/, '').split('=');
  return [key, value.join('=')];
}));

const version = args.version;
const previous = args.previous;
const releaseName = args.name;
const build = args.build || new Date().toISOString();
if (!version || !previous || !releaseName) {
  console.error('Usage: node tools/stamp-release.mjs --previous=vYYYY.MM.DD.NNN --version=vYYYY.MM.DD.NNN --name="Release name" [--build=ISO]');
  process.exit(1);
}

const compact = value => {
  const match = value.match(/^v(\d{4})\.(\d{2})\.(\d{2})\.(\d{3})$/);
  if (!match) throw new Error(`Unsupported release version: ${value}`);
  return `${match[1]}${match[2]}${match[3]}.${match[4]}`;
};
const packageVersion = value => value.replace(/^v/, '').replace(/^([0-9]{4})\.0?([0-9]+)\.0?([0-9]+)\.([0-9]+)$/, '$1.$2.$3-$4');
const oldCompact = compact(previous);
const newCompact = compact(version);
const oldPackage = packageVersion(previous);
const newPackage = packageVersion(version);
const textExtensions = new Set(['.html', '.js', '.mjs', '.json', '.txt', '.css', '.md', '.xml']);
const excludedDirs = new Set(['.git', 'node_modules']);
const excludedFiles = new Set(['tools/stamp-release.mjs']);
let changedFiles = 0;
let replacements = 0;

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && excludedDirs.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(absolute);
    else updateFile(absolute);
  }
}

function updateFile(absolute) {
  const relative = path.relative(root, absolute).replaceAll('\\', '/');
  if (excludedFiles.has(relative) || !textExtensions.has(path.extname(relative))) return;
  let source = fs.readFileSync(absolute, 'utf8');
  const original = source;
  const replacementsForFile = [
    [previous, version],
    [oldCompact, newCompact],
    [oldPackage, newPackage]
  ];
  for (const [from, to] of replacementsForFile) {
    const count = source.split(from).length - 1;
    if (count > 0) {
      source = source.split(from).join(to);
      replacements += count;
    }
  }
  if (source !== original) {
    fs.writeFileSync(absolute, source);
    changedFiles += 1;
  }
}

walk(root);

const manifestPath = path.join(root, 'platform-manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
manifest.platform_version = version;
manifest.build = build;
manifest.generated_at = build;
manifest.release_name = releaseName;
if (manifest.timestamp_semantics) manifest.timestamp_semantics.build = build;
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

const packagePath = path.join(root, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
packageJson.version = newPackage;
fs.writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);

console.log(`Release stamped: ${previous} -> ${version}`);
console.log(`Release name: ${releaseName}`);
console.log(`Build: ${build}`);
console.log(`Changed files: ${changedFiles}`);
console.log(`Exact replacements: ${replacements}`);
