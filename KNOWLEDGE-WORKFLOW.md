# Sådan vedligeholdes Casa Amar-viden

## Du arbejder i viden – ikke i filer

Du skriver fx:

- “Tilføj at der nu er en airfryer.”
- “Denne anbefaling skal kun være intern.”
- “Brug denne webside som kilde, men vis ikke linket til gæster.”
- “Dette er kun stikord og skal ikke bruges som sikkert svar endnu.”

ChatGPT klassificerer ændringen og leverer de nødvendige filer.

## Fire indholdstyper

### 1. Offentligt indhold
Vises på hjemmesiden og kan bruges af AI.

### 2. Intern viden
Vises ikke på hjemmesiden, men kan bruges af AI.

### 3. Stikord og kladder
Lægges i `knowledge-inbox.json`. Bruges ikke af AI, før det er gennemgået.

### 4. Eksterne kilder
Registreres med URL, tillid, dato for kontrol og regler for attribution.

## Livscyklus

`capture → review → structure → approve → active → deprecated`

## Tillid

- 100: Michael / Casa Amar
- 90: godkendt gæsteguide
- 70–80: officiel lokal kilde
- 60: udlejningsbureau
- 40: anden ekstern webside
- 0: indbakke eller ubekræftet note

## Regler

- Ét faktum har ét autoritativt hjem.
- Hjemmesidetekst må gerne være mere fortællende, men må ikke være den eneste kilde til fakta.
- Dynamiske oplysninger skal have en udløbsdato eller kræve bekræftelse.
- Modstridende kilder løses efter trust og ejerprioritet.
- Vigtige ændringer skal have en regressionstest.
