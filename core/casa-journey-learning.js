/** Generic privacy-safe journey learning infrastructure. No personal data; local aggregation + optional adapter. */
(() => {
  'use strict';
  const STORAGE_KEY = 'casa.journey.learning.v1';
  const MAX_EVENTS = 200;

  const emptyModel = () => ({version: 1, events: [], choices: {}, combinations: {}, updatedAt: null});
  const load = () => {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return parsed?.version === 1 ? parsed : emptyModel();
    } catch { return emptyModel(); }
  };
  const model = load();
  const save = () => {
    model.updatedAt = new Date().toISOString();
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(model)); } catch {}
  };
  const clean = value => String(value ?? '').replace(/[^a-zA-Z0-9_.:-]/g, '').slice(0, 80);
  const signature = ids => [...new Set(ids.map(clean).filter(Boolean))].sort().join('+');

  function record(type, payload = {}) {
    const event = {
      type: clean(type),
      at: new Date().toISOString(),
      domain: clean(payload.domain),
      itemId: clean(payload.itemId),
      replacementId: clean(payload.replacementId),
      anchorId: clean(payload.anchorId),
      planSignature: signature(payload.planIds || [])
    };
    model.events.push(event);
    if (model.events.length > MAX_EVENTS) model.events.splice(0, model.events.length - MAX_EVENTS);
    if (event.itemId) model.choices[event.itemId] = (model.choices[event.itemId] || 0) + 1;
    if (event.planSignature) model.combinations[event.planSignature] = (model.combinations[event.planSignature] || 0) + 1;
    save();

    window.dispatchEvent(new CustomEvent('casa:journey-learning', {detail: event}));
    const adapter = window.CasaJourneyLearningAdapter;
    if (adapter?.record instanceof Function) {
      try { adapter.record(event); } catch {}
    }
    return event;
  }

  function insights() {
    const topChoices = Object.entries(model.choices).sort((a,b) => b[1]-a[1]).slice(0,5);
    const topCombinations = Object.entries(model.combinations).sort((a,b) => b[1]-a[1]).slice(0,5);
    return {topChoices, topCombinations, eventCount: model.events.length, updatedAt: model.updatedAt};
  }

  window.CasaJourneyLearning = Object.freeze({version:'1.0.0', record, insights, snapshot: () => JSON.parse(JSON.stringify(model))});
  document.documentElement.dataset.journeyLearning = '1.0.0';
})();
