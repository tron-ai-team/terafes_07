# AI node

The AI node is a private machine. Spring on the core node calls it over the LAN.

Example layout, not a hardcoded address:

- Core node: `192.168.x.10`
- AI node: `192.168.x.20`
- Agent node: `192.168.x.30` when that process is split out

Set these on the core node in `/etc/tron-ai/tron-ai.env`:

- `OLLAMA_BASE_URL=http://192.168.x.20:11434`
- `STT_BASE_URL=http://192.168.x.20:8091`
- `VOICEVOX_BASE_URL=http://192.168.x.20:50021`

## Services that stay private

| Service | Port | Bind |
| --- | --- | --- |
| Ollama | 11434 | AI node private address only |
| STT worker | 8091 | AI node private address or localhost |
| VOICEVOX | 50021 | AI node private address only |

Do not publish 11434, 8091, or 50021 to the internet. Do not put them in Nginx or Cloudflare.

Ollama on the AI node should listen on the LAN address, for example `OLLAMA_HOST=192.168.x.20:11434`.

VOICEVOX should listen on the same private address. The Ubuntu package or engine command must not bind a public interface.

The STT unit is `deploy/ubuntu/systemd/tron-ai-stt.service`. Its env file is `/etc/tron-ai/tron-ai-stt.env`. `STT_HOST` should be the private address when the core node is another machine, and `127.0.0.1` when STT runs on the core node.
