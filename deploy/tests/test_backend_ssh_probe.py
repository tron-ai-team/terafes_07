"""Check that the connectivity probe distinguishes the forced command from SSH failures."""

import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"


class BackendSshProbeTest(unittest.TestCase):
    def setUp(self):
        directory = Path(self.enterContext(tempfile.TemporaryDirectory()))
        for name, script in {
            "tailscale": 'printf "%s\\n" "$PROBE_PEER"',
            "ip": 'printf "%s\\n" "$PROBE_ROUTE"',
            "ssh": '''printf '%s\\n' "$@" > "$PROBE_ARGS"
case "$PROBE_CASE" in
  forced)
    for last do :; done
    export SSH_ORIGINAL_COMMAND="$last"
    exec "$PROBE_PYTHON" "$PROBE_CONTROLLER" ssh ;;
  unrestricted) echo TRON_UNAUTHORIZED_COMMAND_EXECUTED ;;
  auth) echo 'Permission denied (publickey).' >&2; exit 255 ;;
  generic) echo 'Some other error' >&2; exit 1 ;;
esac''',
        }.items():
            path = directory / name
            path.write_text("#!/bin/sh\n" + script + "\n")
            path.chmod(0o755)
        self.args = directory / "arguments"
        self.env = {**os.environ, "PATH": str(directory) + os.pathsep + os.environ["PATH"],
                    "SSH_HOST": "target.example.ts.net", "SSH_KEY": "synthetic-key",
                    "SSH_KNOWN_HOSTS": "synthetic-pin", "PROBE_ARGS": str(self.args),
                    "PROBE_PYTHON": sys.executable, "PROBE_CONTROLLER": str(SCRIPTS / "backend-production.py"),
                    "PROBE_PEER": "100.100.12.34", "PROBE_ROUTE": "100.100.12.34 dev tailscale0 table 52"}

    def probe(self, case="forced"):
        return subprocess.run(["bash", str(SCRIPTS / "probe-backend-ssh.sh")],
                              env={**self.env, "PROBE_CASE": case}, capture_output=True, text=True, timeout=15)

    def test_accepts_only_the_authenticated_controller_rejection(self):
        result = self.probe()
        self.assertEqual(result.returncode, 0, result.stderr)
        args = self.args.read_text().splitlines()
        self.assertIn("StrictHostKeyChecking=yes", args)
        self.assertIn("HostKeyAlias=target.example.ts.net", args)
        self.assertIn("tron-backend-cd@100.100.12.34", args)
        self.assertEqual(args[-1], r"printf '%s\n' TRON_UNAUTHORIZED_COMMAND_EXECUTED")

    def test_transport_errors_and_unrestricted_commands_do_not_pass(self):
        for case in ("auth", "generic", "unrestricted"):
            with self.subTest(case=case):
                result = self.probe(case)
                self.assertNotEqual(result.returncode, 0)
                self.assertIn("expected forced-command rejection", result.stderr)
                self.assertNotIn("TRON_UNAUTHORIZED_COMMAND_EXECUTED", result.stdout + result.stderr)

    def test_public_or_misrouted_address_does_not_reach_ssh(self):
        self.env["PROBE_ROUTE"] = "100.100.12.34 via 10.0.0.1 dev eth0"
        self.assertNotEqual(self.probe().returncode, 0)
        self.env["PROBE_PEER"] = "192.0.2.20"
        self.assertNotEqual(self.probe().returncode, 0)
        self.assertFalse(self.args.exists())
