# Test aktiv indholdsudgivelse

Release: v2026.07.24.94
Worker: 14.5-canonical-url-and-idle-state
Build: 2026-07-27T10:58:48+02:00

1. Deploy a platform update without creating a content package.
2. Mission Control must show:
   - Platform updated
   - No active content release
   - One clear next-step CTA
3. Progress steps, automatic countdown and GitHub/live checks must be hidden.
4. An old pre-v93 pending session must be migrated to a historical receipt.
5. The old session must never trigger polling.
6. Click “Saml filer til GitHub”.
7. The new session must contain:
   - release_kind=content
   - activated_by=user_publish_action
   - active=true
8. Only then must the supervisor and progress steps appear.
9. After two live matches:
   - state=live
   - active=false
   - supervisor stops
   - idle state returns
10. Platform updates during idle must not change content-release state.
