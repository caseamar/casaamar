# Test stabil recovery og Platform Supervisor

Release: v2026.07.24.90
Worker: 14.1-release-compatibility-engine

1. Upload og overskriv alle filer, inklusive `_redirects`.
2. Vent på grøn Cloudflare-deployment.
3. Åbn `/` og `/knowledge-center.html`; hele indholdet skal vises.
4. Ved en senere version vises knappen **Opdater platformen**. Ingen automatisk genindlæsning.
5. Efter 15 minutters inaktivitet vises **Jeg er aktiv igen** og kontrollen pauses.
