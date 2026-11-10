"""Exercise the release gate with GitHub API responses and no network access."""

import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest


SCRIPT = Path(__file__).resolve().parents[1] / "scripts/verify-backend-release-target.sh"
SHA = "a" * 40
REPO = "tron-ai-team/terafes_07"


class BackendReleaseTargetTest(unittest.TestCase):
    def setUp(self):
        directory = self.enterContext(tempfile.TemporaryDirectory())
        gh = Path(directory) / "gh"
        gh.write_text("""#!/bin/sh
case "$2" in
  */branches/main) printf '%s' "$MOCK_BRANCH" ;;
  */deployment-branch-policies) printf '%s' "$MOCK_POLICY" ;;
  */deployment_protection_rules) printf '%s' "$MOCK_APP_RULES" ;;
  */environments/backend-production) test -n "$MOCK_ENV" && printf '%s' "$MOCK_ENV" ;;
  *) exit 99 ;;
esac
""")
        gh.chmod(0o755)
        self.env = {**os.environ, "PATH": directory + os.pathsep + os.environ["PATH"],
                    "GITHUB_REPOSITORY": REPO, "GITHUB_REF": "refs/heads/main", "GITHUB_SHA": SHA}
        self.branch = {"protected": True, "commit": {"sha": SHA}}
        self.environment = {"can_admins_bypass": False, "protection_rules": [{"type": "branch_policy"}],
                            "deployment_branch_policy": {"protected_branches": False,
                                                         "custom_branch_policies": True}}
        self.policy = {"total_count": 1, "branch_policies": [{"type": "branch", "name": "main"}]}
        self.apps = {"total_count": 0}

    def gate(self):
        env = {**self.env, "MOCK_BRANCH": json.dumps(self.branch), "MOCK_POLICY": json.dumps(self.policy),
               "MOCK_APP_RULES": json.dumps(self.apps),
               "MOCK_ENV": json.dumps(self.environment) if self.environment is not None else ""}
        return subprocess.run(["bash", str(SCRIPT)], env=env, capture_output=True, text=True, timeout=15)

    def test_protected_main_with_no_human_gate(self):
        result = self.gate()
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_stale_sha(self):
        self.branch["commit"]["sha"] = "b" * 40
        self.assertNotEqual(self.gate().returncode, 0)

    def test_unprotected_or_nonproduction_branch(self):
        self.branch["protected"] = False
        self.assertNotEqual(self.gate().returncode, 0)
        self.branch["protected"] = True
        self.env["GITHUB_REF"] = "refs/heads/feature"
        self.assertNotEqual(self.gate().returncode, 0)

    def test_wrong_policy_or_missing_environment(self):
        self.policy["branch_policies"][0]["type"] = "tag"
        self.assertNotEqual(self.gate().returncode, 0)
        self.policy["branch_policies"][0]["type"] = "branch"
        self.environment = None
        self.assertNotEqual(self.gate().returncode, 0)

    def test_reviewer_wait_and_bypass_rules(self):
        for rule in ("required_reviewers", "wait_timer", "deployment_protection_rule"):
            with self.subTest(rule=rule):
                self.environment["protection_rules"] = [{"type": rule}]
                self.assertNotEqual(self.gate().returncode, 0)
        self.environment["protection_rules"] = [{"type": "branch_policy"}]
        self.apps["total_count"] = 1
        self.assertNotEqual(self.gate().returncode, 0)
        self.apps["total_count"] = 0
        self.environment["can_admins_bypass"] = True
        self.assertNotEqual(self.gate().returncode, 0)
