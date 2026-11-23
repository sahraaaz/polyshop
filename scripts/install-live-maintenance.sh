#!/usr/bin/env bash
set -euo pipefail
[[ $EUID -eq 0 ]]
release=/opt/polymoly-live/current
[[ -f $release/REVISION ]]
case $(uname -m) in
  x86_64) architecture=x64 ;;
  aarch64) architecture=arm64 ;;
  *) exit 1 ;;
esac
node=/opt/polymoly-live/runtime/node-v24.18.0-linux-$architecture/bin/node
[[ -x $node ]]
units=$(mktemp -d)
trap 'rm -r -- "$units"' EXIT

cat > "$units/polymoly-backup.service" <<UNIT
[Unit]
Description=Validated PolyMoly SQLite backup

[Service]
Type=oneshot
ExecStart=$node $release/scripts/backup-live.mjs
UMask=0077
NoNewPrivileges=yes
PrivateTmp=yes
ProtectHome=yes
ProtectSystem=strict
ReadWritePaths=/var/backups/polymoly-data
UNIT
cat > "$units/polymoly-backup.timer" <<'UNIT'
[Unit]
Description=Daily PolyMoly backup

[Timer]
OnCalendar=*-*-* 04:30:00 Asia/Tehran
Persistent=yes

[Install]
WantedBy=timers.target
UNIT
cat > "$units/polymoly-monitor.service" <<UNIT
[Unit]
Description=PolyMoly availability and backup checks
After=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/bin/bash $release/scripts/monitor-live.sh
NoNewPrivileges=yes
PrivateTmp=yes
ProtectHome=yes
ProtectSystem=strict
UNIT
cat > "$units/polymoly-monitor.timer" <<'UNIT'
[Unit]
Description=Check PolyMoly every five minutes

[Timer]
OnCalendar=*:0/5

[Install]
WantedBy=timers.target
UNIT
install -d -m 0700 /var/backups/polymoly-data
systemd-analyze verify "$units/"*.service "$units/"*.timer
for source in "$units/"*; do
  target=/etc/systemd/system/${source##*/}
  if [[ -e $target ]]; then
    cmp -s "$source" "$target" || { echo "Unit differs: $target" >&2; exit 1; }
  else
    install -m 0644 "$source" "$target"
  fi
done
systemctl daemon-reload
systemctl start polymoly-backup.service
systemctl start polymoly-monitor.service
systemctl enable --now polymoly-backup.timer polymoly-monitor.timer
