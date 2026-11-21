# Administrator access and product management

The Next.js /admin page uses server-side authentication and the SQLite catalog.
It is independent of the old browser-local demo administrator. There is no
default password and the old demo password grants no access to these APIs.
Until ADMIN_PASSWORD_HASH is configured, admin APIs return 503.

## Configuration

Use Node 24 LTS. Generate the password hash locally with npm run admin:hash.
The interactive prompt hides the password; choose a unique password of at least
16 characters. Do not pass the password as a command-line argument, paste it in
chat or commit it. The command prints a salted scrypt hash. Place that hash in
the service's private environment as ADMIN_PASSWORD_HASH, with ADMIN_ORIGIN set
to https://polymoly.ir. Use a root-readable service environment file outside Git
and quote the hash literally: its dollar signs must not be expanded by a shell.
Restart the application after configuration changes.

For local development only, ADMIN_ORIGIN may be http://localhost:3000 or
http://127.0.0.1:3000. Production requires HTTPS. The exact configured origin
must match the browser origin; redirect the www hostname to the chosen canonical
hostname before using /admin.

## Sessions and request protection

Passwords use scrypt (N=131072, r=8, p=1, 16-byte random salt, 64-byte key).
The password itself is never stored. Session tokens are 32 random bytes, issued
in a host-only HttpOnly, Secure, SameSite=Strict cookie with an eight-hour
lifetime. Only SHA-256 token digests are stored in the separate administrator
SQLite database. Logout revokes the session. Changing ADMIN_PASSWORD_HASH
invalidates existing sessions because each is bound to the credential digest.

State-changing requests require an exact Origin match. Product writes require
an authenticated server session, validated bounded JSON, and an allowlisted set
of fields; role, ownership and existing product IDs cannot be changed by input.
The server records product creation/edits and their before/after values in an
audit table in the same transaction as the product change. There is no hard
delete: archive products so their history remains available.

Login permits five attempts per 15-minute global window, persisted in SQLite.
This deliberately does not trust client-provided IP headers. It is a coarse
single-admin limit, so another visitor can temporarily exhaust the same window;
configure a separate per-client nginx login rate limit before public launch.
Successful logins also consume attempts. The API currently has one configured
administrator, without account recovery, multiple roles or multifactor login.

## Operations

Supported: create a product, edit its text/price/stock/discount, and change its
status between pending, approved and archived. Product images reference existing
JPG files under public/products; upload and image processing are not implemented.
The panel also lists the latest 100 internal order reservations and can cancel
pending reservations to release inventory. See docs/order-reservations.md.
Stock is available-to-sell inventory after active holds. Updates carry the loaded
expected stock, and stale edits are rejected instead of restoring held units.
The old browser-local demo storefront remains independent, while server product
previews and the public API reflect authenticated changes immediately.

Admin storage uses POLYMOLY_DATABASE_FILE plus the suffix .admin.sqlite.
Protect both SQLite databases and their WAL files with service-only permissions.
Keep them in a persistent directory outside web assets and release directories.
Coordinate backups and verify restore; these operations are not automated by
this patch. Restrict private environment files to the service administrator.

## Validation and deployment boundary

Unit/integration checks for credentials, sessions, expiration, revocation,
throttling, cross-origin rejection, product permissions and audit behavior run
with npm run test:admin. Local strict type checking, production Next build,
built-server HTTP flows and the actual browser admin form flow have passed.
The browser test uses only disposable credentials and a fresh headless profile.
Linux CI and a separate server staging/launch review precede public sales.
No production administrator password was generated or configured in this work.
