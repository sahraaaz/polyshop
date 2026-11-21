#!/usr/bin/env bash
# Publish the tested app through existing HTTPS; preserve preview and application data.
set -Eeuo pipefail
if [[ ${1:-} == --check ]]; then printf 'Live installer loaded; no system changes made.\n'; exit 0; fi
[[ $EUID -eq 0 ]] || { echo 'Run as root.' >&2; exit 1; }
# shellcheck source=/dev/null
source /etc/os-release
[[ $ID == ubuntu && $VERSION_ID == 24.04 ]] || { echo 'Ubuntu 24.04 is required.' >&2; exit 1; }
for executable in nginx curl openssl runuser systemctl sha256sum ss flock; do command -v "$executable" >/dev/null; done
exec 9>/run/lock/polymoly-live.lock
flock -n 9 || { echo 'Another live deployment is running.' >&2; exit 1; }
root=/opt/polymoly-live
state=/var/lib/polymoly-live
account=polymoly-live
unit=/etc/systemd/system/polymoly-live.service
site=/etc/nginx/sites-available/polymoly
enabled=/etc/nginx/sites-enabled/polymoly
marker='# Managed by PolyMoly live installer'
source_root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)
[[ -f $source_root/package-lock.json && -d $source_root/src ]] || { echo 'Incomplete source archive.' >&2; exit 1; }
[[ -f $site && -L $enabled && $(readlink -f "$enabled") == "$site" ]] || { echo 'Unexpected nginx site layout; inspect it before deploying.' >&2; exit 1; }
if ! grep -Fqx '# Managed by PolyMoly bootstrap' "$site" && ! grep -Fqx "$marker" "$site"; then echo 'Refusing to replace an unmanaged nginx site.' >&2; exit 1; fi
[[ -f /etc/letsencrypt/live/polymoly.ir/fullchain.pem && -f /etc/letsencrypt/live/polymoly.ir/privkey.pem ]] || { echo 'Existing TLS certificate is missing.' >&2; exit 1; }
openssl x509 -in /etc/letsencrypt/live/polymoly.ir/fullchain.pem -noout -checkend 86400
openssl x509 -in /etc/letsencrypt/live/polymoly.ir/fullchain.pem -noout -checkhost polymoly.ir
openssl x509 -in /etc/letsencrypt/live/polymoly.ir/fullchain.pem -noout -checkhost www.polymoly.ir
nginx -t
if [[ -e $root && ! -f $root/.managed ]]; then echo 'Unmanaged live directory exists.' >&2; exit 1; fi
if [[ -e $unit ]] && ! grep -Fqx "$marker" "$unit"; then echo 'Unmanaged live unit exists.' >&2; exit 1; fi
if getent passwd "$account" >/dev/null && [[ ! -f $root/.managed ]]; then echo 'Live account exists without its managed directory.' >&2; exit 1; fi
if ss -H -ltn 'sport = :3210' | grep -q . && ! systemctl is-active --quiet polymoly-live.service; then echo 'Port 3210 is already used.' >&2; exit 1; fi
previous=''
if [[ -L $root/current ]]; then
  previous=$(readlink -- "$root/current")
  [[ $previous == "$root/releases/"* && -d $previous ]] || { echo 'Unexpected live symlink.' >&2; exit 1; }
elif [[ -e $root/current ]]; then echo 'Live current must be a symlink.' >&2; exit 1; fi
case $(uname -m) in x86_64) architecture=x64 ;; aarch64) architecture=arm64 ;; *) echo 'Unsupported CPU.' >&2; exit 1 ;; esac
node_folder="node-v24.18.0-linux-$architecture"
preview_runtime="/opt/polymoly-preview/runtime/$node_folder"
[[ -f /opt/polymoly-preview/.managed && -x $preview_runtime/bin/node ]] || { echo 'Verified preview Node runtime is required.' >&2; exit 1; }
[[ $("$preview_runtime/bin/node" --version) == v24.18.0 ]] || { echo 'Unexpected Node runtime.' >&2; exit 1; }

