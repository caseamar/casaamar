# Test static control entry

Release: v2026.07.24.97
Worker: 14.8-no-redirect-loop
Stable URL: /control.html

1. Upload and overwrite every file, including all mission-control-v70..v95 redirect stubs.
2. Open the exact old URL from the reported issue:
   `/mission-control-v89?_canonical_release=20260724.89&_platform_release=20260724.94#publish`
3. Also test:
   `/mission-control-v89.html?_canonical_release=20260724.89#publish`
4. Both must land on `/control.html#publish`.
5. The old Udgivelsescenter UI must never remain visible.
6. The current page must show v96 and Worker 14.7.
7. With no newly-created content package, it must show the idle state.
8. `_redirects` and the static redirect stubs provide two independent redirect mechanisms.
