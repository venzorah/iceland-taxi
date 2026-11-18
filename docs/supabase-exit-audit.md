# Supabase exit audit and authentication decision

**Historical source audit, before replacement.** The password-preservation decision is now approved and the replacement is implemented locally; see [current transition status](auth-transition.md). The source observations below remain valid for the untouched source database.

Inspected 18 November 2026. This is preparation, not a completed provider replacement. No existing records have been changed and nothing has been installed or deployed on the VPS.

## Specific code findings

| Dependency | Current implementation | Required transition |
| --- | --- | --- |
| Packages | `@supabase/ssr`, `@supabase/supabase-js` | Retain until all call sites and operational tests are replaced. |
| Login, registration, recovery | `src/app/login/LoginForm.tsx` calls `signInWithPassword`, `signUp`, `resetPasswordForEmail`, `updateUser` from the browser | Same UI and routes, backed by maintained server authentication endpoints. |
| Email/password changes | `src/components/customer/CustomerProfile.tsx` reauthenticates and updates through Supabase | Preserve current-password verification and confirmed email-change flow; use new provider and SMTP. |
| Identity and roles | `src/lib/auth/session.ts` verifies a Supabase token via `getUser`, requires confirmed email, then links `User.authId`; roles/staff status come from Prisma | Replace identity verification, retain application `User.id`, role checks, inactive staff handling and ownership checks. Do not authorize using client metadata. |
| Cookie refresh and route protection | `src/middleware.ts`, `src/lib/supabase/server.ts`, `client.ts` | New secure cookies, expiration, refresh/revocation and private-page guards. API authorization remains server-side. |
| Session UI | `src/components/providers/SessionProvider.tsx` subscribes to Supabase auth changes, reads `/api/auth/session` | Replace subscription with provider-independent session refresh and cross-tab invalidation. Keep public response shape. |
| Confirmation | `/auth/confirm` exchanges PKCE codes or verifies Supabase OTP hashes | Preserve route UX but implement new single-use, expiring verification/recovery tokens and safe redirects. Old links will expire at cutover. |
| Logout | `/api/auth/signout`, plus browser logout in `LoginForm` | Replace real session revocation, not merely cookie removal. Previous localhost fix was invalid `NEXT_PUBLIC_APP_URL`, not independent auth. |
| Provisioning / tests | `scripts/bootstrap-admin.mjs`, `check-{admin,admin-browser,customer,driver,media-library,message-composer,profile-driver-ux,signed-in-reads,signout}.mjs` | Rewrite fixture/provisioning adapters. Bootstrap currently queries `auth.users` and can create Supabase accounts. Do not run these against production for migration validation. |
| Data | `src/lib/prisma.ts` and server route handlers use Prisma/PostgreSQL | Already independent SQL. Clear `DATABASE_TRANSACTION_URL`, replace runtime and migration URLs, explicitly set loopback TLS mode and connection limit. No Supabase Data API `.from()` or `.rpc()` calls found. |
| Images | `src/lib/media/cloudinary.ts`, Prisma `MediaAsset` metadata | Preserve Cloudinary account, URLs and public IDs. No Supabase Storage SDK usage. |
| Messaging / notifications | PostgreSQL + polling; Web Push and optional WhatsApp separately | Preserve existing behavior. No Supabase Realtime channels. No Edge Function invocation found. |
| Migrations | Six committed migrations; `authId` UUID and RLS on application tables | Preserve SQL files and `_prisma_migrations` checksums. No migration FK to `auth.users`, no source public policies/functions/triggers found. New target server role needs explicit RLS policies. |
| Deployment diagnostics | `scripts/diagnose-hosting.cjs`, `.env.example`, auth docs and archived deployment packaging | Retire Supabase checks only after transition. Generated/ignored cPanel archives are historical, not VPS release inputs. |

`User.passwordHash` is a nullable legacy column. Current authentication neither writes nor verifies it. It must not be mistaken for a usable local authentication implementation. `User.authId` (Supabase UUID) and `User.id` (application cuid) are different identifiers. Bookings, drivers, staff and messages refer to the application ID.

