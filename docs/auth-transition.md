# Password-preserving authentication transition

Decision approved: preserve supported existing passwords; require reset emails only for exceptions. Application authentication now uses Better Auth 1.7.25 and Prisma. Supabase SDKs, browser clients and refresh middleware have been removed after replacing their usages. **This code has not been deployed and the real source database has not been migrated.**

## Implementation

- `AuthIdentity`, `AuthAccount`, `AuthSession`, `AuthVerification`, `AuthRateLimit` are separate tables introduced by the additive `20261118000000_independent_auth` migration. The six applied migrations are unchanged.
- Imported identity IDs retain their Supabase UUIDs. `AuthIdentity.appUserId` links to the original application `User.id`; existing `User.authId` remains provenance. Bookings, drivers, staff profiles, messages and payments keep their existing keys and relationships. Original account/identity timestamps are retained by the importer.
- Imported bcrypt `$2a$`, `$2b$`, `$2y$` hashes are verified without rewriting. New and reset passwords use Better Auth's maintained scrypt implementation. Unsupported/missing hashes become null credential passwords, with a counted reset exception; no random usable password is assigned. No plaintext existing password is required.
- Confirmed status is preserved. Deleted or currently banned identities import as disabled; a temporary ban requires manual review to re-enable after expiry, rather than silently granting access. Unsupported OAuth/anonymous identities, duplicate emails, missing source links and collisions stop the import for review.
- Normal sign-up cannot supply roles or internal links. Verified new identities create CUSTOMER business accounts on their first application session. A server-side creation hook blocks self-registration for reserved staff/driver emails. New driver credentials are admin-provisioned and emailed via SMTP; driver self-activation is disabled. Existing imported identities and business IDs remain unchanged, and Supabase-linked records must still be imported rather than silently reclaimed by signup.
- Existing `/login`, `/auth/confirm`, `/api/auth/session` and `/api/auth/signout` routes stay. Better Auth's own endpoints are under `/api/auth/*`. Middleware checks a cookie only for navigation; every protected server/API operation verifies the database session and application permissions.
- Session cookies are HttpOnly, SameSite=Lax and Secure for HTTPS. Cookie session caching is disabled so revocation is checked in PostgreSQL. Global logout revokes all database sessions, expires the browser cookie, and announces logout to other tabs. Password resets revoke all sessions; password changes revoke other sessions. Old Supabase cookies/tokens are ignored, and everyone must sign in again at cutover.
- Verification and recovery use one-time expiring links and the existing SMTP mailer. Signup/resend/recovery report delivery unavailable when SMTP is absent. Account email changes pass a current-password check through `/api/account/security`, then require approval from the current address and verification of the new address. Direct public `/api/auth/change-email` is blocked. Password changes require the current password too.
- Auth rate limits persist in PostgreSQL and use only an explicitly trusted proxy IP header. The existing hourly reminder job removes old auth rate counters. Driver `hasAccount` now checks the new verified identity instead of legacy authId.

## Runtime environment

Use `.env.example` or `deploy/vps/environment.example`, placeholders only. Required: the target runtime DATABASE_URL, DIRECT_URL, NEXT_PUBLIC_APP_URL, BOOKING_ACCESS_SECRET and a new private **BETTER_AUTH_SECRET** containing at least 32 random bytes. Generate the auth secret privately and retain it across restarts. It has no NEXT_PUBLIC prefix. The sole canonical auth origin is NEXT_PUBLIC_APP_URL, which must be HTTPS in production (HTTP loopback allowed for local testing). BETTER_AUTH_URL is not used by this project.

Runtime Prisma now uses **DATABASE_URL only**; stale DATABASE_TRANSACTION_URL no longer overrides a new destination. Remove obsolete Supabase environment values at cutover. SMTP_URL and MAIL_FROM are needed for verification/recovery and reset exceptions. Existing Cloudinary, Teya, Web Push and booking signing keys retain their existing purpose. No live credentials belong in the build environment.

**The developer's current private .env was not repointed.** It may still point to the old Supabase database without the new tables/key. Authentication on that unchanged destination is not expected to work with this new code. Prepare a restored target and apply the new migration/import there before trying real migrated-account sign-in. Do not run migrate deploy against Supabase to bypass the rehearsal.

## Import procedure on the reviewed private target

Follow `postgresql-migration.md` first: dump/restore public application data and all six source migration entries into a new empty PostgreSQL 17 target, compare content manifests **before** the additive auth migration, inspect constraints and checksum history, and retain Supabase.

With private target owner credentials loaded into DATABASE_URL and DIRECT_URL, run `npx prisma migrate status`, review that only the auth migration is pending, then `npx prisma migrate deploy`. Apply `deploy/vps/target-permissions.sql` as iceland_owner. Keep owner credentials out of the running app's environment.

Load **MIGRATION_SOURCE_URL** (source direct/session connection) and **MIGRATION_TARGET_URL** (loopback target owner connection) into a private operator environment. No values in command-line arguments or shell history. Then:

```sh
node --import tsx scripts/vps/import-accounts.ts
node --import tsx scripts/vps/import-accounts.ts --apply --target-database iceland_taxi_rehearsal
```

