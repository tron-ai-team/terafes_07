#!/usr/bin/env python3
"""Quiesced TRON-only DB/files backup; never restore into another app's schema."""
import argparse
import datetime
import fcntl
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import tempfile

spec = importlib.util.spec_from_file_location('release_manager', Path(__file__).with_name('release-manager.py'))
r = importlib.util.module_from_spec(spec)
spec.loader.exec_module(r)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--environment', choices=['production', 'staging'], required=True)
    parser.add_argument('--quiesce', action='store_true', required=True, help='Consent to a TRON-only maintenance window')
    args = parser.parse_args()
    os.umask(0o077)
    root = Path('/opt/tron-ai') / args.environment
    runtime = Path('/etc/tron-ai') / (args.environment + '.env')
    config = r.configuration(runtime, args.environment)
    with (root / '.release.lock').open('w') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        state = json.loads((root / 'state.json').read_text())
        release = r.Releases(root, args.environment, runtime)
        current = Path(state['current'])
        image = json.loads((current / 'release.json').read_text())['image']
        output = root / 'backups' / datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
        output.mkdir(parents=True, mode=0o700)
        try:
            release.compose(current, 'stop', 'frontend', 'backend')
            with tempfile.TemporaryDirectory() as scratch:
                defaults = Path(scratch) / 'mysql.cnf'
                def quote(value):
                    return '"' + value.replace('\\', '\\\\').replace('"', '\\"') + '"'
                defaults.write_text('[client]\nprotocol=SOCKET\nsocket=/run/mysqld/mysqld.sock\nuser=' + quote(config['DB_USERNAME']) + '\npassword=' + quote(config['DB_PASSWORD']) + '\n')
                with (output / 'database.sql').open('wb') as dump:
                    result = subprocess.run(['mysqldump', '--defaults-extra-file=' + str(defaults), '--single-transaction',
                                             '--no-tablespaces', '--skip-triggers', '--set-gtid-purged=OFF', config['DB_NAME']], stdout=dump, stderr=subprocess.PIPE)
                    r.require(result.returncode == 0, 'TRON database backup failed; incomplete backup must not be used')
            for volume in ['tron_ai_object_storage', 'tron_ai_uploads']:
                reference = 'tron-ai-' + args.environment + '_' + volume
                with (output / (volume + '.tar')).open('wb') as archive:
                    r.command(['docker', 'run', '--rm', '--network', 'none', '--read-only', '--cap-drop', 'ALL',
                               '--security-opt', 'no-new-privileges:true', '--memory', '128m', '--cpus', '0.25',
                               '-v', reference + ':/data:ro', '--entrypoint', 'tar', image, '-C', '/data', '-cf', '-', '.'], stdout=archive)
            (output / 'release-state.json').write_text(json.dumps(state))
            (output / 'COMPLETE').write_text('TRON DB/files quiesced snapshot. Encrypt and copy off-host; test restore separately.\n')
        finally:
            release.apply(current)
        print('Backup complete and TRON restarted; a disposable restore drill remains required:', output)


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print('Backup/restart failed; inspect restricted operator evidence:', error)
        raise SystemExit(1)
