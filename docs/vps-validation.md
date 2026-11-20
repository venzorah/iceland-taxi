# VPS transition validation — 18 November 2026

No deployment or real-source database migration has been performed. Read-only source metadata/fingerprints were collected; all mutation tests used a disposable local PostgreSQL 17.11 cluster with synthetic records.

Completed:

- Source inventory: PostgreSQL 17.11; six completed migrations, all six original local checksums match; 29 public tables, no public routines/triggers/policies, no Supabase Storage objects/buckets. Two confirmed linked bcrypt accounts; no source passwords/hashes were exported to a file or printed.
- Source content fingerprinting: all 29 public tables covered. Self-comparison passes, altered-content/missing-table fixtures fail. Source currently has two User records and one StaffProfile, zero Booking/Driver/Payment/Message records.
- New additive auth migration applied on a separate synthetic PostgreSQL 17.11 target, never on the source. Native Better Auth Prisma adapter exercised with an unprivileged runtime role under the target RLS policies.
- Password-preserving importer: synthetic source reads are read-only; default dry run reports counts; apply imports six identities with original IDs/timestamps/business links; one unsupported hash becomes a reset exception and one deleted identity stays disabled. Retry skips all six without rewriting credentials or business users.
- Authentication acceptance: preserved bcrypt and wrong-password handling, verified/disabled gates, internal-field forgery rejection, CSRF, signup confirmation, generic recovery responses, single-use reset token, scrypt after reset, all-session revocation, reset exception recovery, current-address approval and new-address verification. Links captured in memory, not externally delivered.
- Actual production Next.js fixture: global logout/cookie expiry/replayed-session rejection; customer empty state and trip ownership/private messages/unread state/profile/receipt/cancellation; driver ownership, concurrent/repeated status transitions, full journey, busy lock, messaging/reassignment/deactivation; all five staff roles and admin content/catalogue/fleet/assignment/payment-history rules. No real payment, refund or notification requests were initiated.
- Standard PostgreSQL connection probe: runtime read/write was rolled back. Runtime RLS/DML works, schema creation and migration-history updates are denied. No provider Data API is used by the diagnostic scripts.
- Unit suite: **87 passed**. TypeScript and production build checks passed. Isolated build source contains no private .env, database credentials or public Supabase identifiers.
- Node.js **22.23.5** production build and all **87 tests** passed. Final browser assets (136 files) contain no configured server-secret values.
- Real Next.js HTTP signup and account-security emails were delivered into the fixture-only SMTP sink: customer default role, provisioned driver ID/role, current-password checks, password update, email collision guard, current/new-address confirmation and stable business IDs passed.
- Real Nodemailer SMTP conversation with a loopback-only sink: text/HTML, sender/recipient, reply-to and missing-config behavior passed. No external email.
- Production dependency audit: **zero vulnerabilities**. A separate high-severity unpatched picomatch development/build-tool advisory remains tracked in auth-transition.md; no force upgrade/downgrade was performed.
- Isolated Chrome browser checks passed: customer empty state, profile modal/mobile sheet, account-menu dismissal, alert toggle, mobile overflow, driver entry/activation labels and password visibility, customer denial/driver routing, plus customer/driver composers with mocked sends on mobile/desktop. Browser fixtures were removed.
- Role navigation follow-up: 10 focused navigation/permission/ownership tests passed. Isolated Chrome with mocked sessions/APIs verified Super Admin, Staff, Driver and Customer desktop portal links, mobile tabs, account-menu close, and absence of customer profile requests for staff/drivers. All five dedicated login/signup screens rendered with logos, correct fields and password visibility controls; cross-role login screens required an explicit account switch. This follow-up did not sign in real users or access application data.
- Supabase SDK application and operational-script usages replaced before removing the packages. Source-only migration/inventory SQL deliberately still reads the old auth schema.

Admin UI follow-up — 19 November 2026:

- Removed the duplicate staff email/sign-out bar; the main header contains a profile dropdown and page/booking search. Admin content uses a bounded viewport with its own scrolling area.
- Services have no upload control. Service and route deletion now removes catalogue records transactionally while retaining bookings, payment records and saved journey/price details. Driver, vehicle and media removal intentionally archives records to retain history; inactive fleet entries can be shown explicitly.
- Shared accessible modal, confirmation, form, toggle, busy-button, notice and empty-state components are used across catalogue, fleet, editorial and settings screens. Announcements await server confirmation and surface failures rather than silently swallowing them.
- Actual DELETE handlers passed isolated in-memory checks for success, missing records, permission denial, retained history, transaction rollback and refusal to archive a driver during an in-progress journey. Run `node --experimental-vm-modules scripts/check-admin-deletions.mjs`; this does not access any database.
- Five focused staff permission/navigation tests passed. TypeScript, scoped ESLint and the production build passed; the build used one worker with a 2 GB JavaScript heap limit and an invalid loopback database URL.
- Isolated Chrome with mocked sessions/APIs passed header profile dismissal/search, hidden service uploads, service save/delete/cancel, duplicate-submit prevention, failed/successful toggles, fleet add/view/archive/inactive filtering, failed vehicle save recovery, bounded mobile editorial modals, document height/overflow and failed/successful announcement persistence. The temporary preview route was removed. These checks do not replace a live database smoke test after migration.
- No deployment, real database mutation, email, notification or payment was initiated by this follow-up.

Driver administration and email follow-up — 20 November 2026:

- Driver creation now provisions a linked verified identity and scrypt credential in the same transaction as the business profile. A random initial password and driver login URL are sent only to the driver's email; no plaintext credential is stored in notices or returned to the admin UI. Failed SMTP delivery is explicit and can be retried through the confirmed admin login-email action. That action rotates credentials and revokes old sessions/reset tokens while retaining business IDs.
- Public driver signup, homepage recruitment/sign-in links and customer-auth driver links were removed. Reserved driver/staff emails are blocked by the real Better Auth creation hook, with its generic anti-enumeration response preserved. Only customers can self-register.
- Auth and notice mail now use shared branded HTML/text templates, selectable credentials and real CTA buttons. Driver and reset previews were rendered at 390px and 800px with no horizontal overflow. Mail-client-specific rendering and live inbox delivery remain deployment checks.
- Isolated handler checks passed for permission gates before side effects, strict input, SMTP preflight, failed-delivery reporting and resend rate limits. Unit tests exercise actual Better Auth sign-in with generated credentials, reserved-account signup denial, customer signup, hashed-only persistence, ID preservation and recovery. Actual Nodemailer delivered styled driver/reset/booking fixtures to a loopback-only sink, with no outbound email.
- 49 focused authentication/email/payment/pricing tests, TypeScript, scoped ESLint and the production build passed. The build used one worker, a 2 GB JavaScript heap limit and an invalid loopback database URL. No production users, database records, configuration or deployments were changed. No real email or payment was sent. No schema migration is required for this follow-up.

Still pending:

- Actual source pg_dump/pg_restore rehearsal, full restore content comparison, original-account password verification and final identity import on the new private target. Synthetic migration tests are not a claim that real data has already moved.
- Linux/VPS PostgreSQL installation, systemd/Nginx syntax/resource-limit/reboot checks, Linux Prisma engine, TLS/firewall/renewal and bounded log rotation behavior. This Mac cannot validate the future Linux service installation.
- Real SMTP credentials, sender deliverability, encrypted off-site backup destination/retention/failure alerts and timed recovery drill.
- Production webhook delivery and in-flight Teya checkout/event reconciliation at separately authorized cutover. Local RSA/stub tests do not prove live provider delivery.
- The developer's .env still points wherever the user configured it; it was not switched to the test cluster or real target. New auth needs target migration/import and a private BETTER_AUTH_SECRET before real login testing.

See [authentication implementation/import](auth-transition.md), [deployment](vps-deployment.md) and [database rehearsal/rollback](postgresql-migration.md).
