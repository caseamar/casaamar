# Test intelligent startposition

Release: v2026.07.24.97
Worker: 14.8-no-redirect-loop

1. Åbn `/knowledge-center.html` uden aktiv udgivelse.
   - Siden skal starte helt i toppen.
2. Genindlæs siden efter at have scrollet ned.
   - Siden skal igen starte i toppen.
3. Klik “Gå til udgivelse” eller åbn `#publish`.
   - Siden skal gå direkte til Udgivelsescenteret.
4. Hav en aktiv udgivelse i status:
   - prepared
   - github
   - deploying
   - verifying
   Genåbn Mission Control.
   - Siden skal starte ved Udgivelsescenteret.
5. Når udgivelsen er live:
   - normal åbning starter i toppen
   - kvitteringen er stadig tilgængelig længere nede
