# Test af fælles versionskilde

Forventet platformversion: v2026.07.24.86
Forventet worker: 13.7-authoritative-route-sync
Forventet build: 2026-07-26T22:45:00+02:00

1. Upload og overskriv alle filer, inklusive:
   - `platform-manifest.json`
   - `_headers`
   - `platform-shell.js`
   - `_worker.js`
2. Vent på grøn Cloudflare-deployment.
3. Åbn hjemmesiden i en ny fane.
4. Åbn Mission Control i en anden fane.
5. Lav Ctrl+F5 på begge sider.
6. Begge steder skal vise præcis `v2026.07.24.86`.
7. Åbn direkte `/platform-manifest.json`.
8. Kontrollér at platform, build og worker svarer til ovenstående.
9. Åbn Billeder, Hjemmesiden og Viden.
10. Alle sider skal vise samme platformversion.
11. Der må ikke findes `v2026.07.24.72` eller `v2026.07.24.71` i den uploadede kode.
