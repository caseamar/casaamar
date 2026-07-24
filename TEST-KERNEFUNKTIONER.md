# Casa Amar – test af kernefunktioner

Release: v2026.07.24.65
Worker: 11.5-github-asset-sync

## Før du tester

1. Upload og overskriv alle filer fra releasen i GitHub.
2. Vent på at Cloudflare-deployment er færdig.
3. Åbn `/asset-studio.html`.
4. Bekræft release og worker-nummer.

## Test 1 – komplet GitHub-scanning

1. Klik **Synkronisér hele GitHub-biblioteket**.
2. Du skal straks se spinner, arbejdslog og beskeden om at afvente.
3. Resultatet skal vise cirka det samlede antal billeder i alle mapper under `images/`.
4. Du skal få en oversigt over:
   - nye
   - flyttede/omdøbte
   - udskiftede
   - manglende

Forventet: Ingen filer ændres før du klikker **Anvend sikre ændringer**.

## Test 2 – nyt billede

1. Upload ét testbillede til `images/library/` i GitHub.
2. Klik **Synkronisér hele GitHub-biblioteket**.
3. Testbilledet skal stå som **Nyt billede**.
4. Klik **Anvend sikre ændringer**.

Forventet:
- Asset Object oprettes som `reserve`.
- Billedet sættes i visuel analysekø.
- AI-analyse starter.
- Relation scan kører bagefter.

## Test 3 – omdøb eller flyt

1. Flyt testbilledet til en undermappe eller omdøb det i GitHub uden at ændre selve filen.
2. Synkronisér igen.

Forventet:
- Ændringen registreres som **Flyttet eller omdøbt**.
- Eksisterende Asset Object, labels og relationer bevares.
- Kun stien opdateres.

## Test 4 – udskift billede

1. Upload en anden billedfil med præcis samme sti og filnavn.
2. Synkronisér igen.

Forventet:
- Ændringen registreres som **Fil udskiftet**.
- Manuelle labels og relationer bevares.
- Billedet sættes i visuel genanalyse.

## Test 5 – sletning

1. Slet testbilledet i GitHub.
2. Synkronisér igen.

Forventet:
- Asset Studio viser **Fil mangler i GitHub**.
- Asset Object slettes ikke.
- Hvis billedet ikke bruges, får det `needs_review`.
- Hvis billedet er låst eller i brug, får det `replacement_required`.

## Test 6 – samlet udgivelse

1. Gå til Dashboard.
2. Klik **Udgiv ny version**.
3. Vælg en tom lokal mappe.

Forventet:
- Alle JSON-filer skrives med stabile filnavne.
- `asset-library.json` indeholder synkroniserede assets.
- `asset-sync-settings.json` er med.
- Workspace-data forsvinder ikke efter udgivelsen.

## Fast arbejdsgang fremover

- Upload billeder: `images/library/`
- Slet eller flyt billeder: direkte i GitHub
- Synkronisér og gennemgå: Asset Studio
- Redigér og analysér: Asset Studio
- Udgiv metadata: Dashboard
