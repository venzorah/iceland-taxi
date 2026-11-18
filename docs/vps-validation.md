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

Still pending:

- Actual source pg_dump/pg_restore rehearsal, full restore content comparison, original-account password verification and final identity import on the new private target. Synthetic migration tests are not a claim that real data has already moved.
- Linux/VPS PostgreSQL installation, systemd/Nginx syntax/resource-limit/reboot checks, Linux Prisma engine, TLS/firewall/renewal and bounded log rotation behavior. This Mac cannot validate the future Linux service installation.
- Real SMTP credentials, sender deliverability, encrypted off-site backup destination/retention/failure alerts and timed recovery drill.
- Production webhook delivery and in-flight Teya checkout/event reconciliation at separately authorized cutover. Local RSA/stub tests do not prove live provider delivery.
- The developer's .env still points wherever the user configured it; it was not switched to the test cluster or real target. New auth needs target migration/import and a private BETTER_AUTH_SECRET before real login testing.

See [authentication implementation/import](auth-transition.md), [deployment](vps-deployment.md) and [database rehearsal/rollback](postgresql-migration.md).
