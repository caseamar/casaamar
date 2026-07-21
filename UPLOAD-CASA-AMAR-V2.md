# Casa Amar v2 – præcis uploadvejledning

## Denne version erstatter den nuværende hjemmeside

GitHub:
- Konto: `caseamar`
- Repository: `casaamar`
- Branch: `main`

Cloudflare:
- Projekt: `casaamarv2`
- Adresse: `https://casaamarv2.pages.dev`

## Filer der skal erstattes

I repositoryets rod:

- `index.html`
- `style.css`
- `script.js`

## Nye billedfiler

Upload alle filer fra pakkens mappe:

`images/`

til den eksisterende GitHub-mappe:

`images/`

De nye billeder har alle filnavne, der starter med:

`casa-amar-v2-`

De eksisterende billeder må blive liggende. Intet skal slettes fra `images` i denne omgang.

## Upload – nem og sikker rækkefølge

### 1. Upload billederne først

1. Åbn `caseamar/casaamar` på GitHub.
2. Klik på mappen `images`.
3. Klik `Add file` → `Upload files`.
4. Åbn pakkens mappe `images` på computeren.
5. Markér alle 15 `.webp`-filer.
6. Træk dem ind i GitHub.
7. Vælg `Commit directly to the main branch`.
8. Commit-besked:

`Add optimized Casa Amar v2 images`

9. Klik `Commit changes`.

Hjemmesiden ændres ikke synligt endnu, fordi den gamle `index.html` ikke bruger de nye billeder.

### 2. Erstat hovedfilerne

1. Gå tilbage til repositoryets rod.
2. Upload disse tre filer fra pakken:
   - `index.html`
   - `style.css`
   - `script.js`
3. GitHub vil registrere dem som ændringer af de eksisterende filer.
4. Vælg `Commit directly to the main branch`.
5. Commit-besked:

`Launch Casa Amar website v2`

6. Klik `Commit changes`.

## Kontrol i Cloudflare

1. Åbn Cloudflare.
2. Gå til `Workers & Pages` → `casaamarv2` → `Deployments`.
3. Vent til den øverste deployment er grøn.
4. Kontrollér, at commit-teksten er:
   `Launch Casa Amar website v2`
5. Åbn:
   `https://casaamarv2.pages.dev`
6. Tryk `Ctrl + F5`.

## Rollback

Hvis v2 skal fortrydes:

1. Åbn GitHub → `caseamar/casaamar`.
2. Klik på commit-historikken.
3. Find commit'et før:
   `Launch Casa Amar website v2`
4. Vi kan derefter gendanne de tidligere versioner af:
   - `index.html`
   - `style.css`
   - `script.js`

De nye `casa-amar-v2-*.webp`-billeder skader ikke den gamle hjemmeside og behøver ikke blive slettet ved rollback.
