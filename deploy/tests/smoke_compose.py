"""CI-only disposable Docker smoke test; no production host execution."""
import importlib.util
import io
import json
import os
from pathlib import Path
import subprocess
import tempfile
import time
import urllib.request
import zipfile

assert os.environ.get('GITHUB_ACTIONS') == 'true', 'Run only on a disposable GitHub runner'
root = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('release_manager', root/'scripts/release-manager.py')
r = importlib.util.module_from_spec(spec)
spec.loader.exec_module(r)

def run(*args, **kwargs):
    return subprocess.run(args, check=True, capture_output=True, **kwargs).stdout

with tempfile.TemporaryDirectory() as temporary:
    directory = Path(temporary)
    socket = directory/'socket'
    socket.mkdir(mode=0o777)
    socket.chmod(0o777)
    runtime = directory/'runtime.env'
    text = (root/'runtime.env.example').read_text().replace('REPLACE_WITH_GENERATED_SECRET', 'synthetic-ci-secret-with-more-than-32-characters').replace('AI_NODE_PRIVATE_IP', '192.0.2.1')
    images = json.loads((root/'images.lock.json').read_text())
    lines = [line for line in text.splitlines() if not line.startswith(('TRON_GOTENBERG_IMAGE=', 'TRON_FRONTEND_IMAGE=', 'TRON_MYSQL_PROXY_IMAGE='))]
    lines += ['TRON_GOTENBERG_IMAGE='+images['gotenberg'], 'TRON_FRONTEND_IMAGE='+images['nginx'], 'TRON_MYSQL_PROXY_IMAGE='+images['socat'], 'TRON_MYSQL_SOCKET_DIR='+str(socket)]
    runtime.write_text('\n'.join(lines)+'\n')
    runtime.chmod(0o600)
    r.configuration(runtime, 'production')
    release = directory/'release'
    release.mkdir()
    (release/'frontend').mkdir()
    (release/'frontend/index.html').write_text('<html>TRON release smoke fixture</html>')
    (release/'compose.yml').write_text((root/'compose.prod.yml').read_text())
    (release/'nginx.conf').write_text((root/'nginx/private.conf').read_text())
    (release/'compose.env').write_text(f'TRON_ENV_FILE={runtime}\nTRON_BACKEND_IMAGE=tron-ai-backend:ci\nTRON_FRONTEND_DIR={release}/frontend\nTRON_NGINX_CONFIG={release}/nginx.conf\nTRON_BACKEND_HOST_PORT=18080\nTRON_FRONTEND_HOST_PORT=18081\n')
    releases = r.Releases(directory, 'production', runtime)
    mysql_name = 'tron-disposable-ci-mysql'
    try:
        run('docker', 'run', '-d', '--name', mysql_name, '--memory', '768m', '-e', 'MYSQL_ROOT_PASSWORD=synthetic-ci-root', '-v', str(socket)+':/var/run/mysqld', 'mysql:8.0')
        for attempt in range(90):
            check = subprocess.run(['docker','exec','-e','MYSQL_PWD=synthetic-ci-root',mysql_name,'mysql','-uroot','-e','SELECT 1'],capture_output=True)
            if check.returncode == 0:
                break
            time.sleep(2)
        else:
            raise RuntimeError('Disposable MySQL did not start')
        sql = "CREATE DATABASE tron_ai CHARACTER SET utf8mb4; CREATE USER 'tronai_prod'@'localhost' IDENTIFIED BY 'synthetic-ci-secret-with-more-than-32-characters'; GRANT SELECT,INSERT,UPDATE,DELETE,CREATE,ALTER,INDEX,REFERENCES,CREATE VIEW,SHOW VIEW ON tron_ai.* TO 'tronai_prod'@'localhost';"
        run('docker','exec','-i','-e','MYSQL_PWD=synthetic-ci-root',mysql_name,'mysql','-uroot',input=sql.encode())
        releases.compose(release, 'pull', 'gotenberg', 'mysql-proxy', 'frontend')
        releases.apply(release)
        base = 'http://127.0.0.1:18081'
        def post(path, payload):
            request = urllib.request.Request(base+path, data=json.dumps(payload).encode(), headers={'Content-Type':'application/json'})
            with urllib.request.urlopen(request,timeout=15) as response:
                assert response.status == 200
                return json.load(response)
        identity = dict(email='release-ci@example.invalid', password='synthetic-password-123', displayName='CI smoke')
        auth = post('/api/v1/auth/register', identity)
        assert auth.get('accessToken'), 'Registration did not return a token'
        releases.compose(release, 'restart', 'backend')
        releases.health()
        auth = post('/api/v1/auth/login', dict(email=identity['email'],password=identity['password']))
        assert auth.get('accessToken'), 'Login/persistence failed after restart'
        # Convert a minimal DOCX through actual LibreOffice, then extract English/Japanese text.
        docx = io.BytesIO()
        with zipfile.ZipFile(docx,'w') as document:
            document.writestr('[Content_Types].xml','<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>')
            document.writestr('_rels/.rels','<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>')
            document.writestr('word/document.xml','<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>TRON English 日本語 テスト</w:t></w:r></w:p></w:body></w:document>')
        # Compose helper needs binary input, so pass through the same restricted argv/environment.
        cid = releases.compose(release, 'ps', '-q', 'gotenberg').decode().strip()
        pdf = run('docker','exec','-i',cid,'curl','-fsS','-F','files=@-;filename=sample.docx','http://127.0.0.1:3000/forms/libreoffice/convert',input=docx.getvalue())
        assert pdf.startswith(b'%PDF'), 'PDF response invalid'
        path = directory/'result.pdf'
        path.write_bytes(pdf)
        extracted = run('pdftotext',str(path),'-').decode()
        assert 'TRON English' in extracted and '日本語' in extracted, 'English/Japanese text did not survive conversion'
        print('Disposable Docker smoke PASS: Unix-socket DB proxy, MySQL Flyway startup, frontend/API auth, backend restart/persistence, English/Japanese PDF text')
    except Exception:
        # No actual production credentials exist in this disposable fixture.
        try:
            print(releases.compose(release,'logs','--tail','100','backend','mysql-proxy').decode())
        except Exception:
            pass
        raise
    finally:
        releases.compose(release,'down','--volumes')  # Explicitly disposable CI-only resources.
        subprocess.run(['docker','rm','-f',mysql_name],capture_output=True)
