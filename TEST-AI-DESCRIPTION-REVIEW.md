# Test AI-forslag og AI-review

Release: v2026.07.24.69
Worker: 11.9-ai-description-review

## Test 1 – AI-forslag
1. Træk ét billede ind i Asset Studio.
2. Klik **Lav AI-forslag**.
3. Der skal straks stå, at AI arbejder.
4. Feltet skal udfyldes med en neutral beskrivelse af det synlige motiv.
5. Beskrivelsen må ikke tilføje ikke-synlige fakta som afstande, parkeringsråd eller anbefalinger.

## Test 2 – forkert manuel tekst
1. Skriv en tekst med en ikke-synlig oplysning, fx:
   `Restauranten ligger ved stranden, og her er nemt at parkere.`
2. Klik **AI-review tekst**.
3. Reviewet skal markere ikke-verificerbare påstande.
4. Der skal vises en korrigeret AI-beskrivelse.
5. Klik **Brug AI-forslag**.

## Test 3 – korrekt tekst
1. Skriv en kort, neutral beskrivelse af motivet.
2. Klik **AI-review tekst**.
3. Status skal være **Godkendt**, hvis teksten matcher billedet.

## Test 4 – CTA
Kontrollér, at hvert billede altid viser næste anbefalede handling:
- Lav AI-forslag
- Kør AI-review
- Upload billedet
