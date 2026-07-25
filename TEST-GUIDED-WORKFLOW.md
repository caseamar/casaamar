# Test af det guidede arbejdsflow

Release: v2026.07.24.71
Worker: 12.1-guided-workflow

## Hjemmesiden
1. Åbn Hjemmesiden og start “Udfyld kun manglende felter”.
2. Kontrollér at der vises:
   - hvad AI arbejder med
   - forløbet tid
   - seneste aktivitet
   - en ændret aktivitetsbesked over tid
3. Når AI er færdig, skal felterne være synlige direkte.
4. Der må ikke være en særskilt “Start review”-knap.
5. Ret én tekst manuelt.
6. Klik “Godkend ændringerne”.
7. Kontrollér beskeden:
   - AI's ændringer og din rettelse er gemt
   - ændringerne er ikke live
   - “Gå til udgivelse” vises
8. Test “Fortryd AI's ændringer” i et nyt forløb.

## Udgivelse
1. Klik “Gå til udgivelse”.
2. Kontrollér at siden forklarer, at pakken indeholder hele workspacet:
   - AI-ændringer
   - manuelle rettelser
   - viden
   - hjemmeside
   - billeder og billedoplysninger
   - relationer
   - stil og fotoopgaver
3. Klik “Saml filer til GitHub”.
4. Kontrollér den konkrete instruktion om GitHub, commit, Cloudflare og tilbagevenden til Mission Control.

## Andre arbejdsområder
Kontrollér at Billeder, Viden, Stil og tone, Godkend forslag og Kvalitetstjek alle viser en klar næste handling.
