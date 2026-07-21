# CHANGELOG

## v2026.07.21.04 — 2026-07-21 20:05

### Rettelse
- Versionsmærket `style.css` og `script.js` i `index.html`, så browseren altid henter den nyeste kode.
- Billedskift stopper ikke længere, når musen ligger over billedet.
- Alle slidersektioner er renset for dobbelte betjeningsknapper og har nu præcis ét sæt pile, én tæller og én indikator.

### Køkken
- Tilføjet et eksisterende Casa Amar-billede, hvor ovnen tydeligt kan ses.
- Ovn-billedet vises uden beskæring.

### Kvalitetssikring
- JavaScript syntakskontrolleret.
- Alle slidersektioner kontrolleret for mindst to billeder og korrekt betjening.
- Ny WebP-billedfil kontrolleret.

### Filer
- Ændret: `index.html`
- Ændret: `style.css`
- Ændret: `script.js`
- Ændret: `documentation/CHANGELOG.md`
- Ny: `images/casa-amar-koekken-ovn.webp`


## v2026.07.21.03 — 2026-07-21 19:35

### Billedsektioner
- Køkkenet er ændret til et dynamisk billedfelt med et tydeligt billede af køkkenet og ovnen samt et separat kaffebillede.
- Patioen beholder billeder af spiseplads, solsenge og beplantning; skiftehastigheden er øget.
- Tagterrassen skifter nu hurtigere mellem dag, udsigt, projektoraften og solnedgang.
- Projektorbilledet vises i fuld størrelse uden beskæring, så billedet på væggen forbliver synligt.
- Beliggenhedssektionen skifter mellem pool, bakker/udsigt og aftenlys.

### Dynamik
- Hero: 5,0 sekunder.
- Stueetage: 4,6 sekunder.
- Køkken: 4,3 sekunder.
- Patio: 4,2 sekunder.
- Tagterrasse: 4,0 sekunder.
- Beliggenhed: 4,5 sekunder.
- Alle dynamiske felter har pile, indikator og billedtæller.

### Kvalitetssikring
- Sliderkoden er gjort generisk, så alle seks dynamiske sektioner bruger samme testede funktion.
- Tilføjet automatisk kontrol af antal sliders og manglende billeder i browserens konsol.
- Ingen nye billedfiler; kun billeder, der allerede ligger i GitHub, genbruges.

### Filer
- Ændret: `index.html`
- Ændret: `style.css`
- Ændret: `script.js`
- Ændret: `documentation/CHANGELOG.md`


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
