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
    intentWeights: item.intentWeights || {},
    editorialScore: item.editorialScore ?? 70,
    popularity: item.popularity ?? 0
  }));

  const profile = Object.freeze({
    schemaVersion: '1.0.0',
    domain: source.domain || 'casa-amar',
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
      breakfast: ['morgenmad', 'breakfast', 'brunch', 'kaffe om morgenen'],
      lunch: ['frokost', 'lunch', 'spise midt på dagen'],
      dinner: ['middag', 'aftensmad', 'dinner', 'restaurant om aftenen'],
      evening: ['aften', 'night out', 'drink', 'drinks', 'bar', 'cocktail'],
      meat: ['kød', 'steak', 'bøf', 'grill']
    }
  });

  window.CasaDiscoveryProfile = profile;
  window.CasaDiscovery = core.createEngine({...profile, assets});
})();
