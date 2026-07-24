# Test af batch-upload og status

Release: v2026.07.24.68
Worker: 11.8-batched-upload-status

## Test A – flere normale billeder
1. Vælg 7 billeder under 20 MB hver.
2. Bekræft at oversigten viser 7 billeder og 2 batches.
3. Skriv en særskilt beskrivelse under mindst ét billede.
4. Klik Upload og behandl.
5. Kontrollér loggen: batch 1/2 og batch 2/2.
6. Hvert billede skal ende på Klar og vise GitHub-sti samt Asset ID.

## Test B – samlet størrelse over 20 MB
1. Vælg fx 6 billeder på 5 MB hver.
2. Samlet størrelse er ca. 30 MB.
3. Alle skal kunne uploades, fordi grænsen er 20 MB pr. fil.

## Test C – én fil over 20 MB
1. Vælg én fil over 20 MB sammen med to mindre billeder.
2. Den store fil skal markeres som kræver handling og springes over.
3. De to små billeder skal stadig kunne uploades.
4. Beskeden skal forklare, at den store fil skal komprimeres eller eksporteres mindre.
