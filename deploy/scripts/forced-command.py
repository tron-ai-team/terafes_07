#!/usr/bin/env python3
"""Use in a restrict,command= authorized_keys entry for one deployment environment."""
import os
import re
import sys
require_environment = sys.argv[1] if len(sys.argv) == 2 else ''
if require_environment not in ('production', 'staging'):
    sys.exit('Invalid key environment')
pattern = r'python3 /opt/tron-ai/deploy/scripts/release-manager\.py deploy --environment ' + require_environment + r' --run ([1-9][0-9]*)'
match = re.fullmatch(pattern, os.environ.get('SSH_ORIGINAL_COMMAND', ''))
if not match:
    sys.exit('Only a verified release deployment for this key environment is permitted')
os.execv(sys.executable, [sys.executable, '/opt/tron-ai/deploy/scripts/release-manager.py', 'deploy',
                         '--environment', require_environment, '--run', match.group(1)])
