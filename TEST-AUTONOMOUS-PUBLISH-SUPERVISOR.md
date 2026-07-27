# Test Autonomous Publish Supervisor

Release: v2026.07.24.95
Worker: 14.6-stable-control-route
Build: 2026-07-27T10:58:48+02:00

1. Build a compatible release package.
2. During the first 30 seconds:
   - no network status check runs
   - text explains that the upload to GitHub is manual
   - countdown shows “Tjekker igen om”
3. From 30 to 120 seconds:
   - automatic checks run every 10 seconds
   - last checked time updates
   - countdown restarts from 10 seconds
4. From 2 to 5 minutes:
   - checks run every 25 seconds
5. After 5 minutes:
   - checks become less frequent
6. “Tjek nu” triggers one immediate check and is disabled while checking.
7. Activity log records checks, GitHub detection, public verification and completion.
8. Two matching public checks are still required before live status.
9. Workspace is not cleared before verified live.
10. Hide/show the tab:
   - an overdue check runs immediately when returning
   - the countdown resumes without requiring F5.
