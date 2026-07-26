# Test Verified Publish

Release: v2026.07.24.82
Worker: 13.3-intelligent-start-position

1. Lav præcis to ændringer i platformen.
2. Udgivelsescenteret skal vise **2 ændringer** som det primære tal.
3. Antallet af tekniske filer vises separat.
4. Saml pakken og upload det viste antal filer til GitHub.
5. Status må ikke skifte direkte til live.
6. Efter nyt commit skal flowet være:
   - GitHub er opdateret
   - Cloudflare publicerer
   - Hjemmesiden kontrolleres
   - Dine ændringer er live
7. “Hjemmesiden kontrolleres” kræver to match:
   - release-id
   - content-version
   - platformversion
8. Den endelige besked skal skrive:
   - “2 ændringer er nu bekræftet live”
   - hvilke ændringer der blev udgivet
   - antal tekniske filer som sekundær information
   - GitHub commit og offentlig verifikation
9. Workspace må først nulstilles efter de to offentlige match.
