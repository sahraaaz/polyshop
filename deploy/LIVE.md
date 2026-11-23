# Publish the public beta

From a clean Git checkout in PowerShell run `node deploy/live.mjs`. The helper
packages explicit source paths from the current commit, rejects unsafe entries, uploads through
SSH/SCP with strict existing host-key verification, verifies the archive digest
and invokes install-live.sh. The active release records its commit in
`/opt/polymoly-live/current/REVISION`. Enter credentials only in the terminal. No SSH
tunnel is needed for the public domain, and closing the terminal will not stop
the installed systemd service.

This publishes the beta UI and server product previews, not a payment-enabled
store. A site-wide notice explains that ordering and online payment are inactive.
CHECKOUT_ENABLED, search indexing and the unconfigured real admin login remain
closed. The legacy interactive demo remains browser-local. Configure real admin
credentials privately and complete shipping/payment/abuse/backup launch work
before accepting sales.

The installer requires the successful preview installation on the same Ubuntu
24.04 server, the existing Let's Encrypt certificate for both names, and the
managed nginx site created by the original bootstrap. It refuses unmanaged paths,
units, occupied ports or unexpected certificate/site state. It copies the pinned
preview Node runtime into an independent /opt/polymoly-live/runtime directory,
builds with an unprivileged polymoly-live account, and serves on loopback port
3210. Its data lives separately in /var/lib/polymoly-live and private environment
in /etc/polymoly-live/environment. It does not copy preview data or credentials.

Before switching nginx, it backs up the current configuration under
/var/backups/polymoly-live and checks app health. It then installs the reverse
proxy, preserves the ACME challenge path and certificate files, redirects HTTP
and www to https://polymoly.ir, limits login requests per client, checks nginx
syntax, reloads and verifies HTTPS health/root HTML/an existing image/www.
Readiness waits for the actual JSON application identity after graceful reload;
the old launch page's plain ok response cannot cause success. Each readiness
check retries up to 30 times and preserves its last body/curl error in the
private deployment backup. Failures name their stage and source line before
rollback, so a failed content check is distinguishable from TLS or proxy errors.
The obsolete launch-page CSP is replaced with headers compatible with Next.js.

On a checked deployment error it restores nginx and the previous live release
pointer when available; the preview remains untouched. A manual restore command
for nginx is printed on success. Data and previous releases are retained. A
snapshot of the prior live service unit is kept with its nginx backup.

After Live website ready, verify the site in a browser and recheck certificate
renewal with certbot renew --dry-run. Inspect logs using journalctl -u
polymoly-live.service. No firewall, DNS or other application's service is changed.
Script syntax/lint and app CI checks do not prove a remote deployment occurred;
the actual server health and ready output determine completion.
