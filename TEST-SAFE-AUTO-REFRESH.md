# Test sikker automatisk opdatering

Release: v2026.07.24.76
Worker: 12.6-safe-auto-refresh

1. Upload alle filer, herunder `_redirects`, `_headers`, `platform-shell.js` og `platform-manifest.json`.
2. Åbn `/knowledge-center`.
3. Browseren skal sende dig til `/knowledge-center.html`.
4. Hele Mission Control skal vises — ikke kun versionsnummeret.
5. Hold siden åben og deploy en nyere version.
6. Senest efter 30 sekunder skal en kort opdateringsbesked vises.
7. Siden skal genindlæses på den eksplicitte `.html`-adresse.
8. Hele brugerfladen skal stadig være synlig.
9. Autosavede ændringer skal være bevaret.

Nødadgang efter denne release:
`/knowledge-center.html`