install -d -m 0700 /var/backups/polymoly-live
backup=$(mktemp -d /var/backups/polymoly-live/deploy-XXXXXXXX)
cp -a "$site" "$backup/nginx.conf"
if [[ -e $unit ]]; then cp -a "$unit" "$backup/service.unit"; fi
nginx_changed=false
switched=false
stage='prepare application release'
on_error() {
  status=$?
  failed_line=${1:-unknown}
  trap - ERR
  if [[ $nginx_changed == true ]]; then
    cp -a "$backup/nginx.conf" "$site"
    if nginx -t; then systemctl reload nginx || true; fi
    echo 'Restored previous nginx configuration.' >&2
  fi
  if [[ $switched == true && -n $previous ]]; then
    ln -s "$previous" "$root/.rollback-$$"
    mv -Tf "$root/.rollback-$$" "$root/current"
    if [[ -f $backup/service.unit ]]; then cp -a "$backup/service.unit" "$unit"; fi
    systemctl daemon-reload || true
    systemctl restart polymoly-live.service || true
  elif [[ $switched == true ]]; then systemctl stop polymoly-live.service || true; fi
  echo "Deployment stopped at stage: $stage (line $failed_line, exit $status). Inspect $backup. Preview was not changed." >&2
  exit "$status"
}
trap 'on_error "$LINENO"' ERR
install -d -m 0755 "$root" "$root/releases" "$root/runtime"
touch "$root/.managed"
if ! getent passwd "$account" >/dev/null; then useradd --system --user-group --home-dir "$state" --no-create-home --shell /usr/sbin/nologin "$account"; fi
install -d -m 0700 -o "$account" -g "$account" "$state" "$state/npm-cache"
install -d -m 0700 /etc/polymoly-live
if [[ ! -d $root/runtime/$node_folder ]]; then cp -a "$preview_runtime" "$root/runtime/$node_folder"; fi
node_bin="$root/runtime/$node_folder/bin"
[[ $("$node_bin/node" --version) == v24.18.0 ]]
release=$(mktemp -d "$root/releases/release-$(date -u +%Y%m%dT%H%M%SZ)-XXXXXX")
for path in package.json package-lock.json next.config.ts next-env.d.ts tsconfig.json src server public scripts; do cp -a "$source_root/$path" "$release/"; done
chown -R "$account:$account" "$release"
(
  cd -- "$release"
  runuser -u "$account" -- env PATH="$node_bin:/usr/local/bin:/usr/bin:/bin" NPM_CONFIG_CACHE="$state/npm-cache" NEXT_TELEMETRY_DISABLED=1 \
    "$node_bin/npm" ci --ignore-scripts --no-audit --no-fund
  runuser -u "$account" -- env PATH="$node_bin:/usr/local/bin:/usr/bin:/bin" NPM_CONFIG_CACHE="$state/npm-cache" NEXT_TELEMETRY_DISABLED=1 \
    SITE_INDEXABLE=false CHECKOUT_ENABLED=false NODE_OPTIONS=--max-old-space-size=768 "$node_bin/npm" run build:next
)
[[ -f $release/.next/standalone/server.js ]]
cp -a "$release/public" "$release/.next/standalone/public"
mkdir -p "$release/.next/standalone/.next"
cp -a "$release/.next/static" "$release/.next/standalone/.next/static"
chown -R "root:$account" "$release"
chmod 0750 "$release"
if [[ ! -e /etc/polymoly-live/environment ]]; then
  cat > /etc/polymoly-live/environment <<ENV
NODE_ENV=production
HOSTNAME=127.0.0.1
PORT=3210
NEXT_TELEMETRY_DISABLED=1
SITE_INDEXABLE=false
CHECKOUT_ENABLED=false
ADMIN_PASSWORD_HASH=
ADMIN_ORIGIN=https://polymoly.ir
CHECKOUT_ORIGIN=https://polymoly.ir
POLYMOLY_DATABASE_FILE=$state/catalog.sqlite
ENV
  chmod 0600 /etc/polymoly-live/environment
