# Test bekræftede færdigtidspunkter

Release: v2026.07.24.92
Worker: 14.3-confirmed-completion-timestamps
Build: 2026-07-27T10:06:13+02:00

1. Open Mission Control after deployment.
2. Primary platform status shows:
   - “Platformen er opdateret”
   - “Bekræftet opdateret”
   - current version
3. The primary time must be the first successful manifest/Worker match for v92.
4. “Pakken blev bygget” is visible only under technical details.
5. Content primary status shows:
   - “Indholdet er opdateret” only after verified live
   - session.live_at as “Bekræftet live”
   - content version
6. Prepared/build/GitHub timestamps remain only in technical details or activity log.
7. Refreshing the page must preserve the same platform confirmation time for the same version.
8. A new platform version receives a new confirmation timestamp.
