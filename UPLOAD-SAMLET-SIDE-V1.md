# Casa Amar – upload af samlet hjemmeside v1

## Hvad ændres

Denne version samler forsiden og præsentationen af huset i én `index.html`.

Der oprettes ikke en separat `huset.html`.

Menuen fører til afsnit længere nede på samme side:

- Huset
- Tagterrassen
- Ferier
- Året rundt
- Billeder
- Kontakt

Faktabjælken viser:

- 3 soveværelser
- 6 gæster
- 2 badeværelser
- 3 etager
- flere terrasser
- fælles pool i sæson

Der vises ikke sengemål i faktabjælken.

## Fil, der skal erstattes i GitHub

Erstat kun:

`index.html`

## Placering

GitHub:
`caseamar/casaamar`

Branch:
`main`

Filen skal ligge i repositoryets rod sammen med:

- `style.css`
- `script.js`
- `images/`
- `README.md`

Den nye `index.html` indeholder billederne direkte. De eksisterende øvrige filer må blive liggende og skal ikke slettes.

## Upload – præcise trin

1. Pak ZIP-filen ud på computeren.
2. Åbn GitHub-repositoryet `caseamar/casaamar`.
3. Klik på den nuværende `index.html`.
4. Klik på papirkurven og commit sletningen til `main`.
5. Gå tilbage til repositoryets rod.
6. Klik `Add file` → `Upload files`.
7. Upload den nye `index.html`.
8. Vælg `Commit directly to the main branch`.
9. Brug commit-beskeden:

`Replace homepage with complete one-page Casa Amar site`

10. Klik `Commit changes`.

## Kontrol i Cloudflare

1. Åbn Cloudflare.
2. Gå til `Workers & Pages` → `casaamarv2`.
3. Åbn `Deployments`.
4. Vent på grøn status.
5. Åbn `https://casaamarv2.pages.dev`.
6. Brug `Ctrl + F5`, hvis browseren stadig viser den gamle version.
7. Kontrollér menuen ved at klikke på `Huset`, `Tagterrassen` og `Året rundt`.

## Rollback

Den tidligere `index.html` er gemt i GitHubs commit-historik.

Ved rollback skal commit'et før:

`Replace homepage with complete one-page Casa Amar site`

gendannes.
