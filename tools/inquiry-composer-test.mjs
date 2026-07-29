import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const js = fs.readFileSync(new URL('../core/casa-inquiry-composer.js', import.meta.url), 'utf8');

const checks = [
  ['dialog exists', html.includes('data-inquiry-dialog')],
  ['rail opens dialog', html.includes('data-conversion-action data-inquiry-open')],
  ['contact CTA opens dialog', /button button-primary[^>]+data-inquiry-open/.test(html)],
  ['date fields exist', html.includes('name="arrival"') && html.includes('name="departure"')],
  ['guest field exists', html.includes('name="guests"')],
  ['privacy statement exists', html.includes('Oplysningerne gemmes ikke på hjemmesiden.')],
  ['script loaded', html.includes('/core/casa-inquiry-composer.js?v=20260724.192')],
  ['date order validation', js.includes('new Date(departure) > new Date(arrival)')],
  ['mail client handoff', js.includes('window.location.href = createMailto()')],
  ['clipboard fallback', js.includes('navigator.clipboard.writeText')],
  ['focus restoration', js.includes('lastFocused?.focus?.()')],
  ['escape/cancel handling', js.includes("dialog.addEventListener('cancel'")]
];

for (const [name, result] of checks) assert.equal(result, true, name);
console.log(`Inquiry composer: ${checks.length} checks passed.`);
