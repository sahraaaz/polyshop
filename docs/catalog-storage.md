# Catalog persistence foundation

`server/catalog-store.mjs` provides SQLite storage for official products using
Node's built-in `node:sqlite` module. Use Node 24 LTS, or a compatible Node 22
runtime with that module available. It requires no new npm packages.

`openCatalogStore({ filename, seed })` creates schema version 1, validates every
seed record, and inserts missing IDs in one transaction. Reopening the database
preserves edited prices, stock and publication state. The schema rejects newer
versions instead of silently downgrading them. Public reads exclude pending and
archived records; SQL values are always bound parameters.

The database path must come from trusted server configuration, outside the
public web root. Production file permissions, backups and restore verification
must be configured before use. Database files and WAL sidecars are gitignored.

This is an internal foundation only. It is not yet wired into the Next.js product
previews or the existing browser-local demo. No public mutation API is exposed;
`updateProduct` must only be called by a future authenticated server layer.
Orders, reservation accounting, authentication and payments remain separate work.

Run `npm run test:catalog` to verify persistence across restarts, moderation
visibility, invalid-input rejection and schema-version handling without network
access or installing dependencies.
