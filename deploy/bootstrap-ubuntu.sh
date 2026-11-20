#!/usr/bin/env bash
# PolyMoly launch preparation. Does not deploy the demo store or enable payments.
set -Eeuo pipefail
trap 'printf "Setup stopped at line %s. Fix the reported error before continuing.\n" "$LINENO" >&2' ERR

if [[ ${1:-} == --check ]]; then
  printf 'PolyMoly bootstrap syntax loaded; no system changes made.\n'
  exit 0
fi
[[ $EUID -eq 0 ]] || { echo 'Run as root or with sudo.' >&2; exit 1; }
# shellcheck source=/dev/null
source /etc/os-release
[[ $ID == ubuntu && $VERSION_ID == 24.04 ]] || {
  echo 'This script targets Ubuntu 24.04 LTS only.' >&2; exit 1;
}
exec 9>/run/lock/polymoly-bootstrap.lock
flock -n 9 || { echo 'Another setup is running.' >&2; exit 1; }

site=/etc/nginx/sites-available/polymoly
marker='# Managed by PolyMoly bootstrap'
if [[ -e $site ]] && ! grep -Fqx "$marker" "$site"; then
  echo 'An existing unmanaged PolyMoly nginx configuration exists; refusing to overwrite it.' >&2
  exit 1
fi

# Record SSH ports before enabling the firewall; keep the current connection open.
ssh_ports=$(/usr/sbin/sshd -T | awk '$1 == "port" { print $2 }')
[[ -n $ssh_ports ]] || { echo 'Cannot determine SSH ports; stopping.' >&2; exit 1; }
current_port=${SSH_CONNECTION:-}
current_port=${current_port##* }
if [[ -n ${SSH_CONNECTION:-} && $current_port =~ ^[0-9]+$ ]]; then
  ssh_ports+=$'\n'"$current_port"
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y nginx ufw fail2ban unattended-upgrades curl ca-certificates \
  dnsutils certbot python3-certbot-nginx
timedatectl set-timezone Asia/Tehran
timedatectl set-ntp true

install -d -m 0755 /var/www/polymoly-launch /var/www/letsencrypt
if [[ ! -e /var/www/polymoly-launch/index.html ]]; then
cat > /var/www/polymoly-launch/index.html <<'HTML'
<!doctype html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#0b1420">
  <meta name="description" content="PolyMoly؛ مرچ دانشگاهی امیرکبیر. به‌زودی با اولین مجموعهٔ Polyshop همراهتان هستیم.">
  <title>PolyMoly | به‌زودی</title>
  <style>
    *{box-sizing:border-box}body{margin:0;min-height:100svh;display:grid;place-items:center;background:#0b1420;color:#f5f0e6;font-family:Tahoma,Arial,sans-serif;padding:24px}
    main{max-width:660px;width:100%;padding:clamp(30px,7vw,64px);border:1px solid #31414b;border-radius:26px;background:linear-gradient(145deg,#152735,#0d1824)}
    .brand{direction:ltr;text-align:right;color:#32d6c6;font:800 clamp(40px,9vw,68px)/1.2 Arial,sans-serif;letter-spacing:-3px}
    .tag{display:inline-block;margin:28px 0 12px;padding:7px 13px;border-radius:20px;background:#32d6c61a;color:#75eadc;font-size:12px}
    h1{font-size:clamp(23px,5vw,34px);line-height:1.9;margin:8px 0}p{line-height:2.2;color:#bdcbd2;font-size:15px}footer{margin-top:40px;padding-top:20px;border-top:1px solid #31414b;direction:ltr;text-align:right;font:12px Arial,sans-serif;color:#8ca5b0}
  </style>
</head>
<body><main><div class="brand">PolyMoly</div><span class="tag">به‌زودی در امیرکبیر</span><h1>از دانشگاه، برای خودمون.</h1><p>داریم اولین مجموعهٔ مرچ دانشگاهی <b dir="ltr">Polyshop</b> رو آماده می‌کنیم. فروشگاه به‌زودی باز می‌شه.</p><footer>POLYMOLY · MADE BETWEEN CLASSES</footer></main></body>
</html>
HTML
chmod 0644 /var/www/polymoly-launch/index.html
fi

# Leave an existing managed configuration intact, including Certbot's TLS changes.
if [[ ! -e $site ]]; then
cat > "$site" <<'NGINX'
# Managed by PolyMoly bootstrap
server {
    listen 80;
    listen [::]:80;
    server_name polymoly.ir www.polymoly.ir 94.184.36.186;
    root /var/www/polymoly-launch;
    index index.html;
    server_tokens off;
    charset utf-8;
    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options DENY always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;
    add_header Content-Security-Policy "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'" always;
    location ^~ /.well-known/acme-challenge/ {
        root /var/www/letsencrypt;
    }
    location = /healthz {
        access_log off;
        default_type text/plain;
        return 200 "ok\n";
    }
    location / { try_files $uri $uri/ =404; }
    location ~ /\. { deny all; }
}
NGINX
fi
if [[ -e /etc/nginx/sites-enabled/polymoly && ! -L /etc/nginx/sites-enabled/polymoly ]]; then
  echo 'Unexpected nginx enabled-site file; inspect manually.' >&2; exit 1
fi
ln -sfn "$site" /etc/nginx/sites-enabled/polymoly
nginx -t
systemctl enable --now nginx
systemctl reload nginx

# Add rules without resetting any existing firewall configuration.
while read -r port; do
  [[ $port =~ ^[0-9]+$ ]] && ufw allow "$port/tcp" comment 'SSH access'
done <<< "$ssh_ports"
ufw allow 80/tcp comment 'HTTP and certificate validation'
ufw allow 443/tcp comment 'HTTPS'
ufw --force enable

install -d -m 0755 /etc/fail2ban/jail.d
cat > /etc/fail2ban/jail.d/polymoly.local <<EOF
[sshd]
enabled = true
backend = systemd
port = $(echo "$ssh_ports" | sort -un | paste -sd,)
maxretry = 10
findtime = 10m
bantime = 10m
EOF
fail2ban-client -t
systemctl enable --now fail2ban
systemctl restart fail2ban
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'APT'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT

curl --fail --silent --show-error -H 'Host: polymoly.ir' http://127.0.0.1/healthz
ufw status
printf '\nHTTP launch page ready. No store, database or payment gateway was deployed.\n'
printf 'DNS needed: A polymoly.ir -> 94.184.36.186; CNAME www -> polymoly.ir\n'
printf 'After DNS resolves correctly, run: certbot --nginx -d polymoly.ir -d www.polymoly.ir\n'
printf 'Follow Certbot prompts, then run: certbot renew --dry-run\n'
printf 'Keep this SSH session open until a second SSH login succeeds.\n'
if [[ -f /var/run/reboot-required ]]; then
  printf 'A reboot is pending; do not reboot until access has been verified.\n'
fi
