# Test no redirect loop

Release: v2026.07.24.97
Worker: 14.8-no-redirect-loop

1. Open `/control.html`.
   - Must return the full control center directly.
   - Must not redirect.
2. Open `/control`.
   - Must redirect once to `/control.html`.
3. Open `/mission-control-v89.html#publish`.
   - Must redirect once to `/control.html#publish`.
4. `_redirects` must not contain `/control /control.html`.
5. The page must show v97 and Worker 14.8.
6. With no active content release, show the idle state.
