# Customer implementation and verification

Updated 13 November 2026. Continue locally on Supabase; drivers and admin workflow completion are the next phases. Deployment/provider migration remains deferred, following [development-plan.md](development-plan.md).

## Implemented

- Database-backed trips and messages, empty customer states, session-aware navigation, closing account menu, local date/time, consent-based location/weather and notification controls.
- Customer profile and preferences, current-password verification before email/password changes through Supabase Auth. Confirmed email changes retain application identity and booking ownership.
- Live catalogue/vehicle selection and server-priced bookings. Future Iceland pickup time, passenger/luggage capacity, overlap checks and price snapshots. Pickup rescheduling preserves the saved occupied duration and price.
- Checkout request keys prevent repeat submissions from creating a second booking. A unique pending payment lease and stable provider idempotency key protect gateway retries. Missing credentials preserve an unpaid booking rather than reporting a successful payment.
- Verified account ownership or a signed, HTTP-only guest capability protects checkout/status/lookup. A reference or browser success query cannot establish payment or ownership.
- Owned receipts only for recorded captured/refunded payments. Receipts are payment records, not VAT invoices.
- Agreed cancellation policy: unpaid/unstarted trips cancel; paid/unstarted trips save a cancellation/refund review request. No automatic refund. Started/terminal trips are locked. Review requests retain reservations until reviewed.

The additive `20261113000000_customer_checkout` migration is applied. Persist the private `BOOKING_ACCESS_SECRET` (at least 32 characters); changing it invalidates existing guest browser access. Never expose it to the client or commit `.env`.

## Verification completed

- TypeScript and lint passed; production build passed.
- 40 targeted tests passed across ownership, pickup duration, pricing, catalogue, Teya signature verification, permissions, API failure handling, alerts, reminders, messages and polling.
- Temporary Supabase Auth/database account checks passed: empty trips, isolated ownership, messages/unread alerts, profile persistence and privilege rejection, private payment/receipt access, unpaid cancellation, paid review without money movement, started-trip lock, false payment-success query, push-subscription removal and live weather. Fixtures removed afterward.
- Headless browser checks passed: empty states, booking action, account menu close icon/outside click/Escape, alert on/off and denied-permission message, and mobile viewport fit.
- Guest checkout integration passed with temporary catalogue/vehicle/booking fixtures: server price despite client tampering, capacity and overlap rejection, repeated request reuse, changed-request rejection and private/tampered guest access. Missing credentials left one unpaid booking and no payment record.
- A separate explicitly preloaded test transport simulated pending and successful Teya responses. Checkout reused one payment/session and confirmation persisted CAPTURED/CONFIRMED. No real gateway call or charge. Temporary fixtures removed.

The scripts `check-customer.mjs` and `check-customer-checkout.mjs` must only run against an isolated local server with SMTP, WhatsApp and Web Push delivery disabled. `teya-test-transport.mjs` is explicitly preloaded only for verification and is never imported by application code. It is not proof of merchant integration.

## Pending delivery and acceptance checks

User explicitly deferred these while the client obtains credentials:

- Teya sandbox merchant checkout and real signed webhook delivery: `TEYA_CLIENT_ID`, `TEYA_CLIENT_SECRET`, `TEYA_STORE_ID`, `TEYA_WEBHOOK_PUBLIC_KEY`. Production payments remain disabled.
- Booking email delivery: private `SMTP_URL` and `MAIL_FROM`; Supabase Auth SMTP and allowed redirect URLs for verification/reset/email-change links.
- Actual phone/browser background push permission and delivery, including an installed app where required by the device. Local toggle/subscription tests do not prove delivery on a handset.
- Client/customer acceptance using real supported journeys, configured catalogue prices and agreed cancellation messaging. Receipt/company/tax requirements need business confirmation before calling the receipt a tax invoice.

Intermittent Supabase Auth timeouts and a database connection closure during notification preparation occurred during verification; the API returned 503 rather than pretending the user was signed out or supplying dummy data. A later complete run passed. Monitor this reliability before launch.

## Teya credential update — 14 November 2026

Client ID, client secret, store ID and webhook public key were supplied and saved privately in `.env`. The supplied bare-base64 key was converted to PEM and validated as a 2048-bit RSA public key. Application configuration remains sandbox-only; confirm whether the issued merchant credentials belong to sandbox or production before any real provider call. Credential presence/key parsing do not establish merchant authentication or successful webhook delivery. The client secret shared in chat should be rotated and the replacement entered directly in `.env`.

Per the user’s decision, external checkout/webhook delivery testing is deferred until the hosted test deployment. No OAuth request, checkout session or payment was created as part of configuring these values. SMTP/email delivery remains pending.
