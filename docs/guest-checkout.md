# Guest reservation preview

/checkout provides a product picker, quantities, a server-generated reservation
receipt, refresh and owner-only cancellation. It does not collect contact or
shipping details and cannot initiate/confirm payments. The old Vite demo cart
is independent. CHECKOUT_ENABLED defaults to false: the page stays closed and
all checkout APIs return 503 before database access. Keep it false until full
Next.js build/type/browser checks and launch review pass.

For private staging only, CHECKOUT_ENABLED=true enables this reservation preview.
Set CHECKOUT_ORIGIN to the exact trusted origin. Production requires HTTPS;
development alone allows HTTP localhost/127.0.0.1. No live flag was changed.

POST /api/checkout/session sets a random 32-byte guest identity in a 24-hour
HttpOnly/Secure/SameSite=Strict cookie. Only its digest is stored in SQLite.
POST /api/checkout/orders accepts only items and an idempotency key, deriving
ownership from the server session. Mutations require an exact Origin match;
bodies are limited to 8 KiB. One guest may hold one active reservation, with
same-request retries returning the original receipt without another stock hold.

GET /api/checkout/orders/[id], GET /api/checkout/orders/active and
POST /api/checkout/orders/[id]/cancel are owner-scoped. Other-owner orders get
the same 404 as missing orders. Active lookup recovers a lost create response.
SessionStorage holds only cart IDs/quantities, request key and receipt ID;
prices/status always come from the server. Losing the guest cookie loses access
to its old receipts; the stock hold still expires after 15 minutes.

Persistent 15-minute limits permit 60 new sessions and 60 reservation attempts
globally, plus 10 attempts per guest. These coarse limits can be exhausted by
other visitors; guest identity can be reset by clearing cookies. They are not a
replacement for verified per-client proxy limits and public-launch abuse review.
Guest identities are anonymous sessions, not verified customer accounts.

npm run test:checkout covers launch gating, session cookies, origin/ownership,
price/owner injection, expiry, limits, idempotency, active receipt recovery and
database restart. Built Next HTTP tests also verify the real route dispatch and
the browser test covers cart creation, receipt reload/recovery and cancellation
over disposable localhost HTTPS. All have passed locally; Linux/server staging
validation and launch review remain separate. The launch flag stays false.
