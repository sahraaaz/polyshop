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

The Next.js product previews, home-page product links and enabled sitemap now
read this database per request. The initial nine official records come from
`src/data/catalog-seed.js`. `server/catalog-service.mjs` opens one lazy connection
per process and rejects paths inside static asset and build directories. Set
POLYMOLY_DATABASE_FILE to a persistent absolute path in production; the default
is data/polymoly.sqlite relative to the service working directory.

GET /api/products and GET /api/products/[slug] use the same store. Responses are
not cached; missing or hidden products return 404, and storage failures return a
generic 503 with Retry-After. No public mutation API is exposed; updateProduct
must only be called by a future authenticated server layer. The browser-local
interactive demo is still independent. Orders, reservation accounting,
authentication and payments remain separate work.

Run npm run test:catalog with Node 24 to verify persistence across restarts,
moderation visibility, invalid input, schema versions, response behavior and the
typed data adapter without network access or installing dependencies. Next.js
runtime smoke tests remain pending installation of the framework itself.
