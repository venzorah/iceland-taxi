# Supabase authentication setup

The running app uses Supabase Auth for verified sessions and Prisma for application records and roles. Browser Data API access to application tables is blocked with RLS; no browser policies are configured. Prisma server connections must retain the required database permissions.

## Environment

Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env` and hosting settings. Keep `DATABASE_URL`, `DIRECT_URL`, and optional `SUPABASE_SECRET_KEY` server-only. Restart Next.js after changing environment variables.

In Supabase Authentication → URL Configuration, set the Site URL to your application URL and allow the following redirect URLs for each development/production origin:

- `http://localhost:3000/auth/confirm`
- `http://localhost:3000/auth/confirm?type=recovery`
- `http://localhost:3000/auth/confirm?portal=driver`
- `http://localhost:3000/auth/confirm?type=recovery&portal=driver`

Replace the origin with the production domain for production. Enable email authentication and email confirmation. Configure SMTP before relying on customer email delivery; default Supabase mail delivery has restrictions.

## Initial super admin

Run `node scripts/bootstrap-admin.mjs EMAIL` with the approved admin email. This provisions the application role. If the matching Supabase Auth user exists, its identity is linked. If a server-only `SUPABASE_SECRET_KEY` is supplied, the script creates the Auth identity with an unprinted random password. Use the login screen's Forgot password action to set a private password.

Alternatively, create the matching confirmed user manually in Supabase Authentication → Users using a private password. On its first verified login, it claims the pre-provisioned application role. No password from chat is saved or used by the script.

Customer registration never accepts a role. Staff and driver roles must be provisioned by the company. Until the admin account onboarding UI is completed, create their matching Auth identities in the Supabase dashboard as well.

## Verification

- `npm run typecheck`
- `node_modules/.bin/tsx --test src/lib/auth/permissions.test.ts`
- `npm run build`
- `node scripts/check-connection.mjs` checks Auth configuration and a rolled-back database write/read.

Demo login endpoints return 410. Existing identity helper names remain temporarily for compatibility, but they resolve only verified Supabase sessions. Admin API access checks application role permissions. Customer messaging ignores caller-supplied email identity. Driver APIs restrict requests to the verified driver's active profile.

## Remaining integration work

Existing portal screens still contain sample presentation data and business flows to finish. Authentication does not make those screens fully live. Complete portal data binding, account provisioning UX, payment authorization, live notifications, and Cloudinary uploads in subsequent milestones.

## Driver entry and activation

The public sign-in screen now has Customer and Driver options. The homepage also has a driver section with links for existing drivers and prospective drivers. Driver intent is encoded in `/login?portal=driver&next=/driver`; it is not an authorization claim. The server's verified role remains authoritative. An existing driver reaches `/driver` from generic sign-in too. A customer attempting the driver-specific flow stays on the sign-in page with an explanation.

Operations first adds an approved driver's email/profile. That driver can choose **Activate driver account**, register and confirm that same email, then use **Driver sign in**. Registration supplies name/email/password to Supabase; it does not accept or grant a driver role. Prospective drivers use the company's configured contact channels. There is no public self-approval or claim that a driver application has been submitted.

Driver intent is retained on confirmation/recovery callbacks. Configure matching redirect allow-list entries and email templates before hosted email testing; [Supabase redirect documentation](https://supabase.com/docs/guides/auth/redirect-urls). SMTP and email-link delivery remain pending verification as previously agreed.
