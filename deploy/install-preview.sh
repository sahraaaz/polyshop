#!/usr/bin/env bash
# Dedicated loopback-only preview; never modifies nginx, TLS, DNS or live services.
set -Eeuo pipefail
if [[ ${1:-} == --check ]]; then
  printf 'Preview installer loaded; no system changes made.\n'
  exit 0
fi
[[ $EUID -eq 0 ]] || { echo 'Run as root on the preview server.' >&2; exit 1; }
# shellcheck source=/dev/null
source /etc/os-release
[[ $ID == ubuntu && $VERSION_ID == 24.04 ]] || { echo 'Ubuntu 24.04 is required.' >&2; exit 1; }
for executable in curl tar xz sha256sum runuser systemctl ss getent; do
  command -v "$executable" >/dev/null || { echo "Missing prerequisite: $executable" >&2; exit 1; }
done
exec 9>/run/lock/polymoly-preview.lock
flock -n 9 || { echo 'Another preview installation is running.' >&2; exit 1; }
root=/opt/polymoly-preview
state=/var/lib/polymoly-preview
account=polymoly-preview
unit=/etc/systemd/system/polymoly-preview.service
marker='# Managed by PolyMoly preview installer'
source_root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)
[[ -f $source_root/package-lock.json && -d $source_root/src && -d $source_root/public ]] || { echo 'Incomplete source archive.' >&2; exit 1; }
if [[ -e $root && ! -f $root/.managed ]]; then echo 'Refusing an unmanaged preview directory.' >&2; exit 1; fi
if [[ -e $unit ]] && ! grep -Fqx "$marker" "$unit"; then echo 'Refusing an unmanaged service unit.' >&2; exit 1; fi
if getent passwd "$account" >/dev/null && [[ ! -f $root/.managed ]]; then echo 'Preview account already exists without its managed directory.' >&2; exit 1; fi
if [[ -e $root/current && ! -L $root/current ]]; then echo 'Preview current must be a managed symlink.' >&2; exit 1; fi
if ss -H -ltn 'sport = :3190' | grep -q . && ! systemctl is-active --quiet polymoly-preview.service; then
  echo 'Port 3190 is already used by another service.' >&2; exit 1
fi
previous=''
if [[ -L $root/current ]]; then
  previous=$(readlink -- "$root/current")
  [[ $previous == "$root/releases/"* && -d $previous ]] || { echo 'Unexpected preview symlink target.' >&2; exit 1; }
fi
switched=false
on_error() {
  status=$?
  trap - ERR
  if [[ $switched == true && -n $previous ]]; then
    ln -s "$previous" "$root/.rollback-$$"
    mv -Tf "$root/.rollback-$$" "$root/current"
    systemctl restart polymoly-preview.service || true
    echo 'Restored the previous preview release.' >&2
  elif [[ $switched == true ]]; then
    systemctl stop polymoly-preview.service || true
  fi
  echo 'Preview installation stopped. The live nginx/TLS site was not modified.' >&2
  exit "$status"
}
trap on_error ERR

install -d -m 0755 "$root" "$root/releases" "$root/runtime"
touch "$root/.managed"
if ! getent passwd "$account" >/dev/null; then
  useradd --system --user-group --home-dir "$state" --no-create-home --shell /usr/sbin/nologin "$account"
fi
install -d -m 0700 -o "$account" -g "$account" "$state" "$state/npm-cache"
install -d -m 0700 /etc/polymoly-preview

