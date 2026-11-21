# Server preview

The installer creates an independent systemd service on server loopback port
3190, with its own Node 24 runtime, unprivileged account and persistent database.
It does not change nginx, DNS, certificates, firewall rules or the live service.
Access is through an SSH tunnel, so there is no new publicly exposed port.
Checkout and server administrator login stay disabled; this is a read-only
preview of the site and product pages. Actual admin/checkout flows have already
passed disposable HTTPS browser tests and need a separate trusted HTTPS staging
configuration before being enabled for server testing.

On the user's computer, from the project folder, run:

```powershell
node deploy/preview.mjs
```

The helper packages explicit source paths only, excluding .env files, Git,
databases, node_modules and local build output. It uploads the archive to the
known server, verifies its checksum, invokes the installer and keeps an SSH shell
and tunnel open. Enter passwords privately at SSH/SCP prompts. Existing trusted
SSH host keys are required; verify a first connection using the provider console
before accepting a host key. Do not disable host-key checking to make it work.

After the ready message, open http://127.0.0.1:3190 on the same computer and keep
that terminal open. This is a local tunnel URL, not a public or mobile URL. To
reopen an already installed preview later:

```powershell
ssh -N -o StrictHostKeyChecking=yes -L 127.0.0.1:3190:127.0.0.1:3190 root@94.184.36.186
```

The installer targets Ubuntu 24.04 x64/arm64. It downloads pinned Node 24.18.0
from nodejs.org over HTTPS and verifies the distribution checksum, runs npm ci
and a two-worker build under the preview account, copies standalone assets,
switches a preview-only release symlink and health checks the service. Existing
preview data/environment are retained. A failed new preview restart restores the
previous preview release where available. Old releases are retained for review.

Inspect with systemctl status polymoly-preview.service or
journalctl -u polymoly-preview.service. Stop using systemctl stop
polymoly-preview.service. Data is in /var/lib/polymoly-preview and private service
environment is in /etc/polymoly-preview/environment. Runtime/source are under
/opt/polymoly-preview. Do not store real customer data in this preview.

Validation boundary: script syntax/static checks and source packaging can run
without server access. A completed package or a passed syntax check is not proof
that remote installation happened; only the remote ready/health result is.
