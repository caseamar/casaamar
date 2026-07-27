# Test Release Compatibility Engine

Release: v2026.07.24.94
Worker: 14.5-canonical-url-and-idle-state
Schema: 2.0
Build: 2026-07-27T10:58:48+02:00

1. Open Mission Control with an old pending package that has no release_schema.
2. It must be marked “Skal genbygges”; GitHub/live checks must stop.
3. Click “Byg en ny kompatibel pakke”.
4. The old session is preserved as casaSupersededReleaseSession.
5. The new package contains:
   - content-release.json
   - workspace-release.json
   - release-contract.json
6. release-contract.json contains schema, builder, required fields and SHA-256 checksums.
7. Before download, pre-flight must pass.
8. Before accepting a new GitHub commit, compatibility must be checked again.
9. A later platform update with the same supported schema must not invalidate the package.
10. A later platform update with a different required schema must pause and require rebuild.
