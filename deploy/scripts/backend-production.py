#!/usr/bin/python3 -I
"""Host-side controller for the existing tron-ai Compose project (Ubuntu only)."""

import fcntl
import hashlib
import json
import os
from pathlib import Path
import platform
import pwd
import re
import signal
import stat
import subprocess
import sys
import tempfile
import time
import urllib.request
import uuid
import zipfile

REPO = "tron-ai-team/terafes_07"
PACKAGE = f"ghcr.io/{REPO}/tron-ai-backend"
WORKFLOW = f"{REPO}/.github/workflows/backend-production.yml"
PROGRAM = "/usr/local/sbin/tron-backend-release"
STATE = Path("/var/lib/tron-backend-release")
BASE = Path("/opt/tron-ai/deploy/compose.prod.yml")
ENV_FILE = Path("/etc/tron-ai/tron-ai.env")
OVERRIDE = STATE / "compose.backend.json"
JOURNAL = STATE / "transaction.json"
TOKEN_FILE = Path("/etc/tron-ai/backend-release-github.token")
PROJECT = "tron-ai"
CONTAINERS = {"backend": "tron-ai-backend", "mysql": "tron-ai-mysql", "gotenberg": "tron-ai-gotenberg"}
LOCAL = "http://127.0.0.1:18080"
PUBLIC = "https://api.tronai.tech"
DIGEST = r"sha256:[0-9a-f]{64}"
REQUEST = re.compile(rf"deploy ([0-9a-f]{{40}}) ({DIGEST})")
ALIAS = r"tron-ai-backend-rollback:sha-[0-9a-f]{64}"


class ReleaseError(Exception):
    pass


def require(condition, message):
    if not condition:
        raise ReleaseError(message)


def run(*args, label, timeout=45, extra_env=None):
    # Compose and Docker diagnostics can include runtime secrets; never print raw output.
    env = {"PATH": "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
           "HOME": pwd.getpwuid(os.geteuid()).pw_dir,
           "DOCKER_HOST": "unix:///var/run/docker.sock", "GH_PROMPT_DISABLED": "1",
           "COMPOSE_REMOVE_ORPHANS": "false", "COMPOSE_IGNORE_ORPHANS": "true"}
    env.update(extra_env or {})
    try:
        return subprocess.run(args, check=True, capture_output=True, text=True,
                              env=env, cwd="/", timeout=timeout).stdout.strip()
    except (subprocess.SubprocessError, OSError) as error:
        raise ReleaseError(f"{label} failed; inspect locally on Ubuntu") from error


def compose(*args, override=None, timeout=45):
    command = ["docker", "compose", "--project-name", PROJECT, "--project-directory",
               str(BASE.parent), "--env-file", str(ENV_FILE), "-f", str(BASE)]
    if override is not None:
        command.extend(("-f", str(override)))
    return run(*command, *args, timeout=timeout, label=f"Compose {args[0]}")


def atomic_json(path, value):
    with tempfile.NamedTemporaryFile(mode="w", dir=path.parent, delete=False) as temp:
        temporary = Path(temp.name)
        try:
            json.dump(value, temp)
            temp.flush()
            os.fsync(temp.fileno())
            temporary.replace(path)
            sync_state()
        finally:
            temporary.unlink(missing_ok=True)


def sync_state():
    fd = os.open(STATE, os.O_DIRECTORY)
    try:
        os.fsync(fd)
    finally:
        os.close(fd)


def image_override(image):
    return {"services": {"backend": {"image": image}}}


def inspect_container(service):
    value, = json.loads(run("docker", "container", "inspect", CONTAINERS[service],
                            label=f"Inspect TRON {service}"))
    labels = value["Config"]["Labels"]
    require(labels.get("com.docker.compose.project") == PROJECT and
            labels.get("com.docker.compose.service") == service and
            labels.get("com.docker.compose.oneoff", "").lower() == "false",
            f"Container {service} does not belong to the expected Compose project")
    return value


def compose_hash(override):
    result = compose("config", "--hash=backend", override=override).split()
    require(len(result) == 2 and result[0] == "backend" and re.fullmatch(r"[0-9a-f]{64}", result[1]),
            "Unexpected Compose service hash format")
    return result[1]


