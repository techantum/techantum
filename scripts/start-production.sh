#!/usr/bin/env bash
set -euo pipefail
cd /var/www/techantum

# Strip Cursor/sandbox/local proxies so Google APIs can connect directly
unset HTTP_PROXY HTTPS_PROXY http_proxy https_proxy ALL_PROXY all_proxy
unset SOCKS_PROXY SOCKS5_PROXY socks_proxy socks5_proxy
unset GIT_HTTP_PROXY GIT_HTTPS_PROXY
export NO_PROXY='*'
export no_proxy='*'

# Load .env into the process (Next also loads it; this covers PM2 edge cases)
if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source <(node --input-type=module -e "
import fs from 'fs';
const text = fs.readFileSync('.env','utf8');
for (const raw of text.split(/\\n/)) {
  const line = raw.trim();
  if (!line || line.startsWith('#')) continue;
  const i = line.indexOf('=');
  if (i <= 0) continue;
  const key = line.slice(0, i).trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*\$/.test(key)) continue;
  let val = line.slice(i + 1);
  if ((val.startsWith('\"') && val.endsWith('\"')) || (val.startsWith(\"'\") && val.endsWith(\"'\"))) {
    val = val.slice(1, -1);
  }
  process.stdout.write(key + '=' + JSON.stringify(val) + '\\n');
}
")
  set +a
fi

export NODE_ENV=production
export PORT=4028
exec ./node_modules/.bin/next start --port 4028
