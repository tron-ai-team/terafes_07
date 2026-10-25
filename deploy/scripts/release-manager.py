#!/usr/bin/env python3
"""Fail-closed, environment-isolated release transactions. No database rollback."""
import argparse
import fcntl
import hashlib
import io
import json
import os
from pathlib import Path
import re
import shutil
import signal
import stat
import subprocess
import sys
import tarfile
import time
import urllib.request
import zipfile

REPO = 'tron-ai-team/terafes_07'
IMAGE = f'ghcr.io/{REPO}/tron-ai-backend'
DIGEST = r'sha256:[0-9a-f]{64}'
SHA = r'[0-9a-f]{40}'


def require(ok, message):
    if not ok:
        raise ValueError(message)


def command(args, **kwargs):
    # Do not echo commands/output: Compose and process errors can contain secrets.
    output = kwargs.pop('stdout', subprocess.PIPE)
    kwargs.setdefault('timeout', 600)
    result = subprocess.run(args, stdout=output, stderr=subprocess.PIPE, **kwargs)
    require(result.returncode == 0, f'{args[0]} operation failed; inspect restricted operator logs')
    return result.stdout


def api(path):
    return json.loads(command(['gh', 'api', f'repos/{REPO}/{path}']))


def approved(run):
    require(re.fullmatch(r'[1-9][0-9]*', str(run)), 'Release run must be a positive numeric GitHub run ID')
    info = api(f'actions/runs/{run}')
    require(info['status'] == 'completed' and info['conclusion'] == 'success', 'Publishing run is not successful')
    require(info['event'] == 'workflow_dispatch' and info['head_branch'] == 'main'
            and info['path'] == '.github/workflows/publish-release.yml', 'Release must originate from the main publishing workflow')
    sha = info['head_sha']
    require(re.fullmatch(SHA, sha), 'Invalid source SHA')
    comparison = api(f'compare/{sha}...main')
    require(comparison['status'] in ('identical', 'ahead'), 'Release SHA is not in approved main history')
    artifacts = api(f'actions/runs/{run}/artifacts?per_page=100')['artifacts']
    artifacts = [a for a in artifacts if a['name'] == 'release-bundle' and not a['expired']]
    require(len(artifacts) == 1, 'Exactly one unexpired release-bundle artifact is required')
    artifact = artifacts[0]
    require(artifact['size_in_bytes'] < 128 * 1024 * 1024, 'Release artifact exceeds size limit')
    require(re.fullmatch(DIGEST, artifact.get('digest', '')), 'GitHub artifact SHA-256 digest is unavailable; upgrade artifact publication')
    data = command(['gh', 'api', f'repos/{REPO}/actions/artifacts/{artifact["id"]}/zip'])
    require('sha256:' + hashlib.sha256(data).hexdigest() == artifact['digest'], 'GitHub artifact digest mismatch')
    return sha, data


def unpack(data, directory, sha):
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        require(set(archive.namelist()) == {'release.json', 'frontend.tar.gz'}, 'Unexpected release bundle contents')
        require(sum(i.file_size for i in archive.infolist()) < 128 * 1024 * 1024, 'Release bundle too large')
        manifest = json.loads(archive.read('release.json'))
        frontend = archive.read('frontend.tar.gz')
    require(manifest.get('repository') == REPO and manifest.get('sha') == sha, 'Release source mismatch')
    require(re.fullmatch(re.escape(IMAGE) + '@' + DIGEST, manifest.get('image', '')), 'Backend must use this repository image by immutable digest')
    require(manifest.get('frontend_sha256') == hashlib.sha256(frontend).hexdigest(), 'Frontend checksum mismatch')
    target = directory / 'frontend'
    target.mkdir()
    with tarfile.open(fileobj=io.BytesIO(frontend), mode='r:gz') as archive:
        members = archive.getmembers()
        require(sum(m.size for m in members) < 256 * 1024 * 1024, 'Frontend expands beyond size limit')
        for member in members:
            path = Path(member.name)
            require(not path.is_absolute() and '..' not in path.parts and (member.isdir() or member.isfile()), 'Unsafe frontend archive member')
        # No links/devices are accepted, on Python versions without extraction filters too.
        archive.extractall(target, members=members, filter='data')
    require((target / 'index.html').is_file(), 'Frontend index.html is missing')
    (directory / 'release.json').write_text(json.dumps(manifest, indent=2))
    return manifest


