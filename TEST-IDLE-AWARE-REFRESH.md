# Test inaktivitetsstyret platformopdatering

Release: v2026.07.24.77
Worker: 12.7-idle-aware-refresh

1. Upload alle filer og overskriv den defekte release.
2. Slet `_redirects` i GitHub, hvis filen stadig ligger der.
3. Åbn `/knowledge-center.html`; hele Mission Control skal vises.
4. Efter 15 minutters inaktivitet skal platformen vise en pausebesked.
5. Klik **Fortsæt arbejdet**; platformen skal kontrollere versionen straks.
6. Når fanen skjules, stopper versionskontrollen.
7. Når fanen aktiveres igen, køres én straks-kontrol.
8. En ny platformversion skal udløse almindelig `location.reload()` — uden redirect eller URL-ændring.
