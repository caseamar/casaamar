import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const signals = fs.readFileSync(new URL('../core/casa-public-journey-signals.js', import.meta.url), 'utf8');
const inquiry = fs.readFileSync(new URL('../core/casa-inquiry-composer.js', import.meta.url), 'utf8');

const checks = [
  ['signal module is loaded before inquiry composer', html.indexOf('casa-public-journey-signals.js') < html.indexOf('casa-inquiry-composer.js')],
  ['signal module has no storage persistence', !signals.includes('localStorage') && !signals.includes('sessionStorage')],
  ['signal payload excludes form fields', !signals.includes('arrival') && !signals.includes('departure') && !signals.includes('guests') && !signals.includes('name') && !signals.includes('stay')],
  ['signal contract declares no personal data', signals.includes("personal_data: false")],
  ['inquiry open is observed', inquiry.includes("signal('inquiry.opened'")],
  ['inquiry close is observed', inquiry.includes("signal('inquiry.closed'")],
  ['validation failure is observed', inquiry.includes("signal('inquiry.validation_failed'")],
  ['mail handoff is observed', inquiry.includes("signal('inquiry.mail_handoff_started'")],
  ['clipboard success is observed', inquiry.includes("signal('inquiry.clipboard_handoff_completed'")],
  ['clipboard failure is observed', inquiry.includes("signal('inquiry.clipboard_handoff_failed'")],
  ['source attribution exists', signals.includes("conversion-rail") && signals.includes("contact-section") && signals.includes("hero")],
  ['bounded in-memory history exists', signals.includes('MAX_HISTORY = 100')],
  ['snapshot exposes aggregate counters', signals.includes('counts') && signals.includes('event_count')]
];

for (const [name, result] of checks) assert.equal(result, true, name);
console.log(`Public journey signals: ${checks.length} checks passed.`);
