# Test canonical Mission Control

Release: v2026.07.24.94
Worker: 14.5-canonical-url-and-idle-state
Created: 26.07.2026 kl. 23.35

1. Upload and overwrite every file, including `mission-control-v89.html` and `_worker.js`.
2. Wait for the single green Cloudflare production deployment.
3. Open these three URLs:
   - `/knowledge-center`
   - `/knowledge-center.html`
   - `/mission-control-v89.html`
4. All three must show the same full Mission Control.
5. The green header must show `v2026.07.24.94`.
6. The current platform card must show `v2026.07.24.94` and `14.5-canonical-url-and-idle-state`.
7. The historical receipt may still show v83/13.4 for the old release.
8. The old one-card “Udgivelseskvittering” layout must not appear.
9. The website build time must equal the actual package time: `2026-07-27T10:58:48+02:00`.