def drift_guard(backend):
    # Re-render with the image ref the live container was created with. This catches
    # a different Compose version/configuration or changed runtime env before recreation.
    with tempfile.TemporaryDirectory(dir=STATE) as directory:
        candidate = Path(directory) / "verify.json"
        atomic_json(candidate, image_override(backend["Config"]["Image"]))
        require(compose_hash(candidate) == backend["Config"]["Labels"].get("com.docker.compose.config-hash"),
                "Installed Compose settings differ from the running backend; reconcile with an operator")
    # If the backend was already deployed by this controller, its durable override
    # must still point at the image actually running.
    if OVERRIDE.exists():
        require(json.loads(OVERRIDE.read_text()) == image_override(backend["Config"]["Image"]),
                "Saved image override does not match the running backend")
    else:
        require(compose_hash(None) == backend["Config"]["Labels"].get("com.docker.compose.config-hash"),
                "Installed Compose does not reproduce the running backend without an override")


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


HTTP = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect())


def read_json(url, headers=None):
    request = urllib.request.Request(url, headers=headers or {})
    with HTTP.open(request, timeout=5) as response:
        if response.status != 200:
            return {}
        return json.loads(response.read(65536))


def probe(base, path, expected):
    try:
        value = read_json(f"{base}{path}?release_probe={uuid.uuid4().hex}", {"Cache-Control": "no-cache"})
        return isinstance(value, dict) and all(value.get(k) == v for k, v in expected.items())
    except (OSError, ValueError):
        return False


def healthy(image_id, candidate=False, seconds=240):
    deadline = time.monotonic() + seconds
    while True:
        try:
            value = inspect_container("backend")
            state = value["State"]
            local_ok = state["Running"] and state.get("Health", {}).get("Status") == "healthy"
            if local_ok and value["Image"] == image_id:
                ready = not candidate or probe(LOCAL, "/health/ready",
                                                {"status": "ready", "database": "reachable", "storage": "reachable"})
                if ready and probe(LOCAL, "/actuator/health", {"status": "UP"}) and probe(
                        PUBLIC, "/actuator/health", {"status": "UP"}):
                    return
        except ReleaseError:
            pass
        if time.monotonic() >= deadline:
            raise ReleaseError("Backend did not pass container, loopback and public health checks")
        time.sleep(3)


def preflight():
    require(platform.machine() == "x86_64", "Release image requires linux/amd64")
    require(BASE.is_file() and ENV_FILE.is_file(), "Expected installed Compose and runtime env are missing")
    model = json.loads(compose("config", "--format", "json"))
    services = model["services"]
    require(model.get("name") == PROJECT and set(services) == set(CONTAINERS) and
            all(services[key].get("container_name") == name for key, name in CONTAINERS.items()),
            "Installed Compose does not match the existing dedicated TRON stack")
    backend = services["backend"]
    require(not backend.get("build") and backend["environment"].get("DB_HOST") == "mysql" and
            backend["environment"].get("GOTENBERG_URL") == "http://gotenberg:3000",
            "Backend Compose dependencies differ from the approved topology")
    require(not services["mysql"].get("ports") and not services["gotenberg"].get("ports") and
            len(backend.get("ports", [])) == 1 and
            backend["ports"][0].get("host_ip") == "127.0.0.1" and
            str(backend["ports"][0].get("published")) == "18080" and
            str(backend["ports"][0].get("target")) == "8080", "Unexpected TRON Compose port exposure")
    for service in ("mysql", "gotenberg"):
        value = inspect_container(service)
        require(value["State"]["Running"] and value["State"].get("Health", {}).get("Status") == "healthy" and
                value["HostConfig"].get("PortBindings") in (None, {}),
                f"TRON {service} must already be healthy and private")
    current = inspect_container("backend")
    require(current["HostConfig"].get("PortBindings") ==
            {"8080/tcp": [{"HostIp": "127.0.0.1", "HostPort": "18080"}]},
            "The live backend port binding is not the expected loopback mapping")
    drift_guard(current)
    healthy(current["Image"], seconds=0)
    print("TRON Compose identity and baseline health verified.", flush=True)
    return current


def github_api(path):
    try:
        return read_json(f"https://api.github.com/repos/{REPO}/{path}",
                         {"Authorization": f"Bearer {TOKEN_FILE.read_text().strip()}",
                          "Accept": "application/vnd.github+json", "User-Agent": "tron-backend-release"})
    except (OSError, ValueError):
        raise ReleaseError("Unable to verify the release commit with GitHub") from None


def verify_main(sha):
    require(github_api("git/ref/heads/main").get("object", {}).get("sha") == sha,
            "Release is no longer the head of main")


