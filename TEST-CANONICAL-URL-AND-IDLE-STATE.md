# Test canonical URL and idle state

Release: v2026.07.24.96
Worker: 14.7-static-control-entry
Canonical: /mission-control-v94.html
Build: 2026-07-27T10:58:48+02:00

1. Open an old address, for example `/mission-control-v89.html#publish`.
2. Worker must serve the v94 Mission Control.
3. Browser address must change to `/mission-control-v94.html#publish`.
4. Open `/knowledge-center` and `/knowledge-center.html`; both must show v94.
5. Click the platform update button from an old Mission Control page.
6. It must navigate to `/mission-control-v94.html` instead of reloading the old URL.
7. With only a historical release session:
   - show “Ingen aktiv indholdsudgivelse”
   - hide progress, polling, countdown and manual status check
   - show one clear next-step CTA
8. Only clicking “Saml filer til GitHub” may create an active release and reveal progress.
