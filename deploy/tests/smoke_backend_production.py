"""Exercise the real image and controller against a disposable runner's Docker daemon."""
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import tempfile
from unittest.mock import patch

assert os.environ.get("GITHUB_ACTIONS") == "true" and os.environ.get("RUNNER_ENVIRONMENT") == "github-hosted", (
    "Run only on a disposable GitHub-hosted runner"
)
here = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("controller", here.parent / "scripts/backend-production.py")
controller = importlib.util.module_from_spec(spec)
spec.loader.exec_module(controller)

# The inherited Compose commands and controller must point at the same local engine.
subprocess.run(["docker", "context", "use", "default"], check=True)
with tempfile.TemporaryDirectory() as directory:
    controller.STATE = Path(directory)
    controller.BASE = here / "fixtures/backend-production.compose.yml"
    controller.ENV_FILE = controller.STATE / "test.env"
    controller.ENV_FILE.touch()
    controller.OVERRIDE = controller.STATE / "compose.backend.json"
    controller.JOURNAL = controller.STATE / "transaction.json"
    controller.PUBLIC = controller.LOCAL  # Public Cloudflare routing is verified only at deployment time.
    command = ["docker", "compose", "--project-name", controller.PROJECT, "--env-file",
               str(controller.ENV_FILE), "-f", str(controller.BASE)]

    # A runner must never inherit an existing stack or the fixture volume names.
    for resource, filters in (("container", ["-a"]), ("volume", []), ("network", [])):
        existing = subprocess.check_output(["docker", resource, "ls", "-q", *filters, "--filter",
                                            "label=com.docker.compose.project=tron-ai"], text=True)
        assert not existing.strip(), f"Expected no existing tron-ai {resource}s"
    try:
        subprocess.run([*command, "up", "-d", "--wait", "--wait-timeout", "300"], check=True, timeout=500)
        baseline = controller.preflight()
        dependencies = {service: controller.inspect_container(service)["Id"] for service in ("mysql", "gotenberg")}
        controller.healthy(baseline["Image"], candidate=True, seconds=20)
        # Same jar/migrations, but deliberately cannot serve requests. Mock the
        # remote authorization boundary only; Compose replacement and rollback are real.
        broken = "tron-ai-backend:ci-broken"
        subprocess.run(["docker", "build", "-t", broken, "-f", "-", directory],
                       input='FROM tron-ai-backend:ci\nENTRYPOINT ["/bin/false"]\n', text=True, check=True, timeout=90)
        broken_id = subprocess.check_output(["docker", "image", "inspect", "--format={{.Id}}", broken],
                                            text=True).strip()
        original_health = controller.healthy
        saw_broken_candidate = False

        def fixture_health(image_id, candidate=False, seconds=240):
            global saw_broken_candidate
            if image_id == broken_id:
                saw_broken_candidate = controller.inspect_container("backend")["Image"] == broken_id
            return original_health(image_id, candidate, min(12, seconds) if image_id == broken_id else seconds)

        with (patch.object(controller, "verify_main"),
              patch.object(controller, "verify_lineage"),
              patch.object(controller, "pull_verified", return_value=(broken, broken_id)),
              patch.object(controller, "healthy", side_effect=fixture_health)):
            try:
                controller.deploy("a" * 40, "sha256:" + "b" * 64)
            except controller.ReleaseError as error:
                assert str(error).startswith("Release failed; the previous backend was restored"), str(error)
            else:
                raise AssertionError("An unhealthy candidate must fail the release")
        assert saw_broken_candidate, "The unhealthy image must have replaced the baseline before rollback"
        restored = controller.preflight()
        assert restored["Image"] == baseline["Image"] and restored["Mounts"] == baseline["Mounts"]
        journal = json.loads(controller.JOURNAL.read_text())
        assert journal["rolled_back"] and not journal["pending"]
        assert dependencies == {service: controller.inspect_container(service)["Id"]
                                for service in dependencies}
        print("Dedicated MySQL/Gotenberg smoke and backend-only rollback passed.")
    except Exception as error:
        # The fixture contains only synthetic data and credentials.
        if isinstance(error.__cause__, subprocess.CalledProcessError):
            print(error.__cause__.stderr, flush=True)
        subprocess.run([*command, "logs", "--tail", "80"], check=False, timeout=25)
        raise
    finally:
        subprocess.run([*command, "down"], check=True, timeout=90)
