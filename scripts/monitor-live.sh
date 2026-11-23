#!/usr/bin/env bash
set -euo pipefail
trap 'logger -p daemon.err -t polymoly-monitor "Health check failed at line $LINENO"' ERR

response=$(curl --fail --silent --show-error --max-time 12 https://polymoly.ir/healthz)
[[ $response == '{"status":"ok","service":"polymoly"}' ]]
for unit in nginx polymoly-live.service certbot.timer; do
  systemctl is-active --quiet "$unit"
done
openssl x509 -in /etc/letsencrypt/live/polymoly.ir/fullchain.pem -noout -checkend 1209600 >/dev/null

disk=$(df --output=pcent /var/lib/polymoly-live | tail -n1 | tr -cd '0-9')
memory=$(awk '/^MemAvailable:/ { print $2 }' /proc/meminfo)
[[ $disk -lt 85 && $memory -gt 131072 ]]
if ! find /var/backups/polymoly-data -mindepth 2 -maxdepth 2 -name catalog.sqlite -type f -mmin -1560 -print -quit | grep -q .; then
  logger -p daemon.err -t polymoly-monitor 'No recent catalog backup found'
  exit 1
fi
printf 'Healthy: disk=%s%% available_memory=%sKiB\n' "$disk" "$memory"
