import importlib.util
import io
import json
from pathlib import Path
import tarfile
import tempfile
import unittest
from unittest.mock import Mock, patch
import zipfile
import hashlib

spec = importlib.util.spec_from_file_location('release_manager', Path(__file__).parents[1] / 'scripts/release-manager.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
SHA = 'a' * 40
IMAGE = m.IMAGE + '@sha256:' + 'b' * 64


def bundle(member='index.html', kind=tarfile.REGTYPE):
    tar = io.BytesIO()
    with tarfile.open(fileobj=tar, mode='w:gz') as archive:
        info = tarfile.TarInfo(member)
        info.type = kind
        info.size = 2 if kind == tarfile.REGTYPE else 0
        archive.addfile(info, io.BytesIO(b'ok') if info.size else None)
    frontend = tar.getvalue()
    manifest = dict(repository=m.REPO, sha=SHA, image=IMAGE, frontend_sha256=hashlib.sha256(frontend).hexdigest())
    output = io.BytesIO()
    with zipfile.ZipFile(output, 'w') as archive:
        archive.writestr('release.json', json.dumps(manifest))
        archive.writestr('frontend.tar.gz', frontend)
    return output.getvalue()


class ReleaseTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.releases = m.Releases(self.root, 'production', self.root / 'runtime.env')
        self.previous = self.root / 'previous'
        self.target = self.root / 'target'
        for directory in [self.previous, self.target]:
            directory.mkdir()
            (directory / 'release.json').write_text(json.dumps(dict(sha=SHA, image=IMAGE)))
        self.releases.record(self.previous, None)
        self.releases.compose = Mock()
        self.releases.apply = Mock()
        self.inspect = patch.object(m, 'command', return_value=json.dumps({
            'org.opencontainers.image.revision': SHA,
            'org.opencontainers.image.source': 'https://github.com/' + m.REPO}).encode())
        self.inspect.start()
        self.addCleanup(self.inspect.stop)

    def current(self):
        return json.loads(self.releases.state.read_text())['current']

    def test_success_records_matched_release_and_prior_pair(self):
        self.releases.transact(self.target, self.previous)
        self.assertEqual(self.current(), str(self.target))
        self.assertEqual(json.loads(self.releases.state.read_text())['previous'], str(self.previous))

    def test_failed_pull_does_not_interrupt_previous_release(self):
        self.releases.compose.side_effect = [None, ValueError('pull failed')]
        with self.assertRaises(ValueError):
            self.releases.transact(self.target, self.previous)
        self.releases.apply.assert_not_called()
        self.assertEqual(self.current(), str(self.previous))

    def test_startup_readiness_and_frontend_failures_restore_previous_pair(self):
        for failure in ['container startup', 'readiness', 'frontend HTTP failure']:
            with self.subTest(failure=failure):
                self.releases.apply.reset_mock()
                self.releases.apply.side_effect = [RuntimeError(failure), None]
                with self.assertRaisesRegex(RuntimeError, 'previous frontend/backend restored'):
                    self.releases.transact(self.target, self.previous)
                self.assertEqual(self.releases.apply.call_args_list[0].args, (self.target,))
                self.assertEqual(self.releases.apply.call_args_list[1].args, (self.previous,))
                self.assertEqual(self.current(), str(self.previous))

    def test_recovery_failure_is_not_suppressed(self):
        self.releases.apply.side_effect = RuntimeError('failure')
        with self.assertRaisesRegex(RuntimeError, 'recovery FAILED'):
            self.releases.transact(self.target, self.previous)
        self.assertEqual(self.current(), str(self.previous))

    def test_first_release_failure_removes_only_project_containers_without_volumes(self):
        self.releases.apply.side_effect = RuntimeError('startup')
        with self.assertRaises(RuntimeError):
            self.releases.transact(self.target, None)
        self.assertEqual(self.releases.compose.call_args.args, (self.target, 'down'))

    def test_wrong_image_provenance_does_not_interrupt_running_pair(self):
        with patch.object(m, 'command', return_value=b'{}'):
            with self.assertRaisesRegex(ValueError, 'provenance'):
                self.releases.transact(self.target, self.previous)
        self.releases.apply.assert_not_called()

    def test_rollback_restores_previous_matched_release(self):
        self.releases.record(self.target, self.previous)
        self.releases.rollback()
        self.assertEqual(self.current(), str(self.previous))

    def test_bundle_rejects_traversal_and_links(self):
        for name, kind in [('../escape', tarfile.REGTYPE), ('/escape', tarfile.REGTYPE), ('link', tarfile.SYMTYPE)]:
            with self.subTest(name=name), tempfile.TemporaryDirectory() as directory:
                with self.assertRaisesRegex(ValueError, 'Unsafe'):
                    m.unpack(bundle(name, kind), Path(directory), SHA)

    def test_bundle_binds_frontend_backend_and_source(self):
        with tempfile.TemporaryDirectory() as directory:
            manifest = m.unpack(bundle(), Path(directory), SHA)
            self.assertEqual(manifest['image'], IMAGE)
            self.assertEqual((Path(directory) / 'frontend/index.html').read_text(), 'ok')
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaisesRegex(ValueError, 'source mismatch'):
                m.unpack(bundle(), Path(directory), 'c' * 40)

    def test_run_provenance_and_artifact_checksum(self):
        data = bundle()
        run = dict(status='completed', conclusion='success', event='workflow_dispatch', head_branch='main',
                   path='.github/workflows/publish-release.yml', head_sha=SHA)
        artifact = dict(id=1, name='release-bundle', expired=False, size_in_bytes=len(data),
                        digest='sha256:' + hashlib.sha256(data).hexdigest())
        with patch.object(m, 'api', side_effect=[run, {'status': 'ahead'}, {'artifacts': [artifact]}]), patch.object(m, 'command', return_value=data):
            self.assertEqual(m.approved('12'), (SHA, data))
        run['head_branch'] = 'feature'
        with patch.object(m, 'api', return_value=run):
            with self.assertRaisesRegex(ValueError, 'main publishing'):
                m.approved('12')
        with self.assertRaises(ValueError):
            m.approved('12; touch /tmp/unsafe')

    def test_production_staging_have_distinct_resources(self):
        staging = m.Releases(self.root, 'staging', self.root / 'staging.env')
        self.assertNotEqual(staging.project, self.releases.project)
        self.assertNotEqual(staging.port, self.releases.port)
        self.assertNotEqual(staging.frontend_port, self.releases.frontend_port)

    def test_runtime_configuration_rejects_placeholders_permissions_and_wrong_schema(self):
        sample = (Path(__file__).parents[1] / 'runtime.env.example').read_text()
        good = sample.replace('REPLACE_WITH_GENERATED_SECRET', 'synthetic-value-with-more-than-32-characters').replace('AI_NODE_PRIVATE_IP', '192.0.2.1').replace('REPLACE_WITH_VERIFIED_DIGEST', 'd' * 64).replace('REPLACE_WITH_RELAY_GROUP_GID', '12345')
        runtime = self.root / 'runtime.env'
        runtime.write_text(good)
        runtime.chmod(0o600)
        self.assertEqual(m.configuration(runtime, 'production')['DB_HOST'], 'mysql-proxy')
        for text in [sample, good.replace('DB_NAME=tron_ai', 'DB_NAME=other_application'),
                     good.replace('/api/tags', '/wrong'), good + '\nJWT_SECRET=duplicate']:
            runtime.write_text(text)
            with self.assertRaises(ValueError):
                m.configuration(runtime, 'production')
        runtime.write_text(good)
        runtime.chmod(0o644)
        with self.assertRaisesRegex(ValueError, 'owner-readable'):
            m.configuration(runtime, 'production')

    def test_apply_keeps_frontend_stopped_until_backend_readiness(self):
        releases = m.Releases(self.root, 'production', self.root / 'runtime.env')
        releases.compose = Mock()
        releases.health = Mock()
        events = []
        releases.compose.side_effect = lambda *args: events.append(args[1:])
        releases.health.side_effect = lambda: events.append(('readiness',))
        response = Mock()
        response.__enter__ = Mock(return_value=Mock(status=200))
        response.__exit__ = Mock(return_value=False)
        with patch.object(m.urllib.request, 'urlopen', return_value=response):
            releases.apply(self.target)
        self.assertEqual(events[0], ('stop', 'frontend'))
        self.assertEqual(events[2], ('readiness',))
        self.assertEqual(events[3][-1], 'frontend')

    def test_ssh_inputs_cannot_inject_commands(self):
        import subprocess, os
        env = dict(os.environ, DEPLOY_HOST='example.invalid', DEPLOY_USER='tron', DEPLOY_KEY='synthetic-key',
                   DEPLOY_KNOWN_HOSTS='synthetic-host-pin', RELEASE_RUN='12; echo unsafe', DEPLOY_ENVIRONMENT='production')
        script = Path(__file__).parents[1] / 'scripts/ssh-deploy.sh'
        result = subprocess.run(['bash', str(script)], env=env, capture_output=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn(b'Invalid publishing run', result.stdout)
        self.assertNotIn(b'unsafe', result.stdout)

    def test_interrupted_transaction_restores_previous_pair_before_next_operation(self):
        self.releases.journal.write_text(json.dumps({'target': str(self.target), 'previous': str(self.previous)}))
        self.releases.recover_interrupted()
        self.releases.apply.assert_called_once_with(self.previous)
        self.assertFalse(self.releases.journal.exists())
        self.assertEqual(self.current(), str(self.previous))

    def test_committed_release_survives_interruption_before_journal_cleanup(self):
        self.releases.record(self.target, self.previous)
        self.releases.journal.write_text(json.dumps({'target': str(self.target), 'previous': str(self.previous)}))
        self.releases.recover_interrupted()
        self.releases.apply.assert_called_once_with(self.target)
        self.assertEqual(self.current(), str(self.target))

    def test_failed_record_write_recovers_previous_pair(self):
        with patch.object(self.releases, 'record', side_effect=OSError('state write failed')):
            with self.assertRaisesRegex(RuntimeError, 'previous frontend/backend restored'):
                self.releases.transact(self.target, self.previous)
        self.assertEqual(self.releases.apply.call_count, 2)
        self.assertEqual(self.current(), str(self.previous))


if __name__ == '__main__':
    unittest.main()
