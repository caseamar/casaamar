/** Casa Amar domain adapter for the generic Discovery Core. */
(() => {
  'use strict';
  const source = window.CasaJourneyContent;
  const core = window.CasaDiscoveryCore;
  if (!source?.items?.length || !core) return;

  const assets = source.items.filter(item => !item.hiddenFromSuggestions).map(item => ({
    ...item,
    primaryIntents: item.primaryIntents || [],
    secondaryIntents: item.secondaryIntents || [],
    relatedIntents: item.relatedIntents || [],
    editorialScore: item.editorialScore ?? 70,
    popularity: item.popularity ?? 0
  }));

  window.CasaDiscovery = core.createEngine({
    domain: source.domain || 'casa-amar',
    assets,
    intentTypeMap: {
      beach: ['beach', 'recovery', 'activity'],
      breakfast: ['restaurant', 'meal'],
      lunch: ['restaurant', 'meal'],
      dinner: ['restaurant', 'meal'],
      evening: ['restaurant', 'recovery'],
      meat: ['restaurant'],
      active: ['activity'],
      excursion: ['destination'],
      rain: ['destination', 'activity', 'shopping']
    },
    lexicon: {
      beach: ['strand', 'beach', 'hav', 'bade', 'badning', 'kyst', 'playa'],
      dinner: ['middag', 'aftensmad', 'dinner', 'restaurant om aftenen'],
      evening: ['aften', 'night out', 'drink', 'drinks', 'bar'],
      meat: ['kød', 'steak', 'bøf', 'grill']
    }
  });
})();
