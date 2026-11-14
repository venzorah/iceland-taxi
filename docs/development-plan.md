You are working on my Iceland Taxi Booking application. Treat the following as the agreed development and future deployment plan.

CURRENT PRIORITY

Finish implementing and testing the application locally using the existing Supabase setup.

Migration to cPanel is deferred until the application is complete. Do not change database providers, replace authentication, remove Supabase dependencies, or reconfigure deployment now. Continue implementing the app’s features.

CURRENT STACK

- Next.js 15.1.11, React 19, TypeScript.
- Prisma and @prisma/client 6.19.0.
- Supabase PostgreSQL for application data.
- Supabase Auth for authentication.
- Cloudinary for media.
- Nodemailer for email.
- web-push for browser notifications.

Current scripts:
- build: prisma generate && next build
- start: next start
- dev: next dev

The project specifies Node.js >=20.

Next.js configuration:
- distDir: process.env.NEXT_OUTPUT_DIR || '.next'
- No static export configured.
- Server Actions request body limit: 2 MB.

This is a server-based Next.js application. Renaming the build output to dist does not make it a static site.

DATABASE AND AUTHENTICATION

Prisma uses:
- provider = "postgresql"
- url = env("DATABASE_URL")
- directUrl = env("DIRECT_URL")
- binaryTargets = ["native", "rhel-openssl-3.0.x"]

User records include:
- id: application user ID.
- authId: nullable unique UUID linking to Supabase Auth.
- email, profile information and application role.
- passwordHash: nullable; do not assume independent password authentication exists.

Supabase currently stores/verifies passwords and provides authentication sessions. Application tables store profiles, roles, bookings, drivers, vehicles, payments and other business data.

Relevant authentication files:
- src/lib/auth/session.ts
- src/app/login/LoginForm.tsx
- src/lib/supabase/server.ts
- src/lib/supabase/client.ts
- src/middleware.ts
- src/lib/auth/page-access.ts
- src/lib/auth/permissions.ts
- src/components/providers/SessionProvider.tsx

Inspect their actual contents before making claims about their behavior.

FUTURE HOSTING TARGET

My existing Truehost cPanel package is labelled newTruehost_Silver.

Confirmed through cPanel:
- Node.js application creation interface is available.
- It has fields for Node version, application mode, root, URL, startup file and environment variables.
- The displayed default Node version was 10.24.1, which is incompatible with this project.
- Available newer versions and account resource limits have not yet been confirmed.
- PostgreSQL database creation is available.
- Database created: cgttaxvh_taxi.
- Dedicated database user created: cgttaxvh_icelandtaxi.
- User-to-database access was granted.
- phpPgAdmin access works.
- PostgreSQL version shown: 13.23.
- phpPgAdmin shows a server-local Unix socket at /var/run/postgresql and port 5432.
- Prisma connectivity with the dedicated database user has not yet been verified.

Do not treat shared-server CPU/memory statistics as my account’s allocated resources.

REMOTE CONNECTIVITY STATUS

Connections from my Mac to 102.203.116.19:5432 timed out.
The short server name a2891 did not resolve locally.

This does not prove database credentials are wrong. Remote PostgreSQL access, the correct public database address, SSH access and SSH forwarding have not been confirmed.

We have decided not to spend more time on remote access or SSH tunnelling now. Continue using Supabase for local development.

DEVELOPMENT RULES UNTIL MIGRATION

1. Preserve working Supabase authentication and database access.
2. Keep credentials in server-side environment variables; never expose database passwords, Supabase secret/service-role keys or Cloudinary secrets to the browser.
3. Maintain Prisma schema and migration history consistently.
4. Preserve server-side authorization for customers, drivers and staff/admin roles.
5. Avoid introducing unnecessary provider-specific dependencies. If a requested feature benefits from one, explain its future migration implications.
6. Do not perform destructive database operations, reset databases or remove existing data as part of routine work.
7. Keep development and production configuration separate.
8. Do not introduce a custom authentication system merely to prepare for migration.
9. Record relevant deployment requirements as features are completed, without letting migration work interrupt current implementation.

FUTURE MIGRATION WORK — ONLY WHEN I REQUEST IT

First inspect the completed codebase and produce a concrete migration and deployment plan.

A. Audit dependencies
Identify every use of Supabase:
- PostgreSQL via Prisma.
- Browser or server Supabase database queries.
- Authentication, sessions, email verification and password resets.
- Realtime, storage, functions, triggers, RLS policies or extensions, if used.

B. Resolve authentication explicitly
Ordinary PostgreSQL on cPanel is not Supabase.
Moving application tables does not migrate Supabase Auth automatically.

Present the actual options:
- Move application data to cPanel while temporarily retaining Supabase Auth.
- Replace Supabase Auth with a maintained authentication solution and migrate accounts appropriately.

Do not silently choose or implement an authentication replacement.
Do not assume passwordHash contains usable passwords.
Preserve application user IDs, role assignments and relationships.
Do not link identities solely by matching unverified email addresses.

C. Verify hosting compatibility
Confirm:
- A currently supported Node.js version compatible with the final dependencies.
- Hosting application manager/Passenger startup requirements.
- RAM, CPU, process, disk and build limits.
- SSH/Terminal availability where needed.
- PostgreSQL version support and upgrade availability; assess the displayed PostgreSQL 13.23 before production.
- Actual database host, port, SSL and permissions.
- Outbound email/API access.
- Cron or scheduler support for reminders and background work.
- Backup and restore capabilities.

Do not assume npm start can be entered into the startup-file field.
Choose and verify a compatible deployment method.
If using standalone output or a custom entry file, explain the trade-offs and package all required assets.
Ensure Prisma’s generated runtime matches the actual hosting OS/OpenSSL environment.

D. Prepare and rehearse migration
- Back up the source database.
- Review PostgreSQL version differences, extensions and generated SQL.
- Apply the application schema using an appropriate production migration workflow.
- Review existing migration history for Supabase-specific assumptions.
- Transfer required data while preserving IDs, relationships, timestamps and relevant constraints.
- Handle Supabase-managed schemas separately.
- Check row counts and important relationships.
- Do not use migrate dev or database reset against production.
- Do not assume changing DATABASE_URL transfers data.

E. Deploy a test environment
- Deploy to a test subdomain before switching the live domain.
- Configure DATABASE_URL and DIRECT_URL according to the final Prisma setup.
- Configure all other required environment variables.
- Ensure NEXT_OUTPUT_DIR is consistent between build and runtime if used.
- Configure HTTPS, application URLs, authentication redirects, email links and payment callbacks.
- Inspect PWA/service-worker caching to avoid stale or private account data being cached incorrectly.
- Configure scheduled jobs and prevent duplicate reminders/notifications.

F. Verify online behavior
Test:
- Registration, login, logout, sessions and password resets.
- Customer, driver and each admin/staff role.
- Booking creation, pricing, availability, assignment and cancellation.
- Payment verification, webhook signatures and idempotency.
- Email, reminders and push notifications.
- Cloudinary uploads and image display.
- Permissions and prevention of cross-user data access.
- Mobile behavior, error handling and performance.

G. Launch safely
Prepare a final data-sync/cutover procedure, rollback plan and backup schedule.
Keep Supabase intact until the replacement has been verified and I authorize retirement of the old services.

WHAT TO DO NOW

Acknowledge this plan briefly, inspect the current project state, and continue the feature or bug-fix task I give you. Treat cPanel migration as deferred work, not the current task.