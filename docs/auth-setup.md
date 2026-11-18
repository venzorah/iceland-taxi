# Database-backed authentication setup

Authentication now uses Better Auth and Prisma in the existing Next.js app. Follow [the password-preserving transition guide](auth-transition.md) for schema, account mapping, environment, importer commands and validation. The Supabase audit describes the pre-transition source, not the new runtime.

The source database has not been changed or cut over. Prepare the private PostgreSQL 17 target, restore/verify application data, apply the additive migration and run the dry-run/import there before using migrated accounts. Keep the old provider intact until acceptance.

Required private server configuration: DATABASE_URL, DIRECT_URL, BETTER_AUTH_SECRET, BOOKING_ACCESS_SECRET; canonical origin NEXT_PUBLIC_APP_URL; SMTP_URL and MAIL_FROM for verification/recovery. Use the placeholders in `.env.example`. No Supabase SDK/public key/administrative key is required by the application.

Customers sign in on `/login` and register on `/signup`. Drivers use `/driver-login` and `/driver-signup` for account activation and must be provisioned/approved by operations. Staff sign in on `/admin-login`; roles remain company-provisioned and there is no public admin signup. Older driver/admin login links redirect to their dedicated screen. `/api/auth/session` returns the application user/role projection. Private operations verify server-side sessions and application ownership/role rules.

Tabs in the same browser profile share one authenticated session. Visiting the public site retains the signed-in role: staff see Admin portal, drivers see Driver portal, and customers see My account and customer trip controls. Opening `/account` with an active staff/driver account redirects to that account's own portal; it never creates or converts a customer account. Opening another role's login/signup screen shows the existing account and requires signing out before switching accounts. For simultaneous testing with different accounts, use separate browser profiles (normal and incognito also work; multiple incognito windows share their incognito session).

The existing super admin is preserved by account import. For a separate explicit provisioning task, `node scripts/bootstrap-admin.mjs EMAIL` grants the role only to an already verified active identity. Do not bootstrap or seed to replace a missing migration.
