# Test versionssynkronisering

Release: v2026.07.24.85
Worker: 13.6-version-cache-sync
Bygget: 26. juli 2026 kl. 22.15 dansk tid

1. Upload og overskriv alle filer.
2. Vent på grøn Cloudflare-deployment.
3. Åbn den offentlige hjemmeside.
4. Åbn Knowledge Center i en anden fane.
5. Begge skal straks vise:
   - `v2026.07.24.85`
   - `26. jul. 2026 · kl. 22.15`
6. Knowledge Center må ikke vise en tidligere version.
7. Kontrollér sidens kildekode: `platform-shell.js?v=20260724.85`.
8. Åbn `/platform-manifest.json` direkte og kontrollér samme version og build-tid.
