(() => {
  const rail = document.querySelector('[data-conversion-rail]');
  if (!rail) return;

  const dismiss = rail.querySelector('[data-conversion-dismiss]');
  const action = rail.querySelector('[data-conversion-action]');
  const storageKey = 'casa-amar:conversion-rail:dismissed';
  const desktop = window.matchMedia('(min-width: 761px)');

  const isDismissed = () => {
    try { return sessionStorage.getItem(storageKey) === '1'; } catch (_) { return false; }
  };

  const syncVisibility = () => {
    rail.hidden = desktop.matches && isDismissed();
  };

  dismiss?.addEventListener('click', () => {
    try { sessionStorage.setItem(storageKey, '1'); } catch (_) {}
    rail.hidden = true;
  });

  action?.addEventListener('click', () => {
    try { sessionStorage.removeItem(storageKey); } catch (_) {}
  });

  desktop.addEventListener?.('change', syncVisibility);
  syncVisibility();
})();