def configuration(path, environment):
    require(path.is_file(), f'Missing runtime configuration: {path}')
    require(not (stat.S_IMODE(path.stat().st_mode) & 0o077), 'Runtime env must be owner-readable only (chmod 600)')
    result = {}
    for line in path.read_text().splitlines():
        if not line.strip() or line.lstrip().startswith('#'):
            continue
        require('=' in line, 'Runtime env requires KEY=value lines, never shell commands')
        key, value = line.split('=', 1)
        require(re.fullmatch(r'[A-Z][A-Z0-9_]*', key), 'Invalid runtime env key')
        require(key not in result, f'Duplicate runtime setting: {key}')
        require(not any(c in value for c in ['\x00', '$', '`', '\r', '"', "'", '#']), f'Unsupported quoting/interpolation in {key}; use literal unquoted values')
        result[key] = value
    required = ['DB_HOST', 'DB_NAME', 'DB_USERNAME', 'DB_PASSWORD', 'JWT_SECRET', 'CORS_ALLOWED_ORIGINS',
                'TRON_FRONTEND_URL', 'TRON_PUBLIC_API_URL', 'OLLAMA_BASE_URL', 'TRON_OLLAMA_HEALTH_URL',
                'TRON_GOTENBERG_IMAGE', 'TRON_FRONTEND_IMAGE', 'TRON_MYSQL_PROXY_IMAGE']
    for key in required:
        value = result.get(key, '')
        require(value and not re.search(r'replace|placeholder|YOUR_|AI_NODE', value, re.I), f'Missing or placeholder setting: {key}')
    require(result['DB_NAME'] == ('tron_ai' if environment == 'production' else 'tron_ai_staging'), 'Database name does not match the isolated environment')
    require(len(result['JWT_SECRET']) >= 32, 'JWT_SECRET requires at least 32 characters')
    require(re.fullmatch(r'gotenberg/gotenberg@' + DIGEST, result['TRON_GOTENBERG_IMAGE']), 'Pin Gotenberg by digest')
    require(re.fullmatch(r'nginx@' + DIGEST, result['TRON_FRONTEND_IMAGE']), 'Pin frontend Nginx by digest')
    require(result['DB_HOST'] == 'mysql-proxy', 'Use the private Unix-socket proxy; do not expose host MySQL')
    require(re.fullmatch(r'alpine/socat@' + DIGEST, result['TRON_MYSQL_PROXY_IMAGE']), 'Pin MySQL socket proxy by digest')
    for key, maximum in [('TRON_BACKEND_CPUS', 1.0), ('TRON_GOTENBERG_CPUS', 0.5)]:
        require(0 < float(result.get(key, maximum)) <= maximum, f'{key} exceeds the conservative server limit')
    for key in ['OLLAMA_BASE_URL', 'TRON_OLLAMA_HEALTH_URL']:
        require(result[key].startswith(('http://', 'https://')), f'Invalid URL in {key}')
    require(result['TRON_OLLAMA_HEALTH_URL'].rstrip('/') == result['OLLAMA_BASE_URL'].rstrip('/') + '/api/tags', 'Hybrid health URL must match the Ollama endpoint')
    return result


