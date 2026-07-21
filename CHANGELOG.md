# CHANGELOG

## v2026.07.21.02 — 2026-07-21 18:45

### Rettelse af dynamiske billeder
- Omskrevet slider-funktionen til en enklere og mere robust løsning.
- Automatisk billedskift kører nu uafhængigt af browserens indstilling for reduceret bevægelse.
- Tilføjet synlige pile til forrige og næste billede.
- Hvert billede får nu eksplicit `opacity` og `visibility`, så skiftet ikke kan skjules af gamle CSS-regler.
- Billedtælleren opdateres ved både automatisk og manuelt skift.

### Versionskontrol
- Udviklingsmærket er opdateret til `v2026.07.21.02`.

### Filer
- Ændret: `index.html`
- Ændret: `style.css`
- Ændret: `script.js`
- Ændret: `documentation/CHANGELOG.md`
- Ingen nye billeder.


## v2026.07.21.01 — 2026-07-21 18:30

### Navigation
- Tilføjet en synlig `Forside`-knap i hovedmenuen.
- Aktivt menupunkt markeres, når man bevæger sig gennem siden.

### Versionskontrol
- Tilføjet tydeligt udviklingsmærke nederst til højre.
- Versionsnummer og tidspunkt er også indsat som metadata i `index.html`.

### Dynamik
- Gennemgået og stabiliseret alle fire billedskift: hero, stueetage, patio og tagterrasse.
- Tilføjet synlig tæller, eksempelvis `Billede 1 / 3`.
- Automatisk billedskift pauses ved mus, tastaturfokus og skjult browserfane.
- Bevægelse reduceres automatisk for brugere med indstillingen “reduceret bevægelse”.

### Kontrol
- Ingen nye billeder.
- Ingen ændring af `README.md` eller øvrige dokumentationsfiler.


Dette dokument opdateres ved hver ændring.

## 2026-07-21

### Etablering
- Dokumentationsstruktur oprettet.
- GitHub-arbejdsgang fastlagt.
- Cloudflare Pages anvendes til automatisk deployment.

Fremover tilføjes nyeste ændringer øverst.
