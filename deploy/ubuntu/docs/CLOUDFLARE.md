# Cloudflare Tunnel (self-hosted frontend + API)

Public path (target architecture):

```text
Browser
  -> https://YOUR_DOMAIN.tech
  -> Cloudflare DNS + Tunnel
  -> http://127.0.0.1:80  (existing Nginx)
  -> static React (/var/www/tron-ai)
  -> /api/* proxied to Spring on 127.0.0.1:18080
```

Do **not** invent a domain. Replace `YOUR_DOMAIN.tech` with the purchased domain.

Example ingress fragment: `deploy/cloudflare/ingress.example.yml`.

## Preserve existing projects

1. Open the **existing** Cloudflare Tunnel config used by the three running projects.
2. **Add** a hostname for TRON AI; do not remove other hostnames.
3. Point the new hostname at the same local Nginx listener already used by other sites (typically `http://127.0.0.1:80`).
4. Keep credentials at `/etc/cloudflared/credentials.json` (mode 600). Never commit them.

## DNS (Cloudflare dashboard)

1. Add the `.tech` domain to the same Cloudflare account that owns the tunnel (or follow Cloudflare's domain-add wizard).
2. Create a CNAME for `@` (or the chosen hostname) targeting the tunnel, proxied (orange cloud).
3. Optional: `www` CNAME to the same tunnel target.

Exact tunnel CNAME target values come from the Cloudflare Zero Trust dashboard for **your** tunnel — do not copy invented hostnames.

## HTTPS

Cloudflare proxies HTTPS at the edge. Local Nginx can stay on port 80 when traffic arrives only via the tunnel.

## OAuth

When Google OAuth is enabled, set authorized redirect URI to:

`https://YOUR_DOMAIN.tech/login/oauth2/code/google`

and set `GOOGLE_REDIRECT_URI` / `CORS_ALLOWED_ORIGINS` / `TRON_FRONTEND_URL` accordingly in `/etc/tron-ai/tron-ai.env`.

## Verification

```bash
curl -fsSI https://YOUR_DOMAIN.tech/
curl -fsS https://YOUR_DOMAIN.tech/health
```

Nginx terminates the local hop. Spring sees `X-Forwarded-Proto` because `server.forward-headers-strategy` is `framework`.
