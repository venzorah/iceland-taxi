# Current VPS handoff

Application source is prepared for one Next.js frontend/backend process behind Nginx and systemd, without Docker. This document reports local preparation; no VPS deployment, database reset or real payment was performed.

## Reported server state

Ubuntu 24.04 x86-64, 8 GB RAM, 4 vCPU; Node 22.23.5/npm 10.9.9; working Nginx; PostgreSQL 17.12 listening only locally; database `iceland_taxi`, role `iceland_taxi`; UFW permits 22/80/443 and journal limits are set. PostgreSQL 17.12 is the same major as the inspected 17.11 source. Server configuration/permissions have not been independently inspected.

## Supabase replacement status

Runtime replacement is implemented: Better Auth 1.7.25 + Prisma handle sign-in/signup/verification/recovery/email/password changes and database sessions; Supabase SDK packages and application/operational API calls were removed. Cloudinary and Teya remain. Source-only inspection/import scripts deliberately read the old Supabase PostgreSQL auth schema during transfer.

Operational cutover is **not complete**. The real Supabase application data and identity/password records have not been moved, and the developer's private .env was not repointed. Existing source accounts cannot appear in an empty VPS database merely by building the app. Preserve the source until restore/import acceptance.

## Blockers before deployment

1. **Database roles do not yet match the prepared security model.** Templates and target permissions use `iceland_owner` for restore/migrations/import and a separate unprivileged `iceland_app` for runtime. The importer explicitly refuses a current role other than `iceland_owner`; target-permissions.sql also requires it. Your reported role is `iceland_taxi`. Do not run the existing permission/import commands unchanged with that role or bypass the guards. Recommended next configuration: retain the existing database and create/verify the two dedicated roles and ownership/grants. Alternatively, review/adapt the role model deliberately. No roles, ownership or templates were silently renamed in this handoff. Database roles are separate from the systemd OS user `iceland-taxi`.
2. Rehearse real source public-schema data/history restore plus separate auth import on a private clone, verify IDs/timestamps/row counts/relationships and existing-account login. Confirm the new database is actually empty before restoring; if it has any data, stop and plan a merge rather than overwriting it.
3. Configure private target DATABASE_URL/DIRECT_URL, a stable random BETTER_AUTH_SECRET, the existing BOOKING_ACCESS_SECRET, SMTP_URL/MAIL_FROM and the existing Cloudinary/Teya/Web Push settings. SMTP deliverability is required for verification and reset exceptions; do not disclose credentials in chat.
4. Verify the OS service user, release-directory permissions, systemd unit, Nginx TLS/certificate/DNS, backups/off-site restore and cron replacement on the VPS. Existing journal limits need not be replaced if they already meet the intended bounds. Review in-flight Teya events before a later cutover; do not start a live payment for preparation.

The password strategy is already decided: supported bcrypt hashes are preserved, exceptions use private reset emails, IDs/roles/relationships remain, and everyone signs in again. No new password strategy decision is required.

## Production build and start commands

Run from a NEW Linux release directory, never the live `current` directory. Supply only reviewed public build values, e.g. NEXT_PUBLIC_APP_URL=https://icelandtaxibooking.is, through the protected build environment. The build needs no database or auth/payment secrets.

The exact build script executes:

```sh
npm ci --include=dev
NODE_ENV=production NODE_OPTIONS=--max-old-space-size=2048 VPS_BUILD_CPUS=1 npm run build
```

`npm run build` runs `prisma generate && next build`. Do not upload macOS node_modules or reuse an old cPanel build.

For the actual VPS build, use the resource-limited `systemd-run` invocation in docs/vps-deployment.md, running `scripts/vps/build-release.sh` with MemoryMax=3G and a single build worker. A Node heap limit by itself does not bound every build child process. This build preparation does not run migrations or activate a release.

With the protected runtime environment supplied, the manual start command is:

```sh
npm run start:vps
```

It runs `next start --hostname 127.0.0.1 --port 3000`. Production systemd uses the equivalent direct command:

```sh
/usr/bin/node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3000
```

The prepared unit loads `/etc/iceland-taxi/app.env` and uses `/srv/iceland-taxi/current`. Nginx terminates HTTPS and proxies to 127.0.0.1:3000. Start/enable/restart commands are deliberately not executed by packaging.

Migrations/import are separate from building. After the approved restore, with target owner credentials privately loaded, the production-safe Prisma command is `npx prisma migrate deploy`. Do not use migrate dev, db push, reset or seed on production. Verify the restored six source migrations before applying the new auth migration.

## Upload and documents

Generate the current source-only archive with `python3 scripts/package-vps.py`:

- `deployment-artifacts/iceland-taxi-vps-source.zip`
- `deployment-artifacts/iceland-taxi-vps-source.zip.sha256`

The archive includes the current source, lockfile, seven migrations, VPS configuration, operator tools and guides, plus a file-checksum manifest. It excludes private .env files, node_modules, local .next/macOS builds, database exports, Git data and the old cPanel entry point. It must be built on Linux after upload; it is not an already installed production runtime. The old cPanel ZIPs are obsolete for this deployment.

Guides: docs/vps-deployment.md, docs/postgresql-migration.md, docs/auth-transition.md, docs/vps-validation.md. Production environment template: deploy/vps/environment.example. Public-only build template: deploy/vps/build.environment.example. General local template: .env.example. Template database-role placeholders still reflect the unresolved two-role model above.

## Existing data must be migrated

The agreed path preserves data. Start with a NEW empty rehearsal destination so it can receive the existing public application schema/data and original Prisma history. Handle identities/bcrypt hashes separately through the reviewed read-only-source importer. An empty destination is a prerequisite for restore, not a decision to discard source data or recreate users. No application seed is part of deployment.

Prior read-only source inspection found two confirmed linked accounts, 29 public tables and six applied migrations. Rerun source inspection before the real rehearsal; do not assume counts are unchanged. Keep Supabase intact until final validation and rollback acceptance.
