# Casa Amar AI – teknisk opsætning

Version: v2026.07.22.01

## Formål

Første version giver hjemmesiden en integreret AI-vært, som:

- bruger en struktureret Casa Amar-vidensbase
- svarer via OpenAI Responses API
- kører server-side i Cloudflare Pages Functions
- holder API-nøglen skjult i Cloudflare
- tilbyder e-mail eller Messenger, når svaret ikke kan bekræftes
- gemmer ikke samtaler i hjemmesiden

## Nye filer

```text
functions/
└── api/
    └── chat.js

content/
└── casa-amar-knowledge.json
```

`functions/api/chat.js` bliver automatisk til endpointet:

```text
/api/chat
```

## Cloudflare

Secret skal hedde:

```text
OPENAI_API_KEY
```

Secret skal være sat før deployment. Cloudflare aktiverer den ved næste deployment.

Det er valgfrit senere at oprette en almindelig miljøvariabel:

```text
OPENAI_MODEL=gpt-5-mini
```

Hvis variablen ikke findes, bruger funktionen `gpt-5-mini`.

## Deployment

Pages Functions virker ved Git-integration. Upload alle filer til GitHub-repositoriets rod med mapperne bevaret. Cloudflare starter derefter automatisk en ny deployment.

Cloudflare understøtter ikke dashboardets Direct Upload-metode til Pages-projekter med Functions. GitHub-flowet, som Casa Amar allerede bruger, er korrekt.

## Test efter deployment

1. Åbn:

```text
https://casaamarv2.pages.dev/api/chat
```

Du bør se JSON med service-status.

2. Åbn hjemmesiden og tryk `Spørg Casa Amar`.

3. Test fx:

- `Er håndklæder inkluderet?`
- `Kan vi bo der uden bil?`
- `Hvad findes der til en baby?`
- `Hvad kan vi lave på en dagstur?`

## Skalerbar arkitektur

`content/casa-amar-knowledge.json` er første videnskilde. Senere kan løsningen udvides med:

- flere JSON- eller Markdown-kilder
- automatisk build af JSON fra Markdown
- kontrolleret import af udvalgte websider
- OpenAI web search til aktuelle spørgsmål
- Cloudflare KV eller D1 til cache og redaktionelt indhold
- Vectorize eller OpenAI File Search, når vidensmængden bliver stor
- særskilt offentlig viden og gæstespecifik viden

## Sikkerhed

- API-nøglen må aldrig ligge i GitHub.
- Chatten accepterer højst 500 tegn pr. spørgsmål.
- Samtalehistorik begrænses.
- Der er en enkel best-effort rate limit.
- Ingen kontaktoplysninger gemmes.
- Brugeren bliver bedt om ikke at skrive følsomme personoplysninger.

## Næste fase

Når v1 fungerer stabilt:

1. udvide vidensbasen
2. tilføje kontrollerede webkilder
3. aktivere live websøgning ved aktuelle spørgsmål
4. tilføje kildehenvisninger
5. overveje separat adgang for aktuelle gæster


## Kontrollerede eksterne kilder

Kilder registreres i `content/sources/index.json`.

Første kilde:
https://booking.rinconrent.com/da/feriebolig/byhus-mijas-costa-cerros-del-aguila-charmerende-spansk-byhus-187426.html

Ejerredigeret Casa Amar-viden har prioritet 100. Rincón Rent har prioritet 60. Ved konflikt vinder Casa Amar.

AI'en bruger et kontrolleret snapshot. Dynamiske oplysninger skal bekræftes på originalkilden.
