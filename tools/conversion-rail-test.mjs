import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync('index.html', 'utf8');
const js = fs.readFileSync('core/casa-conversion-rail.js', 'utf8');

assert.match(html, /data-conversion-rail/, 'conversion rail must be rendered');
assert.match(html, /data-conversion-action/, 'conversion action must exist');
assert.match(html, /data-conversion-dismiss/, 'desktop dismiss control must exist');
assert.match(html, /href="#kontakt"/, 'conversion action must target contact section');
assert.match(html, /aria-label="Kontakt Casa Amar om ledige datoer"/, 'rail must have an accessible label');
assert.match(html, /@media\(min-width:761px\)/, 'desktop layout must be explicit');
assert.match(html, /@media\(max-width:760px\)/, 'mobile layout must be explicit');
assert.match(html, /\.casa-ai-launcher\{bottom:96px\}/, 'desktop rail must reserve space for AI launcher');
assert.match(html, /\.casa-ai-launcher\{bottom:88px\}/, 'mobile rail must reserve space for AI launcher');
assert.match(js, /sessionStorage/, 'dismissal must be session-scoped');
assert.match(js, /matchMedia\('\(min-width: 761px\)'\)/, 'behaviour must follow responsive breakpoint');
assert.match(js, /rail\.hidden = desktop\.matches && isDismissed\(\)/, 'mobile rail must remain available even after desktop dismissal');
console.log('Conversion rail test passed (12 assertions).');
