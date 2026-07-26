# Test: live udgivelse fjerner den afsluttede opgave

Release: v2026.07.24.78
Worker: 12.8-stable-platform-supervisor

## Test A – normal udgivelse
1. Lav lokale ændringer og kontrollér, at Mission Control viser “Udgiv dit færdige arbejde”.
2. Saml pakken og upload den til GitHub.
3. Vent til Udgivelsescenteret viser “Live bekræftet”.
4. Uden at genindlæse siden skal anbefalingskortet opdateres automatisk.
5. “Udgiv dit færdige arbejde” må ikke længere stå som opgave.
6. Mission Control skal vise den næste reelle opgave.

## Test B – nye ændringer under deployment
1. Saml en udgivelsespakke.
2. Lav derefter en ny manuel ændring, før live-versionen bliver bekræftet.
3. Upload pakken til GitHub.
4. Når udgivelsen er live:
   - ændringerne i pakken skal fjernes fra workspace
   - den nyere ændring skal bevares
   - Mission Control skal vise kun de resterende nyere ændringer

## Test C – eksisterende live session
1. Åbn Mission Control med en session, der allerede står som live, men stadig viser gamle ændringer.
2. Klik “Kontrollér status nu” eller genindlæs siden.
3. Platformen skal reparere sessionen, nulstille de gamle udgivne ændringer og opdatere anbefalingen.