For the final reviewed target, the explicit name is `iceland_taxi`. This is not authorization to perform production cutover now. The script refuses other database names, non-loopback target URLs, an auth service schema on the target, mismatched role/database identity, differing restored users, unexpected identities and targets with sessions. Run before exposing the target to user activity. A remote VPS target requires running this operator command on the VPS or a reviewed SSH tunnel, never exposing port 5432 publicly.

Default is a read-only dry run on both databases. Apply reads the source in a read-only repeatable-read transaction and writes only new target authentication rows in one serializable transaction. It never updates/deletes/seeds application users or source records. Retry skips identically mapped imported accounts and never overwrites an existing password. Logs contain aggregate counts only; no emails, password hashes, tokens or connection strings. No auth export file is produced: source hashes move directly through process memory into the protected target database. Protect target dumps as credential-bearing backups.

If resetRequired is nonzero, identify those accounts privately in the target by null credential passwords and use the existing Forgot password flow after SMTP is verified. The importer sends no emails. Unconfirmed identities still need email confirmation. Blocked identities remain unable to sign in. No Supabase sessions, refresh tokens or old verification/recovery links are imported.

## Validation completed / remaining

On a disposable **local PostgreSQL 17.11** cluster with synthetic records, the dry run identified six identities, one reset exception and one disabled identity. Apply imported all six; retry skipped all six. No business row IDs/roles/timestamps were rewritten. A separate unprivileged runtime role exercised actual Prisma authentication under RLS and was denied schema changes and migration-history updates.

Authentication acceptance covered preserved bcrypt login, wrong passwords, verified/disabled gates, forged internal fields, cross-origin rejection, signup verification, generic recovery responses, single-use reset tokens, all-session revocation, new scrypt hashes, null-password exception recovery and old/new-address email confirmation. Email links were captured in memory. The real Nodemailer mailer was tested against a loopback SMTP sink, with no external delivery.

On Node.js 22.23.5, the production build and all 87 unit tests passed. Isolated browser checks also passed customer profile/menu/mobile states, driver login routing and both message composers. Actual production Next.js fixture checks passed global logout/replayed-cookie rejection, customer trip ownership/private messages/profile/security input restrictions/receipts/cancellation, driver status/ownership/reassignment/deactivation, and all five staff roles/admin content/catalogue/assignment/payment-history rules. Live payment calls and outbound notifications were unavailable to that fixture server.

These checks do not replace a real source pg_dump/pg_restore rehearsal, final imported-account login, Linux/VPS service verification, production SMTP deliverability or provider webhook delivery checks. The real source and VPS remain unchanged. Keep Supabase intact until target acceptance and the rollback window are complete.

## Test and operational scripts

`node --import tsx --test $(rg --files src -g '*.test.ts')` runs the unit suite. To reproduce synthetic acceptance, create NEW loopback databases named `source_fixture` (first six migrations) and `iceland_taxi_rehearsal` (all seven), plus the owner/runtime roles and reviewed target policies. Set AUTH_FIXTURE_SOURCE_URL and AUTH_FIXTURE_TARGET_URL privately; run `node --import tsx scripts/vps/prepare-auth-fixtures.ts --create-synthetic-fixtures`. It refuses nonempty application databases and never resets/drops them. Then run the importer dry-run/apply and `AUTH_TEST_DATABASE_URL` acceptance using private fixture environments. The acceptance script expects a fresh fixture; discard/recreate only the disposable test cluster when repeating it, never a real database. `scripts/vps/check-auth-transition.ts` accepts only an explicitly configured synthetic loopback rehearsal fixture. Legacy customer/driver/admin/browser check scripts now use `scripts/fixture-auth.mjs`, which refuses non-loopback databases, database names without `_test`/`_rehearsal`, or non-fixture email addresses. Do not use these scripts for production account creation.

`bootstrap-admin.mjs` now requires an already verified active local identity before granting the explicit operator-requested role; it does not invent a password or create a Supabase user. Existing admins come through the importer and do not need bootstrap.

Production dependency audit currently reports zero vulnerabilities. npm separately reports an unpatched picomatch advisory through development/build tools; the registry's latest release is still affected. Do not use npm audit fix --force to downgrade Next or replace Tailwind during deployment. Track the upstream fix and keep build tools away from public request handling. See [GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf).

References: [Better Auth Supabase migration](https://better-auth.com/docs/guides/supabase-migration-guide), [Prisma adapter](https://better-auth.com/docs/adapters/prisma), [session management](https://better-auth.com/docs/concepts/session-management).

## HTTP email acceptance harness

For a private synthetic app only, start `node scripts/vps/smtp-fixture-sink.mjs` (127.0.0.1:19027). Configure that app with SMTP_URL pointing to the sink and MAIL_FROM=`fixture@example.invalid`; never use real delivery credentials for this harness. Set AUTH_TEST_ORIGIN to the loopback app origin and DIRECT_URL to the loopback rehearsal owner connection, then run `node scripts/vps/check-auth-http.mjs`. It checks the actual Next.js routes, real Nodemailer transport, verification links, customer/driver roles, password changes and both email confirmations. It creates only unique example.invalid fixtures and cleans them up. The sink writes owner-only fixture messages to the OS temporary directory and accepts at most 100 messages; run only one harness instance at a time, then stop the sink.
