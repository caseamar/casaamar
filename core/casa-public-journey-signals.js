(() => {
  'use strict';

  const VERSION = '1.0.0';
  const MAX_HISTORY = 100;
  const history = [];
  const subscribers = new Set();
  const allowedEvents = new Set([
    'inquiry.opened',
    'inquiry.closed',
    'inquiry.validation_failed',
    'inquiry.mail_handoff_started',
    'inquiry.clipboard_handoff_completed',
    'inquiry.clipboard_handoff_failed'
  ]);

  const clone = (value) => JSON.parse(JSON.stringify(value));
  const now = () => new Date().toISOString();
  const sourceFrom = (element) => {
    if (!element) return 'unknown';
    if (element.closest?.('[data-conversion-rail]')) return 'conversion-rail';
    if (element.closest?.('#kontakt')) return 'contact-section';
    if (element.closest?.('.hero')) return 'hero';
    return element.dataset?.inquirySource || 'page';
  };

  function emit(type, detail = {}) {
    if (!allowedEvents.has(type)) throw new Error(`Unsupported public journey signal: ${type}`);

    const safeDetail = {
      source: detail.source || 'unknown',
      method: detail.method || null,
      reason: detail.reason || null,
      viewport: window.matchMedia('(max-width: 760px)').matches ? 'mobile' : 'desktop'
    };

    const signal = Object.freeze({
      id: `signal_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      type,
      occurred_at: now(),
      detail: safeDetail,
      privacy: {
        classification: 'operational',
        persistence: 'none',
        personal_data: false
      }
    });

    history.push(signal);
    if (history.length > MAX_HISTORY) history.splice(0, history.length - MAX_HISTORY);

    subscribers.forEach((handler) => queueMicrotask(() => handler(clone(signal))));
    window.dispatchEvent(new CustomEvent('casa:public-journey-signal', { detail: clone(signal) }));

    return clone(signal);
  }

  function subscribe(handler, { replay = false } = {}) {
    if (typeof handler !== 'function') throw new TypeError('Signal subscriber must be a function.');
    subscribers.add(handler);
    if (replay) history.forEach((signal) => queueMicrotask(() => handler(clone(signal))));
    return () => subscribers.delete(handler);
  }

  function snapshot() {
    const counts = Object.fromEntries([...allowedEvents].map((type) => [type, 0]));
    history.forEach((signal) => { counts[signal.type] += 1; });
    return {
      version: VERSION,
      ready: true,
      event_count: history.length,
      counts,
      persistence: 'none',
      personal_data: false
    };
  }

  window.CasaPublicJourneySignals = Object.freeze({
    VERSION,
    emit,
    subscribe,
    recent: (limit = 20) => clone(history.slice(-Math.max(0, limit)).reverse()),
    snapshot,
    sourceFrom,
    allowedEvents: Object.freeze([...allowedEvents])
  });
})();
