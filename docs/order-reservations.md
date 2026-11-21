# Order and inventory reservation foundation

Order storage shares the catalog SQLite connection so line-price snapshots,
inventory decrements and order creation commit in one BEGIN IMMEDIATE transaction.
It uses no additional dependencies. Run npm run test:orders with Node 24.

The internal reserveOrder method accepts product IDs, integer quantities (1–20
per line, at most 20 distinct lines), an owner secret and an idempotency key.
It rejects submitted prices/totals and duplicate product lines. It reads current
approved products and prices from the database, applies integer discount rounding
and checks the total fits safe integer bounds. Amounts are explicitly in TMN
(toman); a future gateway adapter must perform any required currency conversion.

Reservations reduce available stock for 15 minutes. Replaying an owner's same
key/cart returns the same order without another deduction or TTL extension;
changing that cart with the same key conflicts. Product titles and discounted
prices are snapshotted so later catalog edits do not change existing totals.
Owners are hashed; their raw secret and idempotency metadata are excluded from
order responses. This key must eventually be bound to a server-created customer
session; it is not a public customer authentication API.

Cancellation and expiration release stock exactly once. State transitions have
an order event history in the same transaction. Expiration is lazy: the next
catalog/order read or reservation performs cleanup. There is no scheduled cleanup
job. On restart, reservations persist and existing seed data does not reset stock.
Stock in the admin editor means available-to-sell units, excluding active holds.
Stock edits require the loaded expectedStock value. A stale editor gets a 409
inventory_changed response rather than overwriting an intervening reservation;
the final comparison is performed inside the product write transaction.

GET /api/admin/orders lists the latest 100 orders, including their item snapshots.
POST /api/admin/orders/[id]/cancel requires both a valid admin session and exact
Origin match. The admin panel lists orders and offers an explicit cancellation
confirmation. Customer order creation, contact/address collection, shipping,
payment initiation/verification and paid/fulfilled status transitions are not
implemented or publicly exposed. No UI or API can mark these reservations paid.

The current storefront remains a separate local demo. Do not open real checkout
until its customer session, anti-abuse limits, gateway verification and failure
recovery are implemented and the full Next runtime is verified.

Tests cover authoritative pricing, idempotency, owner scoping, whole-cart rollback,
input and amount bounds, release-once semantics, persistence after restart and two
simultaneous SQLite connections racing for the last unit. Admin handler tests
also cover authorization, origin checks, cancellation and sanitized failures.
