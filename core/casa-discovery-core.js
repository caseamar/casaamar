/**
 * Casa Discovery Core 2.0
 * Generic, tenant-neutral hybrid discovery runtime.
 * AI-first by contract, deterministic by default, provider-independent by adapter.
 */
(() => {
  'use strict';

  const VERSION = '2.1.0';
  const norm = value => String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9æøå ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const unique = values => [...new Set((values || []).filter(Boolean))];
  const STOPWORDS = new Set(['om','i','på','til','og','eller','en','et','the','at','of']);
  const tokenise = value => norm(value).split(' ').filter(token => token && !STOPWORDS.has(token));

  const DEFAULT_LEXICON = Object.freeze({
    beach: ['strand', 'beach', 'hav', 'bade', 'badning', 'kyst'],
    pool: ['pool', 'svømme', 'badning'],
    breakfast: ['morgenmad', 'breakfast', 'brunch', 'kaffe'],
    lunch: ['frokost', 'lunch'],
    dinner: ['middag', 'aftensmad', 'dinner', 'spise om aftenen'],
    evening: ['aften', 'night out', 'drink', 'drinks', 'bar', 'cocktail'],
    meat: ['kød', 'steak', 'bøf', 'grill', 'meat'],
    family: ['børn', 'familie', 'baby', 'legeplads'],
    calm: ['rolig', 'slappe af', 'pause', 'afslapning', 'hjemme'],
    active: ['aktiv', 'sport', 'golf', 'mtb', 'cykel', 'dykning', 'tennis'],
    excursion: ['udflugt', 'tur', 'ronda', 'mijas', 'kultur'],
    local: ['lokal', 'cerros', 'nær huset', 'tæt på'],
    rain: ['regn', 'regnvejr', 'indendørs'],
    romantic: ['romantisk', 'par', 'date', 'solnedgang']
  });

  function buildLexicon(custom = {}) {
    const result = {};
    for (const [intent, values] of Object.entries({...DEFAULT_LEXICON, ...custom})) {
      result[intent] = unique([intent, ...(values || [])].map(norm));
    }
    return Object.freeze(result);
  }

  function deterministicIntent(query, lexicon) {
    const raw = norm(query);
    const terms = new Set(tokenise(raw));
    const intents = [];
    for (const [intent, phrases] of Object.entries(lexicon)) {
      if (phrases.some(phrase => raw.includes(phrase) || tokenise(phrase).some(token => terms.has(token)))) {
        intents.push(intent);
        phrases.forEach(phrase => tokenise(phrase).forEach(token => terms.add(token)));
      }
    }
    return {
      query: String(query || ''),
      normalizedQuery: raw,
      terms: [...terms],
      intents: unique(intents),
      entities: [],
      provider: 'deterministic',
      confidence: raw ? 0.72 : 1
    };
  }

  function normaliseAsset(asset, index = 0) {
    const id = String(asset?.id || `asset-${index}`);
    const tags = unique([
      ...(asset?.tags || []),
      ...(asset?.primaryIntents || []),
      ...(asset?.secondaryIntents || []),
      ...(asset?.relatedIntents || []),
      ...(asset?.mealMoments || [])
    ].map(norm));
    return Object.freeze({
      ...asset,
      id,
      title: String(asset?.title || id),
      summary: String(asset?.summary || ''),
      type: String(asset?.type || 'experience'),
      location: String(asset?.location || ''),
      locationLabel: String(asset?.locationLabel || asset?.location || ''),
      tags,
      primaryIntents: unique((asset?.primaryIntents || []).map(norm)),
      secondaryIntents: unique((asset?.secondaryIntents || []).map(norm)),
      relatedIntents: unique((asset?.relatedIntents || []).map(norm)),
      mealMoments: unique((asset?.mealMoments || []).map(norm)),
      popularity: Number.isFinite(asset?.popularity) ? asset.popularity : 0,
      editorialScore: Number.isFinite(asset?.editorialScore) ? asset.editorialScore : 50,
      intentWeights: Object.freeze(Object.fromEntries(Object.entries(asset?.intentWeights || {}).map(([key,value]) => [norm(key), Number(value) || 0]))),
      discovery: Object.freeze({
        schemaVersion: '2.0',
        searchableText: norm([
          asset?.title,
          asset?.summary,
          asset?.locationLabel,
          asset?.location,
          ...(asset?.tags || []),
          ...(asset?.primaryIntents || []),
          ...(asset?.secondaryIntents || []),
          ...(asset?.relatedIntents || []),
          ...(asset?.mealMoments || []),
          ...Object.keys(asset?.intentWeights || {})
        ].filter(Boolean).join(' '))
      })
    });
  }

  function createModelAdapter(adapter = {}) {
    return Object.freeze({
      name: adapter.name || 'deterministic-fallback',
      async parseIntent(query, context) {
        if (typeof adapter.parseIntent !== 'function') return null;
        try { return await adapter.parseIntent(query, context); } catch { return null; }
      },
      async rerank(input) {
        if (typeof adapter.rerank !== 'function') return null;
        try { return await adapter.rerank(input); } catch { return null; }
      }
    });
  }

  function scoreAsset(asset, intent, options = {}) {
    if (!intent.normalizedQuery) return {score: 1, tier: 'browse', reasons: []};
    const title = norm(asset.title);
    const summary = norm(asset.summary);
    const location = norm(asset.locationLabel || asset.location);
    const direct = new Set(asset.primaryIntents);
    const secondary = new Set(asset.secondaryIntents);
    const related = new Set(asset.relatedIntents);
    const allTags = new Set(asset.tags);
    let score = 0;
    let directStrength = 0;
    const reasons = [];

    for (const term of intent.terms) {
      if (!term) continue;
      if (title.includes(term)) { score += 110; directStrength += 4; reasons.push('title'); }
      if (direct.has(term)) { score += 95; directStrength += 4; reasons.push('primary-intent'); }
      else if ([...direct].some(value => value.includes(term) || term.includes(value))) { score += 62; directStrength += 3; reasons.push('primary-intent'); }
      if (allTags.has(term)) { score += 58; directStrength += 2; reasons.push('tag'); }
      if (location.includes(term)) { score += 34; directStrength += 1; reasons.push('location'); }
      if (summary.includes(term)) { score += 14; reasons.push('summary'); }
      if (secondary.has(term) || [...secondary].some(value => value.includes(term))) { score += 22; reasons.push('secondary-intent'); }
      if (related.has(term) || [...related].some(value => value.includes(term))) { score += 8; reasons.push('related-intent'); }
    }

    for (const semanticIntent of intent.intents) {
      const configuredWeight = Number(asset.intentWeights?.[semanticIntent] || 0);
      if (configuredWeight > 0) {
        score += configuredWeight;
        directStrength += configuredWeight >= 70 ? 4 : configuredWeight >= 35 ? 2 : 1;
        reasons.push(`intent-weight:${semanticIntent}:${configuredWeight}`);
      }
      if (direct.has(semanticIntent) || allTags.has(semanticIntent)) { score += 88; directStrength += 4; reasons.push(`intent:${semanticIntent}`); }
      else if (secondary.has(semanticIntent)) { score += 28; reasons.push(`secondary:${semanticIntent}`); }
      else if (related.has(semanticIntent)) { score += 10; reasons.push(`related:${semanticIntent}`); }
    }

    score += Math.min(12, Math.max(0, asset.editorialScore / 10));
    score += Math.min(8, Math.max(0, asset.popularity / 12.5));

    // Domain-neutral precision rule: related context must never outrank the thing requested.
    const requestedTypes = options.intentTypeMap || {};
    for (const semanticIntent of intent.intents) {
      const expected = requestedTypes[semanticIntent];
      if (expected && !expected.includes(asset.type) && !direct.has(semanticIntent)) score -= 42;
    }

    const tier = directStrength >= 4 ? 'direct' : directStrength >= 1 ? 'relevant' : 'related';
    return {score: Math.max(0, score), tier, reasons: unique(reasons)};
  }

  function createEngine(config = {}) {
    const domain = String(config.domain || 'default');
    const assets = (config.assets || []).map(normaliseAsset);
    const lexicon = buildLexicon(config.lexicon);
    const model = createModelAdapter(config.modelAdapter);
    const listeners = new Set();
    const intentTypeMap = config.intentTypeMap || {};

    async function parseIntent(query, context = {}) {
      const fallback = deterministicIntent(query, lexicon);
      const ai = await model.parseIntent(query, {domain, fallback, context});
      if (!ai || typeof ai !== 'object') return fallback;
      return {
        ...fallback,
        ...ai,
        query: String(query || ''),
        normalizedQuery: fallback.normalizedQuery,
        terms: unique([...(fallback.terms || []), ...((ai.terms || []).map(norm))]),
        intents: unique([...(fallback.intents || []), ...((ai.intents || []).map(norm))]),
        provider: model.name,
        confidence: Number.isFinite(ai.confidence) ? ai.confidence : fallback.confidence
      };
    }

    async function search(query, options = {}) {
      const intent = await parseIntent(query, options.context);
      const filter = typeof options.filter === 'function' ? options.filter : () => true;
      let ranked = assets
        .filter(filter)
        .map(asset => ({asset, ...scoreAsset(asset, intent, {intentTypeMap})}))
        .filter(result => !intent.normalizedQuery || result.score >= (options.minimumScore ?? 12))
        .sort((a, b) => b.score - a.score || a.asset.title.localeCompare(b.asset.title));

      const aiRanked = await model.rerank({domain, query, intent, candidates: ranked.slice(0, options.rerankLimit || 20)});
      if (Array.isArray(aiRanked)) {
        const order = new Map(aiRanked.map((id, index) => [String(id), index]));
        ranked = ranked.sort((a, b) => (order.get(a.asset.id) ?? 9999) - (order.get(b.asset.id) ?? 9999) || b.score - a.score);
      }

      const response = Object.freeze({
        domain,
        query: String(query || ''),
        intent: Object.freeze(intent),
        results: Object.freeze(ranked),
        generatedAt: new Date().toISOString(),
        engineVersion: VERSION
      });
      listeners.forEach(listener => { try { listener(response); } catch {} });
      return response;
    }

    return Object.freeze({
      version: VERSION,
      domain,
      assets: Object.freeze(assets),
      search,
      parseIntent,
      subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
      snapshot() { return {version: VERSION, domain, assets: assets.length, model: model.name}; }
    });
  }

  window.CasaDiscoveryCore = Object.freeze({
    version: VERSION,
    createEngine,
    createModelAdapter,
    deterministicIntent,
    normaliseAsset
  });
  document.documentElement.dataset.discoveryCore = VERSION;
})();
