"""Render real Compose configuration without a daemon or runtime secrets."""
import json
import os
from pathlib import Path
import subprocess
import tempfile

root = Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory() as temporary:
    directory = Path(temporary)
    runtime = directory / 'runtime.env'
    text = (root / 'runtime.env.example').read_text().replace('REPLACE_WITH_GENERATED_SECRET', 'synthetic-test-value-with-more-than-32-characters').replace('AI_NODE_PRIVATE_IP', '192.0.2.1').replace('REPLACE_WITH_VERIFIED_DIGEST', 'a' * 64)
    runtime.write_text(text)
    runtime.chmod(0o600)
    renders = []
    for environment, port in [('production', 18080), ('staging', 28080)]:
        pins = directory / 'pins.env'
        pins.write_text(f'TRON_ENV_FILE={runtime}\nTRON_BACKEND_IMAGE=ghcr.io/tron-ai-team/terafes_07/tron-ai-backend@sha256:{"b"*64}\nTRON_FRONTEND_DIR={directory/environment}\nTRON_NGINX_CONFIG={root}/nginx/private.conf\nTRON_BACKEND_HOST_PORT={port}\nTRON_FRONTEND_HOST_PORT={port+1}\n')
        env = {k: v for k, v in os.environ.items() if not k.startswith(('TRON_', 'COMPOSE_'))}
        result = subprocess.run(['docker', 'compose', '-p', 'tron-ai-' + environment, '--env-file', str(runtime), '--env-file', str(pins), '-f', str(root/'compose.prod.yml'), 'config', '--format', 'json'], env=env, check=True, capture_output=True)
        config = json.loads(result.stdout)
        assert 'ports' not in config['services']['gotenberg']
        assert 'ports' not in config['services']['mysql-proxy']
        for service in config['services'].values():
            assert 'container_name' not in service
            for published in service.get('ports', []):
                assert published['host_ip'] == '127.0.0.1'
        assert config['services']['backend']['ports'][0]['published'] == str(port)
        assert config['services']['frontend']['ports'][0]['published'] == str(port + 1)
        assert 'sha256:' in config['services']['backend']['image']
        renders.append(config)
    for key in ['networks', 'volumes']:
        assert set(x['name'] for x in renders[0][key].values()).isdisjoint(x['name'] for x in renders[1][key].values())
print('Production/staging Compose isolation verified; no containers were started')