fi
cat > "$unit" <<UNIT
$marker
[Unit]
Description=PolyMoly public website
After=network.target
[Service]
Type=simple
User=$account
Group=$account
WorkingDirectory=$root/current/.next/standalone
EnvironmentFile=/etc/polymoly-live/environment
ExecStart=$node_bin/node $root/current/.next/standalone/server.js
Restart=on-failure
RestartSec=3
UMask=0077
NoNewPrivileges=true
PrivateTmp=true
ProtectHome=true
ProtectSystem=strict
ReadWritePaths=$state
[Install]
WantedBy=multi-user.target
UNIT
ln -s "$release" "$root/.current-$$"
mv -Tf "$root/.current-$$" "$root/current"
switched=true
stage='start live application'
systemctl daemon-reload
systemctl enable polymoly-live.service
systemctl restart polymoly-live.service
stage='application readiness before nginx switch'
bash "$source_root/deploy/wait-for-app.sh" "$node_bin/node" 'Direct application health' "$backup/direct-health" \
  --noproxy '*' http://127.0.0.1:3210/healthz
tls_extra='ssl_protocols TLSv1.2 TLSv1.3;'
if [[ -f /etc/letsencrypt/options-ssl-nginx.conf ]]; then tls_extra='include /etc/letsencrypt/options-ssl-nginx.conf;'; fi
dh_extra=''
if [[ -f /etc/letsencrypt/ssl-dhparams.pem ]]; then dh_extra='ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;'; fi
cat > "$backup/new-nginx.conf" <<NGINX
$marker
limit_req_zone \$binary_remote_addr zone=polymoly_admin_login:10m rate=5r/m;
server {
    listen 80;
    listen [::]:80;
    server_name polymoly.ir www.polymoly.ir;
    location ^~ /.well-known/acme-challenge/ { root /var/www/letsencrypt; }
    location / { return 308 https://polymoly.ir\$request_uri; }
}
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name www.polymoly.ir;
    ssl_certificate /etc/letsencrypt/live/polymoly.ir/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/polymoly.ir/privkey.pem;
    $tls_extra
    $dh_extra
    return 308 https://polymoly.ir\$request_uri;
}
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name polymoly.ir;
    ssl_certificate /etc/letsencrypt/live/polymoly.ir/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/polymoly.ir/privkey.pem;
    $tls_extra
    $dh_extra
    server_tokens off;
    client_max_body_size 64k;
    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options DENY always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;
    add_header X-Robots-Tag "noindex, nofollow" always;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$remote_addr;
    proxy_set_header X-Forwarded-Proto https;
    proxy_read_timeout 60s;
    location = /api/admin/login {
        limit_req zone=polymoly_admin_login burst=5 nodelay;
        limit_req_status 429;
        proxy_pass http://127.0.0.1:3210;
    }
    location / { proxy_pass http://127.0.0.1:3210; }
    location ~ /\. { deny all; }
}
NGINX
nginx_changed=true
stage='validate and reload nginx'
cp "$backup/new-nginx.conf" "$site"
nginx -t
systemctl reload nginx
stage='HTTPS application readiness after nginx reload'
bash "$source_root/deploy/wait-for-app.sh" "$node_bin/node" 'Canonical HTTPS health' "$backup/https-health" \
  --noproxy '*' --resolve polymoly.ir:443:127.0.0.1 https://polymoly.ir/healthz
stage='public homepage check'
curl --noproxy '*' --fail --silent --show-error --max-time 30 --resolve polymoly.ir:443:127.0.0.1 https://polymoly.ir/ -o "$backup/home-check.html"
stage='public product image check'
curl --noproxy '*' --fail --silent --show-error --max-time 15 --resolve polymoly.ir:443:127.0.0.1 https://polymoly.ir/products/amirkabir-1401-product.jpg -o /dev/null
stage='www HTTPS redirect readiness'
bash "$source_root/deploy/wait-for-app.sh" "$node_bin/node" 'www HTTPS health' "$backup/www-health" \
  --noproxy '*' --location --resolve polymoly.ir:443:127.0.0.1 --resolve www.polymoly.ir:443:127.0.0.1 https://www.polymoly.ir/healthz
stage='write manual rollback command'
cat > "$backup/restore-nginx.sh" <<RESTORE
#!/usr/bin/env bash
set -euo pipefail
cp -a '$backup/nginx.conf' '$site'
nginx -t
systemctl reload nginx
RESTORE
chmod 0700 "$backup/restore-nginx.sh"
printf '\nLive website ready: https://polymoly.ir\nwww redirects to the main domain.\nCheckout and indexing remain disabled; configure a private administrator password separately.\nPreview remains available on its own service.\nRollback nginx: bash %s/restore-nginx.sh\n' "$backup"