case $(uname -m) in x86_64) architecture=x64 ;; aarch64) architecture=arm64 ;; *) echo 'Unsupported CPU architecture.' >&2; exit 1 ;; esac
node_version=v24.18.0
node_folder="node-${node_version}-linux-${architecture}"
node_bin="$root/runtime/$node_folder/bin"
if [[ ! -x $node_bin/node ]]; then
  download=$(mktemp -d /tmp/polymoly-node.XXXXXX)
  archive="$node_folder.tar.xz"
  curl --fail --show-error --location --proto '=https' --tlsv1.2 "https://nodejs.org/dist/$node_version/$archive" -o "$download/$archive"
  curl --fail --show-error --location --proto '=https' --tlsv1.2 "https://nodejs.org/dist/$node_version/SHASUMS256.txt" -o "$download/SHASUMS256.txt"
  checksum=$(awk -v file="$archive" '$2 == file {print $1}' "$download/SHASUMS256.txt")
  [[ $checksum =~ ^[a-f0-9]{64}$ ]] || { echo 'Missing Node checksum.' >&2; exit 1; }
  printf '%s  %s\n' "$checksum" "$download/$archive" | sha256sum --check -
  tar --no-same-owner -xJf "$download/$archive" -C "$root/runtime"
  # This exact temporary directory was created above; no user paths are removed.
  [[ $download == /tmp/polymoly-node.* ]] && rm -rf -- "$download"
fi
[[ $("$node_bin/node" --version) == "$node_version" ]] || { echo 'Unexpected preview Node runtime.' >&2; exit 1; }

release=$(mktemp -d "$root/releases/release-$(date -u +%Y%m%dT%H%M%SZ)-XXXXXX")
for path in package.json package-lock.json next.config.ts next-env.d.ts tsconfig.json src server public scripts; do
  cp -a -- "$source_root/$path" "$release/"
done
chown -R "$account:$account" "$release"
(
  cd -- "$release"
  runuser -u "$account" -- env PATH="$node_bin:/usr/local/bin:/usr/bin:/bin" NPM_CONFIG_CACHE="$state/npm-cache" \
    NEXT_TELEMETRY_DISABLED=1 "$node_bin/npm" ci --ignore-scripts --no-audit --no-fund
  runuser -u "$account" -- env PATH="$node_bin:/usr/local/bin:/usr/bin:/bin" NPM_CONFIG_CACHE="$state/npm-cache" \
    NEXT_TELEMETRY_DISABLED=1 SITE_INDEXABLE=false CHECKOUT_ENABLED=false NODE_OPTIONS=--max-old-space-size=768 \
    "$node_bin/npm" run build:next
)
[[ -f $release/.next/standalone/server.js ]] || { echo 'Standalone build missing.' >&2; exit 1; }
cp -a "$release/public" "$release/.next/standalone/public"
mkdir -p "$release/.next/standalone/.next"
cp -a "$release/.next/static" "$release/.next/standalone/.next/static"
chown -R "root:$account" "$release"
chmod 0750 "$release"

if [[ ! -e /etc/polymoly-preview/environment ]]; then
  cat > /etc/polymoly-preview/environment <<ENV
NODE_ENV=production
HOSTNAME=127.0.0.1
PORT=3190
NEXT_TELEMETRY_DISABLED=1
SITE_INDEXABLE=false
CHECKOUT_ENABLED=false
ADMIN_PASSWORD_HASH=
POLYMOLY_DATABASE_FILE=$state/catalog.sqlite
ENV
  chmod 0600 /etc/polymoly-preview/environment
fi
cat > "$unit" <<UNIT
$marker
[Unit]
Description=PolyMoly isolated preview
After=network.target
[Service]
Type=simple
User=$account
Group=$account
WorkingDirectory=$root/current/.next/standalone
EnvironmentFile=/etc/polymoly-preview/environment
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
systemctl daemon-reload
systemctl enable polymoly-preview.service
systemctl restart polymoly-preview.service
healthy=false
for _attempt in {1..30}; do
  if curl --fail --silent --max-time 2 http://127.0.0.1:3190/healthz | grep -q '"status":"ok"'; then healthy=true; break; fi
  sleep 1
done
[[ $healthy == true ]] || { echo 'Preview health check failed.' >&2; false; }
printf '\nPreview ready at server loopback port 3190.\nUse an SSH tunnel to open http://127.0.0.1:3190 on your computer.\nCheckout and administrator login are disabled by default.\nNo nginx, DNS, certificate or firewall configuration was changed.\n'
