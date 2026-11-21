# Next.js migration

The Next.js App Router lives in `src/app`. Existing interactive modules remain
JavaScript and load inside a client-only boundary; new routes and shared catalog
contracts use strict TypeScript. This is an incremental migration, not a finished
production store. The existing Vite commands and Pages workflow still work.

## Install and verify

The initial development host could not resolve registry.npmjs.org. A subsequent
installation attempt was blocked by automatic approval review because it also
triggered a Visual Studio telemetry connection with an unknown payload. Disabling
telemetry and dependency lifecycle scripts did not resolve that block. Dependency
installation is incomplete and the Next build has **not** been verified. Do not
use partially installed packages as evidence of a successful setup. The existing
lockfile is intentionally preserved for the working Vite build.

An offline installation was also attempted with lifecycle scripts, audit and
funding requests disabled. It returned ENOTCACHED: the required Next.js package
metadata is not available locally. No network installation was retried after
the telemetry block.

On a development machine with npm registry access:

```sh
npm ci
npm run setup:next
npm run test
npm run build:next
npm run typecheck
npm run test:next
npm run dev:next
```

`setup:next` adds the pinned Next.js runtime dependency and TypeScript development tools to package.json
and updates package-lock.json. Commit both generated manifest changes after the
checks pass. Then CI can use npm ci without the temporary setup step. Do not run
the setup command in the live web root. Next.js requires a Node.js server; the
GitHub Pages workflow continues to publish only the existing Vite preview.

Validation performed on the development host: the existing Vite production build
passed, all eleven new TypeScript/TSX files passed syntax transformation, and all
five 2048 tests passed. The existing arcade integration test failed with local
network EACCES on 127.0.0.1:3199. Next.js build, type checking and HTTP smoke checks
remain pending dependency installation; syntax checks do not establish runtime
or type correctness.

The SQLite catalog and its read API are documented in docs/catalog-storage.md.
Product preview pages, the server-rendered home-page links and enabled sitemap
now read that database per request. The current npm run test:offline suite has
43 passing tests across catalog storage, service responses, administrator access,
order reservations and existing 2048 logic. All 26 TS/TSX files pass syntax
transformation; that does not establish strict type or framework correctness.
The browser-local interactive demo remains independent of the server catalog.

Server-side administrator login and a product management page are now available
in the implementation at /admin. Configuration, security boundaries and tests
are described in docs/admin-setup.md. The administrator must configure a private
password hash before use; no credentials are shipped. The Next runtime and UI
checks remain pending framework installation.

Internal order reservations, authoritative line prices and release-once
inventory accounting are documented in docs/order-reservations.md. They share
the catalog transaction and are visible/cancellable through authenticated admin
routes. No customer checkout or payment endpoint is enabled.

## Routes and behavior

- `/`: existing Polymoly UI, plus server-rendered links to the official catalog.
- `/products/[slug]`: nine official product previews, rendered on the server,
  with title, description, image and canonical URL. Unknown products return 404.
- `/healthz`: application health response.
- `/api/products` and `/api/products/[slug]`: read-only database-backed catalog,
  uncached responses, 404 for missing/hidden products, sanitized 503 on failures.
- `/admin` and `/api/admin/*`: server-session administrator access and product
  creation/editing; no indexing and no public write access.
- `/robots.txt` and `/sitemap.xml`: closed to indexing by default. Set
  SITE_INDEXABLE=true **at build time**, rebuild and redeploy only after launch
  review. Products currently use demo prices; no payment offers are published.

Existing localStorage keys and photos are preserved. NEXT_PUBLIC_ARCADE_API
replaces VITE_ARCADE_API for Next.js; Vite accepts either during migration.
Public environment values are embedded at build time and must contain no secrets.

## Deployment boundary

Use Node 24 LTS for the database-backed routes. Configure
POLYMOLY_DATABASE_FILE to a persistent absolute path outside the release and
public directories so new deployments retain the same catalog database.

Keep the current nginx launch page and TLS configuration until checks pass.
Prepare a separate release directory, build it there, run Next as an unprivileged
service on 127.0.0.1:3000, and verify health before switching nginx upstreams.
The Next config also produces standalone output; if using that output directly,
copy public and .next/static into its release directory before starting server.js.
Retain the prior release for rollback. Never use next dev for production.

Before enabling sales, replace browser-local identity, admin, wallet, orders,
inventory and simulated checkout with authenticated server services, a database,
verified gateway callbacks and tested off-server backups. These are not provided
by this migration. No server deployment or payment activation was performed.
