# Test af Asset Upload Manager

Release: v2026.07.24.66
Worker: 11.6-asset-upload-manager

## Forudsætning: aktivér direkte GitHub-upload

Asset Studio kan først uploade direkte, når Cloudflare har et secret:

- Navn: `GITHUB_TOKEN`
- Værdi: et GitHub fine-grained token
- Repository access: `caseamar/casaamar`
- Repository permission: **Contents – Read and write**

Secretet må aldrig skrives ind i HTML eller uploades til GitHub.

Efter secretet er oprettet, deployes siden igen.

## Test 1 – uploadstatus

1. Åbn `/asset-studio.html`.
2. Under uploadfeltet skal der stå:
   `Direkte upload er aktiv`.
3. Der skal også stå lageret `images/library`.

Hvis der står, at GitHub-forbindelsen mangler, er tokenet ikke aktivt.

## Test 2 – nyt billede

1. Træk ét mindre testbillede ind i uploadfeltet.
2. Skriv eventuelt en beskrivelse.
3. Vælg eventuelt sæson.
4. Klik **Upload og behandl billeder**.

Forventet:
- Der vises spinner, log og fremdrift.
- Billedet uploades til `images/library`.
- Et Asset Object oprettes.
- AI-analyse starter.
- Relation scan starter efter analysen.
- Billedet vises i Asset Studio.

## Test 3 – filnavnskollision

1. Upload det samme billede igen som et nyt billede.

Forventet:
- Den eksisterende fil overskrives ikke.
- Den nye fil får fx `-2` i filnavnet.

## Test 4 – erstat billede

1. Vælg ét nyt billede.
2. Vælg **Erstat ét eksisterende billede**.
3. Vælg det eksisterende asset.
4. Klik upload.

Forventet:
- Samme GitHub-sti bruges.
- Manuelle metadata og relationer bevares.
- Visuel genanalyse starter.

## Test 5 – sletning

Sletning sker fortsat sikkert via GitHub:

1. Slet filen i GitHub.
2. Klik **Synkronisér hele biblioteket** i Asset Studio.
3. Anvend ændringen.

Forventet:
- Asset Object slettes ikke.
- Det markeres `missing`.
- Hvis det bruges eller er låst, markeres det `replacement_required`.

## Fremtidig normal arbejdsgang

1. Åbn Asset Studio.
2. Træk billeder ind.
3. Tilføj kun kontekst, når AI ikke selv kan se den.
4. Klik **Upload og behandl billeder**.
5. Gennemgå AI-labels og anbefalinger.
6. Udgiv metadata samlet fra Dashboard.
