# Gotenberg (CV PDF)

**Prerequisite:** Docker Desktop (local Linux engine).

## Start

```powershell
# From project root
docker compose up -d gotenberg
# or
powershell -File scripts\Ensure-Gotenberg.ps1
```

`START_TRon.cmd` also calls `Ensure-Gotenberg.ps1` (non-blocking warning if unavailable).

## Verify

```powershell
curl.exe http://127.0.0.1:3000/health
```

## Stop

```powershell
docker compose stop gotenberg
# or
docker stop tron-gotenberg
```

## Config

```yaml
tron.pdf.engine: gotenberg
tron.pdf.gotenberg.base-url: ${GOTENBERG_URL:http://localhost:3000}
```

Bound to `127.0.0.1:3000` only — not public.
