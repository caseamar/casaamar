# Test konsistent Platformstatus

Release: v2026.07.24.93
Worker: 14.4-active-content-release-lifecycle

1. Offentlig hjemmeside:
   - DEV-badge viser `v2026.07.24.93`
   - dato vises på dansk, ikke som rå ISO-streng
2. Mission Control:
   - Platform viser version, Bygget og Live siden
3. Udgivelseskvittering:
   - Lavet med platform viser version og Bygget
   - Live bekræftet viser tidspunkt eller “Ikke bekræftet”
   - Offentlig verifikation viser:
     - Afventer GitHub-upload
     - Afventer offentlig kontrol
     - 0/1 af 2 match
     - Bekræftet
     - eller tydelig besked for en ældre udgivelse
4. “Ikke kontrolleret” må ikke længere stå uden forklaring.