def verify_lineage(current, sha):
    value, = json.loads(run("docker", "image", "inspect", current["Image"], label="Inspect live image revision"))
    labels = value["Config"].get("Labels") or {}
    live = labels.get("org.opencontainers.image.revision", "")
    require(labels.get("org.opencontainers.image.source") == f"https://github.com/{REPO}" and
            re.fullmatch(r"[0-9a-f]{40}", live), "Live image has no verifiable repository revision")
    if live != sha:
        # The compare API reports ancestry on every page, but includes file
        # patches only on page one. Avoid retrieving a potentially large diff.
        comparison = github_api(f"compare/{live}...{sha}?per_page=1&page=2")
        require(comparison.get("status") == "ahead" and comparison.get("behind_by") == 0,
                "Live revision is not an ancestor of main; reconcile production before enabling deployment")


def config_fingerprint():
    return {str(path): hashlib.sha256(path.read_bytes()).hexdigest() for path in (BASE, ENV_FILE)}


def pull_verified(sha, digest):
    image = f"{PACKAGE}@{digest}"
    run("gh", "attestation", "verify", "oci://" + image, "--repo", REPO,
        "--signer-workflow", WORKFLOW, "--source-ref", "refs/heads/main", "--source-digest", sha,
        "--deny-self-hosted-runners", label="Verify GitHub image attestation", timeout=90,
        extra_env={"GH_TOKEN": TOKEN_FILE.read_text().strip()})
    run("docker", "pull", image, label="Pull attested backend", timeout=240)
    value, = json.loads(run("docker", "image", "inspect", image, label="Inspect attested image"))
    require(image in value["RepoDigests"] and value["Os"] == "linux" and value["Architecture"] == "amd64"
            and not value["Config"].get("Volumes"), "Unexpected candidate image digest, platform or volumes")
    return image, value["Id"]


def migration_hashes(container, destination):
    run("docker", "cp", f"{container}:/app/app.jar", str(destination), label="Read backend migration files")
    with zipfile.ZipFile(destination) as archive:
        prefix = "BOOT-INF/classes/db/migration/"
        files = [item for item in archive.infolist() if item.filename.startswith(prefix) and not item.is_dir()]
        hashes = {item.filename: hashlib.sha256(archive.read(item)).hexdigest() for item in files}
        require(hashes and len(hashes) == len(files), "Missing or ambiguous Flyway migration files")
        return hashes


def verify_migrations(current, image):
    candidate = run("docker", "create", "--network", "none", image, label="Create inert image inspection container")
    require(re.fullmatch(r"[0-9a-f]{64}", candidate), "Unexpected inspection container ID")
    try:
        with tempfile.TemporaryDirectory(dir=STATE) as directory:
            tmp = Path(directory)
            require(migration_hashes(current, tmp / "current.jar") == migration_hashes(candidate, tmp / "next.jar"),
                    "Flyway files differ; this release requires a separately reviewed database rollout")
    finally:
        # Only the stopped inspection container created above; no volume removal.
        run("docker", "container", "rm", candidate, label="Remove inert inspection container")


def activate(image, image_id, candidate=False):
    resolved = run("docker", "image", "inspect", "--format={{.Id}}", image, label="Resolve local backend image")
    require(resolved == image_id, "Local backend image does not match the recorded ID")
    atomic_json(OVERRIDE, image_override(image))
    compose("up", "-d", "--no-deps", "--no-build", "--pull", "never", "backend",
            override=OVERRIDE, timeout=120)
    healthy(image_id, candidate)


def finish(state):
    state["pending"] = False
    atomic_json(JOURNAL, state)


def restore(state):
    previous, previous_id = state["previous"], state["previous_id"]
    require(re.fullmatch(ALIAS, previous) and re.fullmatch(DIGEST, previous_id) and
            previous == "tron-ai-backend-rollback:sha-" + previous_id.removeprefix("sha256:"),
            "Invalid rollback image in local release state")
    require(config_fingerprint() == state["config"],
            "Installed Compose or environment changed; operator must reconcile before rollback")
    state["pending"] = True
    atomic_json(JOURNAL, state)
    activate(previous, previous_id)
    state["rolled_back"] = True
    finish(state)
    print("Previous backend restored; container, loopback and public health passed.", flush=True)


