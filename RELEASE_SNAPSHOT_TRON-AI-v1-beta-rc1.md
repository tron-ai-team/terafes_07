# TRON-AI-v1-beta-rc1 — Release Snapshot Manifest
Generated: 2026-11-06T19:58:56+09:00
Label: TRON-AI-v1-beta-rc1
Source root: C:\Users\engrm\OneDrive\Desktop\Group7

## Git identity
- Project .git: ABSENT
- Immutable git tag: NOT CREATED (requires owner-authorized git init/commit or remote clone)
- Parent directory git noise: a .git may exist above the user profile; it is NOT this project

## Artifact fingerprints (local build, this machine)
- frontend/dist/index.html SHA256: 7814D1FDEA86838237870A51F90039005BDC925047624600D96A9E1BE03F7158
- backend JAR: tronai-backend-0.1.0-SNAPSHOT.jar size=117543974 SHA256: D4306FF83B4BAFF822659F184F2650E23D7D9FA71EE325D0DD648B960064390E
- Frontend production build: PASS (2026-11-06, tsc -b && vite build)
- Backend package: PASS (mvnw -DskipTests package)

## Include in release package
- frontend/src, frontend/public, frontend/package.json, lockfile, configs
- backend/backend-spring/src, pom.xml, Dockerfile, mvnw*
- deploy/ (compose, nginx, scripts, .env.example)
- docs/, README.md, .env.example, .gitignore, .github/
- desktop-agent/ (source only; not Ubuntu runtime)
- scripts/ Start-Tron / Ensure-Gotenberg as needed
- Japanese templates (root xlsx + classpath templates)
- docker-compose.yml (local gotenberg)

## Exclude from release package
- DELETE_LATER/
- .runtime/
- **/node_modules/, **/target/, frontend/dist/ (rebuild in CI)
- .env, filled secrets, cookies, evidence archives
- TRON_AI_FINAL_PRESENTATION.* unless owner requests
- Personal MySQL data

## Next owner actions for immutable snapshot
1. Provide GitHub OWNER/REPO URL
2. Authorize git init in Group7 OR clone remote and sync
3. Authorize commit + tag TRON-AI-v1-beta-rc1 (no force)
4. Authorize push / PR
