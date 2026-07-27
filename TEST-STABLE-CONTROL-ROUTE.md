# Test stable control route

Release: v2026.07.24.96
Worker: 14.7-static-control-entry
Stable URL: /control

1. Open `/mission-control-v89.html?_canonical_release=20260724.89#publish`.
2. It must redirect to `/control#publish`.
3. Old v89 HTML must never render.
4. The address bar must show `/control#publish`.
5. `/knowledge-center` and `/knowledge-center.html` must redirect to `/control`.
6. Without an explicit new content release, the idle status must be shown.