def deploy(sha, digest):
    if JOURNAL.exists():
        previous_state = json.loads(JOURNAL.read_text())
        if previous_state["pending"]:
            restore(previous_state)
            raise ReleaseError("Recovered an interrupted transaction; review before retrying the release")
    current = preflight()
    verify_main(sha)
    verify_lineage(current, sha)
    fingerprint = config_fingerprint()
    image, image_id = pull_verified(sha, digest)
    if current["Image"] == image_id and current["Config"]["Image"] == image:
        healthy(image_id, candidate=True, seconds=0)
        print("The attested digest is already deployed and healthy.", flush=True)
        return
    previous_id = current["Image"]
    require(re.fullmatch(DIGEST, previous_id), "Unexpected running backend image ID")
    previous = "tron-ai-backend-rollback:sha-" + previous_id.removeprefix("sha256:")
    run("docker", "tag", previous_id, previous, label="Retain the exact running image for rollback")
    verify_migrations(current["Id"], image)
    # Catch out-of-band changes during pull/inspection, and stale approvals.
    require(preflight()["Id"] == current["Id"], "Running backend changed during release preparation")
    require(config_fingerprint() == fingerprint, "Installed configuration changed during release preparation")
    verify_main(sha)
    state = {"previous": previous, "previous_id": previous_id, "target": image,
             "target_id": image_id, "sha": sha, "config": fingerprint, "pending": True, "rolled_back": False}
    atomic_json(JOURNAL, state)
    try:
        activate(image, image_id, candidate=True)
        finish(state)
    except (Exception, KeyboardInterrupt) as error:
        try:
            restore(state)
        except (Exception, KeyboardInterrupt):
            raise ReleaseError("ROLLBACK FAILED; pending journal preserved; operator action required") from None
        detail = str(error) if isinstance(error, ReleaseError) else "interrupted or unexpected error"
        raise ReleaseError(f"Release failed; the previous backend was restored ({detail})") from None
    print(f"Backend deployed and healthy: {image}", flush=True)


def terminate(_signal, _frame):
    raise KeyboardInterrupt


def trusted_file(path, private=False):
    for item in (path, *path.parents):
        info = item.lstat()
        require(info.st_uid == 0 and info.st_mode & 0o022 == 0 and
                (stat.S_ISREG(info.st_mode) if item == path else stat.S_ISDIR(info.st_mode)),
                "Deployment inputs and their parent directories must be root controlled and not symlinks")
    if private:
        require(path.stat().st_mode & 0o077 == 0, "GitHub verifier credential must be root-only")


def main():
    args = sys.argv[1:]
    if args == ["ssh"]:
        command = os.environ.get("SSH_ORIGINAL_COMMAND", "")
        require(REQUEST.fullmatch(command), "Only the backend digest deployment command is permitted")
        return subprocess.run(["/usr/bin/sudo", "-n", PROGRAM, "from-ssh"], input=command, text=True).returncode

    require(os.geteuid() == 0, "This command requires a trusted Ubuntu administrator")
    if args == ["from-ssh"]:
        match = REQUEST.fullmatch(sys.stdin.read(150))
        require(match, "Invalid deployment request")
        # The host-owned unit survives a disconnected SSH client/runner. Its exit
        # code is sent to Actions while stdout/stderr stay in the host journal.
        return subprocess.run(["/usr/bin/systemd-run", "--wait", "--collect",
                               "--unit=tron-backend-release", "--property=RuntimeMaxSec=24min",
                               "--property=TimeoutStopSec=7min",
                               PROGRAM, "deploy", *match.groups()]).returncode

    require(STATE.is_dir() and not STATE.is_symlink() and STATE.stat().st_uid == 0 and
            STATE.stat().st_mode & 0o077 == 0, "Release state directory must be root-owned mode 0700")
    trusted_file(BASE)
    trusted_file(ENV_FILE)
    os.umask(0o077)
    signal.signal(signal.SIGTERM, terminate)
    signal.signal(signal.SIGHUP, terminate)
    with (STATE / "lock").open("a") as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise ReleaseError("Another backend release operation holds the host lock") from None
        if args == ["preflight"]:
            require(not JOURNAL.exists() or not json.loads(JOURNAL.read_text())["pending"],
                    "Pending transaction; run operator rollback first")
            preflight()
        elif args == ["rollback"]:
            require(JOURNAL.is_file(), "No recorded rollback target")
            state = json.loads(JOURNAL.read_text())
            if not state["pending"]:
                require(inspect_container("backend")["Image"] in {state["target_id"], state["previous_id"]},
                        "Live backend no longer belongs to the recorded release; reconcile before rollback")
            restore(state)
        elif len(args) == 3 and REQUEST.fullmatch(" ".join(args)):
            trusted_file(TOKEN_FILE, private=True)
            deploy(*args[1:])
        else:
            raise ReleaseError("Expected preflight, rollback or a verified deployment request")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except ReleaseError as error:
        sys.exit(str(error))
    except (Exception, KeyboardInterrupt):
        sys.exit("Backend release stopped unexpectedly; inspect journal and transaction state on Ubuntu")
