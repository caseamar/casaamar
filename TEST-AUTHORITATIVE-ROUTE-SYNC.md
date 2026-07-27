# Test autoritativ versionssynkronisering

Release: v2026.07.24.91
Worker: 14.2-autonomous-publish-supervisor
Build: 26. juli 2026 kl. 22.45 dansk tid

1. Upload og overskriv alle filer.
2. Vent på én grøn Cloudflare-deployment for committen.
3. Åbn `/api/platform-meta`; den skal vise `v2026.07.24.91`.
4. Åbn `/platform-manifest.json`; den skal vise `v2026.07.24.91` og samme worker/build.
5. Åbn både:
   - `/knowledge-center`
   - `/knowledge-center.html`
6. Begge adresser skal vise `v2026.07.24.91` og samme build-tid.
7. Sidens kilde skal indlæse `platform-shell.js?v=20260724.91`.
8. Hvis manifest og worker ikke matcher, skal der vises en tydelig synkroniseringsadvarsel i stedet for et misvisende versionsnummer.
