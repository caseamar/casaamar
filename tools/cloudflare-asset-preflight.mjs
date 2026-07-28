#!/usr/bin/env node
import { readdir, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';

const root = process.argv[2] || process.cwd();
const LIMIT = 25 * 1024 * 1024;
const ignoredDirs = new Set(['.git', '.github', 'node_modules']);
const ignoredExtensions = new Set([
  '.zip','.7z','.rar','.tar','.gz','.heic','.heif','.tif','.tiff','.psd',
  '.raw','.dng','.cr2','.cr3','.nef','.arw','.orf','.rw2','.raf','.mov','.mp4','.m4v'
]);
const oversized = [];

async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirs.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) await walk(full);
    else if (entry.isFile()) {
      const info = await stat(full);
      const lower = entry.name.toLowerCase();
      const ext = lower.includes('.') ? lower.slice(lower.lastIndexOf('.')) : '';
      if (info.size > LIMIT && !ignoredExtensions.has(ext)) {
        oversized.push({ path: relative(root, full).replaceAll('\\','/'), size: info.size });
      }
    }
  }
}

await walk(root);
if (oversized.length) {
  console.error('Cloudflare asset preflight failed: files exceed the 25 MiB static-asset limit:');
  for (const item of oversized) console.error(`- ${item.path} (${(item.size/1024/1024).toFixed(2)} MiB)`);
  process.exit(1);
}
console.log('Cloudflare asset preflight passed: no deployable file exceeds 25 MiB.');
