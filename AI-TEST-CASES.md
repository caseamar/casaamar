# Casa Amar AI – regressionstest

## Formål

Testpakken bruges efter ændringer i:

- `_worker.js`
- `concierge-policy.json`
- `concierge-intents.json`
- knowledge-filerne
- chatdesignet i `index.html`

Målet er at opdage fejl, før de rammer gæsterne.

## Sådan bruges pakken

### Hurtig manuel test

Åbn Casa Amar og test mindst disse fem:

1. `Hvordan kommer jeg til huset?`
2. `Er håndklæder inkluderet?`
3. `Jeg vil gerne skrive til en person`
4. `Det svar er forkert`
5. `Hvad synes du om politik?`

### Fuld test

Åbn `ai-test-runner.html` efter upload til GitHub, fx:

`https://casaamarv2.pages.dev/ai-test-runner.html`

Tryk **Kør alle tests**.

Testværktøjet:

- sender ét spørgsmål ad gangen
- viser AI-svaret
- kontrollerer intent og `needsHuman`
- kontrollerer vigtige ord og uønskede formuleringer
- viser bestået/fejlet
- gemmer ikke svarene

## Fortolkning

- **Bestået:** den vigtigste forventede adfærd er opfyldt.
- **Advarsel:** svaret kan være godt, men afviger fra de automatiske kriterier.
- **Fejlet:** en vigtig routing- eller sikkerhedsregel er brudt.

## Vigtigt

Sprogmodeller kan formulere sig forskelligt. Testpakken kontrollerer derfor adfærd og nøgleelementer, ikke identisk ordlyd.

## Anbefalet praksis

Kør hele pakken:

- før en større ændring
- efter en større ændring
- før casaamar.es går live
- efter ændringer i model eller systemprompt
