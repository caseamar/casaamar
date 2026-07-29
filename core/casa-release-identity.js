/**
 * Casa Amar Platform — Release Identity
 *
 * Renders a non-interactive beta identity badge from platform-manifest.json.
 * The manifest is the single source of truth. Production disables the badge by
 * setting release_identity.public_badge=false or release_identity.channel=production.
 */
(function releaseIdentityBootstrap(global) {
  'use strict';

  const MANIFEST_URL = '/platform-manifest.json';
  const ELEMENT_ID = 'casa-release-identity';

  function shouldRender(identity) {
    return Boolean(
      identity &&
      identity.public_badge === true &&
      String(identity.channel || '').toLowerCase() !== 'production'
    );
  }

  function removeExisting() {
    document.getElementById(ELEMENT_ID)?.remove();
  }

  function render(manifest) {
    const identity = manifest?.release_identity;
    removeExisting();
    if (!shouldRender(identity)) return null;

    const badge = document.createElement('aside');
    badge.id = ELEMENT_ID;
    badge.className = 'dev-badge';
    badge.setAttribute('aria-label', `Udviklingsversion ${manifest.platform_version || ''}`.trim());
    badge.innerHTML = '';

    const label = document.createElement('strong');
    label.textContent = identity.label || 'BETA';

    const version = document.createElement('span');
    version.textContent = manifest.platform_version || 'Version ukendt';

    badge.append(label, version);
    document.body.appendChild(badge);
    return badge;
  }

  async function load(options = {}) {
    const cacheKey = options.cacheKey || document.querySelector('meta[name="casa-amar-version"]')?.content || 'latest';
    const response = await fetch(`${MANIFEST_URL}?identity=${encodeURIComponent(cacheKey)}&ts=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'cache-control': 'no-cache' }
    });
    if (!response.ok) throw new Error(`Release identity manifest returned HTTP ${response.status}`);
    return render(await response.json());
  }

  global.CasaReleaseIdentity = Object.freeze({ load, render, shouldRender, remove: removeExisting });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => load().catch(console.error), { once: true });
  } else {
    load().catch(console.error);
  }
})(window);