class Releases:
    def __init__(self, root, environment, runtime):
        self.root, self.environment, self.runtime = Path(root), environment, Path(runtime)
        self.port = 18080 if environment == 'production' else 28080
        self.frontend_port = self.port + 1
        self.project = 'tron-ai-' + environment
        self.state = self.root / 'state.json'
        self.journal = self.root / 'pending.json'

    def compose(self, release, *args, output=subprocess.PIPE):
        # Ambient CI/operator interpolation must not override a release's immutable pins.
        runtime_keys = configuration(self.runtime, self.environment)
        env = {k: v for k, v in os.environ.items() if k not in runtime_keys and not k.startswith(('TRON_', 'COMPOSE_'))}
        return command(['docker', 'compose', '--project-name', self.project,
                        '--env-file', str(self.runtime), '--env-file', str(release / 'compose.env'),
                        '-f', str(release / 'compose.yml'), *args], env=env, stdout=output)

    def health(self):
        for _ in range(40):
            try:
                with urllib.request.urlopen(f'http://127.0.0.1:{self.port}/health/ready', timeout=5) as response:
                    if response.status == 200 and json.load(response).get('status') == 'ready':
                        return
            except (OSError, ValueError):
                pass
            time.sleep(3)
        raise RuntimeError('Application/database/storage readiness failed; external AI is checked separately at /health')

    def apply(self, release):
        # Short TRON-only maintenance window avoids serving a new frontend against an old backend.
        self.compose(release, 'stop', 'frontend')
        self.compose(release, 'up', '-d', '--wait', '--wait-timeout', '180', 'mysql-proxy', 'gotenberg', 'backend')
        self.health()
        self.compose(release, 'up', '-d', '--wait', '--wait-timeout', '60', 'frontend')
        with urllib.request.urlopen(f'http://127.0.0.1:{self.frontend_port}/', timeout=5) as response:
            require(response.status == 200, 'Frontend smoke check failed')

    def record(self, current, previous):
        pending = self.state.with_suffix('.tmp')
        pending.write_text(json.dumps({'current': str(current), 'previous': str(previous) if previous else None}))
        pending.replace(self.state)

    def recover_interrupted(self):
        if not self.journal.exists():
            return
        pending = json.loads(self.journal.read_text())
        target = Path(pending['target'])
        previous = Path(pending['previous']) if pending['previous'] else None
        committed = json.loads(self.state.read_text())['current'] if self.state.exists() else None
        if committed == str(target):
            self.apply(target)
        elif previous:
            self.apply(previous)
        else:
            self.compose(target, 'down')
        self.journal.unlink()

    def transact(self, target, previous):
        # Pull and validate both artifacts before interrupting the working release.
        self.compose(target, 'config', '--quiet')
        self.compose(target, 'pull')
        manifest = json.loads((target / 'release.json').read_text())
        labels = json.loads(command(['docker', 'image', 'inspect', manifest['image'], '--format', '{{json .Config.Labels}}']))
        require(isinstance(labels, dict), 'Backend provenance labels are absent')
        require(labels.get('org.opencontainers.image.revision') == manifest['sha']
                and labels.get('org.opencontainers.image.source') == f'https://github.com/{REPO}', 'Pulled backend provenance labels do not match the approved manifest')
        journal_temp = self.journal.with_suffix('.tmp')
        journal_temp.write_text(json.dumps({'target': str(target), 'previous': str(previous) if previous else None}))
        journal_temp.replace(self.journal)
        try:
            self.apply(target)
            self.record(target, previous)
        except BaseException as original:
            try:
                if previous:
                    self.apply(previous)
                else:
                    self.compose(target, 'down')  # This project's containers/network only; never volumes.
            except Exception as recovery:
                raise RuntimeError('TRON recovery FAILED; operator intervention required. Database was not reverted.') from recovery
            self.journal.unlink()
            raise RuntimeError('Release failed; previous frontend/backend restored (or first-release containers removed). Database was not reverted.') from original
        self.journal.unlink()

    def deploy(self, run):
        sha, data = approved(run)
        target = self.root / 'releases' / f'{sha}-{run}'
        require(not target.exists(), 'Release directory already exists; inspect state or choose another publishing run')
        target.mkdir(parents=True)
        manifest = unpack(data, target, sha)
        source = Path(__file__).resolve().parents[1]
        shutil.copyfile(source / 'compose.prod.yml', target / 'compose.yml')
        shutil.copyfile(source / 'nginx/private.conf', target / 'nginx.conf')
        pins = {'TRON_ENV_FILE': str(self.runtime), 'TRON_BACKEND_IMAGE': manifest['image'],
                'TRON_FRONTEND_DIR': str(target / 'frontend'), 'TRON_NGINX_CONFIG': str(target / 'nginx.conf'),
                'TRON_BACKEND_HOST_PORT': str(self.port), 'TRON_FRONTEND_HOST_PORT': str(self.frontend_port)}
        (target / 'compose.env').write_text(''.join(f'{key}={value}\n' for key, value in pins.items()))
        old = json.loads(self.state.read_text())['current'] if self.state.exists() else None
        self.transact(target, Path(old) if old else None)

    def rollback(self):
        require(self.state.exists(), 'No successful release is recorded')
        state = json.loads(self.state.read_text())
        require(state['previous'], 'No previous matched release is available; database restore is a separate operation')
        self.transact(Path(state['previous']), Path(state['current']))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['deploy', 'rollback', 'validate'])
    parser.add_argument('--environment', choices=['production', 'staging'], required=True)
    parser.add_argument('--run')
    args = parser.parse_args()
    root = Path('/opt/tron-ai') / args.environment
    runtime = Path('/etc/tron-ai') / (args.environment + '.env')
    configuration(runtime, args.environment)
    if args.action == 'validate':
        print('Runtime configuration valid; connectivity and restore evidence still required')
        return
    require(root.is_dir(), f'Administrator must prepare writable isolated directory {root}')
    with (root / '.release.lock').open('w') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        def interrupted(signum, frame):
            raise RuntimeError('Release interrupted; matched-release recovery is required')
        for signum in [signal.SIGTERM, signal.SIGHUP]:
            signal.signal(signum, interrupted)
        releases = Releases(root, args.environment, runtime)
        releases.recover_interrupted()
        if args.action == 'deploy':
            require(args.run, '--run is required for deployment')
            releases.deploy(args.run)
        else:
            releases.rollback()
    print('Matched release ready. Database migrations were NOT reversed; inspect /health for external AI status.')


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print(f'Release blocked: {error}', file=sys.stderr)
        sys.exit(1)