## Read-only source observations

The configured source reports **PostgreSQL 17.11**, UTF8, `en_US.UTF-8`. Do not install Ubuntu 24.04's default PostgreSQL 16 and attempt a downgrade. Use the PostgreSQL 17 repository packages and compatible client tools, applying the latest supported 17.x patch on the new server.

Installed extensions: `pg_stat_statements` 1.11, `pgcrypto` 1.3, `plpgsql` 1.0, `supabase_vault` 0.3.1 and `uuid-ossp` 1.1. Non-core extensions live in `extensions` or `vault`, outside `public`. The current Prisma application schema does not call them. Do not copy Supabase Vault or service schemas into the app database; inspect archive dependencies before restore.

There are **29 public tables including `_prisma_migrations`**, all with RLS enabled. All six migration entries are finished with no rollback, and all six local SQL checksums match. Supabase Storage has zero buckets and zero objects. The inspection script additionally compares each checksum with the local SQL file and reports any mismatch.

There are **two application users**: one customer and one super admin. Both link to confirmed Supabase email/password accounts; both hashes are bcrypt. No broken links, auth-only accounts, missing passwords, banned accounts or enrolled MFA factors were found. The content manifest counted zero bookings, drivers, payments and messages at inspection time; the super admin has one StaffProfile. Driver and business-flow acceptance therefore needs controlled clone fixtures, not claims based on existing live records. These are aggregate observations; no passwords or password hashes were exported. Rerun immediately before rehearsal/cutover because accounts can change.

Reproduce read-only metadata inspection with `node scripts/vps/inspect-source.mjs`. It loads the private local environment, uses `MIGRATION_SOURCE_URL` or `DIRECT_URL`, and prints only metadata/counts. It does not dump account rows, session tokens or hashes. Keep operational inventory output private.

## Account/password decision BEFORE replacement

Recommended library: **Better Auth with its Prisma adapter**, inside the existing Next.js app. It supports email/password, database-backed sessions, verification/recovery and a documented Supabase migration path. This proposal is not installed or wired into the app yet.

1. **Preserve passwords where supported (recommended):** import the existing bcrypt hashes into credential accounts, verify bcrypt through a maintained implementation, and use the library's supported hashing configuration for new/reset passwords. Rehearse known-account login and hash compatibility first. Export only the minimal identity fields through a private channel; never log hashes or commit exports.
2. **Require password reset:** import identities and verified status without usable passwords, then issue single-use reset links through verified SMTP. User IDs still stay unchanged. This requires working email delivery before anyone can regain access.

Both options invalidate existing sessions and old verification/recovery links. Never import Supabase access/refresh tokens as new sessions. Email-only accounts are the current source state; if new OAuth/MFA/blocked/deleted identities appear, stop and handle them explicitly rather than silently granting access.

Proposed mapping: keep existing application `User.id` as the stable business key. Prefer separate provider authentication tables with an explicit unique link to `User.id`; preserve original `authId` as migration provenance. Do not replace business IDs with Supabase UUIDs or let a new signup claim an existing privileged email without verified identity. Preserve confirmation timestamps, disabled/deleted state, email-change semantics and original timestamps. Auth-only identities, if any at final export, need a reviewed mapping rather than omission.

Before implementing: agree password strategy, finalize the adapter/schema mapping and reviewed additive migrations, configure SMTP, and define verified-email linking for pre-provisioned driver/staff accounts. No new auth schema or account import has been executed in this preparation.

## Sources

- [Better Auth's Supabase migration guide](https://better-auth.com/docs/guides/supabase-migration-guide): provider account import and session invalidation; adapt its examples to our existing business IDs rather than copying them blindly.
- [Next.js self-hosting](https://nextjs.org/docs/app/guides/self-hosting): reverse proxy and streamed responses.
- [PostgreSQL dump documentation](https://www.postgresql.org/docs/17/app-pgdump.html): consistent backups, version compatibility and schema-selection limits.
