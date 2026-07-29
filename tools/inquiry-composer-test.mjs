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
  ['mailprogram label is explicit', html.includes('Åbn mailprogram')],
  ['completion view exists', html.includes('data-inquiry-completion')],
  ['completion close action exists', html.includes('data-inquiry-completion-close') && html.includes('Luk vindue')],
  ['script loaded', html.includes('/core/casa-inquiry-composer.js?v=20260724.194')],
  ['date order validation', js.includes('new Date(departure) > new Date(arrival)')],
  ['mail client handoff', js.includes('window.location.href = createMailto()')],
  ['mail handoff is described honestly', js.includes('Hjemmesiden kan ikke se, om mailen bliver sendt.')],
  ['clipboard fallback', js.includes('navigator.clipboard.writeText')],
  ['copy completion guidance', js.includes('WhatsApp eller en anden besked')],
  ['completion focus management', js.includes('completionClose?.focus()')],
  ['enter key protection', js.includes("event.key === 'Enter'")],
  ['focus restoration', js.includes('lastFocused?.focus?.()')],
  ['escape/cancel handling', js.includes("dialog.addEventListener('cancel'")]
];

for (const [name, result] of checks) assert.equal(result, true, name);
console.log(`Inquiry composer: ${checks.length} checks passed.`);
