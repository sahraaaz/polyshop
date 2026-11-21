# Next.js migration

The Next.js App Router lives in `src/app`. Existing interactive modules remain
JavaScript and load inside a client-only boundary; new routes and shared catalog
contracts use strict TypeScript. This is an incremental migration, not a finished
production store. The existing Vite commands and Pages workflow still work.

## Install and verify

Dependencies are installed and locked: Next.js 16.4.6, TypeScript 5.9.3,
React/Node type packages and Playwright Core. Use Node 24 LTS. Installation does
not need package lifecycle scripts; Chrome/Chromium is supplied by the host.

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run check:next
npm run test
npm run build:next
npm run typecheck
npm run test:next
npm run test:browser
npm run dev:next
```

Next.js requires a Node.js server. The GitHub Pages workflow continues to publish
only the existing Vite preview. Validate in a separate release directory rather
than installing into the live web root.

The offline check:next preflight checks Node 24, built-in SQLite, readable package
metadata/entry points, matching React versions, TypeScript development packages,
and a Next.js version declared consistently in the manifest and lockfile. The
Next build/start scripts refuse a partial or unlocked installation. This is only
a prerequisite check; passing it does not verify types or framework behavior.
Local validation passed: strict TypeScript, full production Next build, all 53
offline tests, the real-client arcade network test, existing Vite build, built
Next HTTP smoke checks and browser flows. HTTP tests cover public HTML/images,
metadata/404/health, default-closed administration/checkout, configured admin
login/edit/logout, guest reserve/retry/recovery/cancellation, owner isolation and
stale inventory rejection. All flow tests use disposable credentials/databases.

The browser check uses a new headless Chrome profile and a temporary self-signed
localhost HTTPS server. It blocks all third-party requests. It verifies admin
forms, the guest cart/receipt/reload/cancellation, mobile receipt view and legacy
home hydration without client JavaScript errors. Set CHROME_PATH if necessary.
OpenSSL is required (Git for Windows mingw64/bin or the Linux openssl command).
No personal browser profile or production credential is used.

Windows builds use two worker threads and standard Next output to avoid child
worker/standalone-copy EPERM failures. Linux builds produce standalone output
with two workers for the small target server. The PR workflow now runs the build,
type, unit, HTTP and browser checks on Linux; its result is separate from local
verification. No deployment is performed by this workflow.

The SQLite catalog and its read API are documented in docs/catalog-storage.md.
Product preview pages, the server-rendered home-page links and enabled sitemap
now read that database per request. The current npm run test:offline suite has
53 passing tests across catalog storage, service responses, administrator access,
order reservations, guest checkout and existing 2048 logic.
The browser-local interactive demo remains independent of the server catalog.

Server-side administrator login and a product management page are now available
in the implementation at /admin. Configuration, security boundaries and tests
are described in docs/admin-setup.md. The administrator must configure a private
password hash before use; no credentials are shipped. Its routes and form flow
have passed local runtime and browser checks with a disposable test password.

Internal order reservations, authoritative line prices and release-once
inventory accounting are documented in docs/order-reservations.md. They share
the catalog transaction and are visible/cancellable through authenticated admin
routes. A guest reservation preview now exists at /checkout with owner-scoped
read/cancel endpoints, but defaults closed through CHECKOUT_ENABLED=false.
See docs/guest-checkout.md. Payments remain unimplemented.

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
The Next config produces standalone output on Linux; if using it directly,
copy public and .next/static into its release directory before starting server.js.
Retain the prior release for rollback. Never use next dev for production.

Before enabling sales, replace browser-local identity, admin, wallet, orders,
inventory and simulated checkout with authenticated server services, a database,
verified gateway callbacks and tested off-server backups. These are not provided
by this migration. No server deployment or payment activation was performed.
