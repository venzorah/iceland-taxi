# Contabo VPS preparation and release procedure

See [current VPS handoff](vps-handoff.md) for the installed server versions, the existing `iceland_taxi` database-role mismatch, upload archive and current migration blockers.

Target: Ubuntu 24.04 x86-64, 8 GB RAM, 4 vCPU, about 96 GB disk. One Next.js app, private PostgreSQL, Nginx TLS proxy, systemd; no Docker or separate API. **Templates are prepared only. The [password-preserving authentication replacement](auth-transition.md) is implemented locally; actual source-data restore/import and VPS acceptance remain pending. Do not cut over yet.**

## Server provisioning (future operator steps, not executed)

1. Keep UFW 22/80/443 only; preserve the active SSH session when testing firewall changes. Install supported **Node.js 22 LTS** through a signed package repository (system binary `/usr/bin/node`, not a per-user nvm path), Nginx, certbot, git, build-essential, openssl, logrotate and PostgreSQL client/server tools. Verify downloaded repository signing instructions from the vendor at provisioning time.
2. Source is **PostgreSQL 17.11**. Install PostgreSQL **17**, current patch, from the official [PostgreSQL Ubuntu repository](https://www.postgresql.org/download/linux/ubuntu/), not the default Ubuntu 16 package. Match UTF8 and source locale; run `locale -a`, generate `en_US.UTF-8` if necessary. Verify versions with `node --version`, `nginx -v`, `psql --version`, `pg_dump --version` and `pg_lsclusters`. Avoid multiple unintended clusters listening on different ports.
3. Create a non-login service OS user `iceland-taxi`, and a separate unprivileged deployment/build OS user `deploy`. Create `/srv/iceland-taxi/releases`, `/etc/iceland-taxi`, `/var/backups/iceland-taxi`, `/usr/local/lib/iceland-taxi` and `/var/www/letsencrypt`. Code must be readable by the app and unwritable by it; only `.next/cache` needs runtime writes. `/etc/iceland-taxi/app.env` should be root-owned, group `iceland-taxi`, mode 0640. Backups: postgres-owned directory 0700. Build environment: root:deploy 0640, only public values. No secrets in git or shell history.
4. PostgreSQL roles: create `iceland_owner LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS` and `iceland_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS` using local postgres administration. Set separate passwords interactively with `\password iceland_owner` and `\password iceland_app`; do not put literal passwords in commands. Create a new empty database owned by `iceland_owner`. Revoke database privileges from PUBLIC, then grant CONNECT only to required roles. Do not grant membership in `iceland_owner` to the runtime role.
5. Merge `deploy/vps/postgresql.conf` and `pg_hba.conf.example` into the **selected 17 cluster** configuration. Listen only on 127.0.0.1, no public 5432, SCRAM authentication. Restart the selected cluster, check `ss -lntp` and `SHOW listen_addresses`. This is not an instruction to modify Supabase.
6. Use [the rehearsal instructions](postgresql-migration.md) to restore the target clone. Run target-only `target-permissions.sql` as the owner AFTER restore and each new migration: RLS is retained, explicit policies permit the server role, and runtime cannot edit migration history. Verify runtime DML using a disposable rehearsal fixture transaction followed by ROLLBACK, and verify CREATE TABLE and migration-history writes fail. Application roles/ownership checks still gate every private endpoint.

## Environment and start configuration

`deploy/vps/environment.example` is placeholders only; copy manually to the protected server environment and fill privately. Keep the existing booking signing key, Cloudinary and Teya production settings. Runtime now uses only `DATABASE_URL`; remove obsolete `DATABASE_TRANSACTION_URL` settings. New runtime starts with 5 database connections; migrations use a separate owner connection with limit 1. Local loopback PostgreSQL explicitly uses `sslmode=disable`; current Prisma defaults otherwise require TLS. Never disable TLS on a remote database.
For public redirects, set `NEXT_PUBLIC_APP_URL=https://icelandtaxibooking.is` in both the protected runtime `/etc/iceland-taxi/app.env` and the public build environment. Protected-page login and email-confirmation redirects resolve this value at runtime, rather than using Next.js’s internal loopback address. Restart the systemd service after changing its environment. The Nginx upstream and private database should continue using loopback addresses.


Keep owner credentials in a separate protected **migration.env**, not app.env or build.env. Both DATABASE_URL and DIRECT_URL there must point to the reviewed target owner connection. No migration secrets in the service environment. Set a stable private BETTER_AUTH_SECRET with at least 32 random bytes. No Supabase URL, public key or administrative secret is required by the new runtime. Complete the target-only migration/import before sign-in testing.

`npm run start:vps` and `deploy/vps/iceland-taxi.service` bind **127.0.0.1:3000**. The unit runs Next's normal production server, not the cPanel Passenger entry point. Install the unit under `/etc/systemd/system/`, then daemon-reload. Enable/start only after a release and environment exist and deployment is authorized. The unit automatically restarts failures, stops restart loops, starts at boot when enabled, uses a 1 GiB Node heap and a 2 GiB cgroup ceiling. Tune against observed workload rather than increasing blindly.

`/api/health` is uncached liveness independent of Prisma. `/api/health/ready` is uncached database reachability, returns 503 without database/error detail when unavailable. Neither proves SMTP, permissions, schema correctness, authentication or Teya readiness. Use loopback curl with a timeout longer than the database's connection/pool timeouts when checking readiness, e.g. 35 seconds.

## Nginx and TLS

First use a temporary port-80 server for `icelandtaxibooking.is` serving `/var/www/letsencrypt` at `/.well-known/acme-challenge/`. Obtain a certificate with certbot webroot after DNS points to the server (or use DNS validation before DNS cutover). Do not enable the TLS template before certificate files exist. Remove Ubuntu's default site if it conflicts with the provided default server.

Install `deploy/vps/nginx.conf` into `/etc/nginx/conf.d/`, run `nginx -t`, then reload. It forwards the real client address while overwriting spoofed forwarding headers, preserves Host/HTTPS, allows 5 MB image uploads with multipart overhead (8 MB proxy limit), disables response buffering for Next streaming and proxy caching for private data, and preserves raw webhook bodies/signatures. There is no WebSocket dependency; messaging polls the API. Do not configure a blanket GET cache or rewrite API paths. Request timeouts accommodate the existing 30-second Cloudinary timeout.

Only the named canonical domain is enabled. Decide whether `www` is needed; if so obtain a certificate covering it and configure an explicit canonical redirect. Keep 3000/5432 closed externally. `RATE_LIMIT_PROXY_HEADER=x-real-ip` is safe only while Nginx is the sole public ingress and Node remains on loopback. Verify secure cookies, login, Server Actions and origin checks over HTTPS. Test renewal with `certbot renew --dry-run` and confirm the installed renewal timer.

## Builds that protect the live service

Prefer a separate **Linux x86-64 CI/build machine** with Node 22, the lockfile and Ubuntu-compatible OpenSSL/Prisma engines. Never upload macOS node_modules or native Prisma engines. Build artifacts must come from reviewed source and the exact lockfile; install/generate Linux dependencies for the deployment environment. Public NEXT_PUBLIC variables are embedded during build, so rebuild after changing public configuration. Supabase public build identifiers are no longer used.

If building on this 8 GB VPS, use a fresh release directory and a low-priority cgroup with hard memory limits; never `npm run build` inside `current`. One build at a time, not alongside backup/restore. Check `free -h`, `df -h`, memory pressure and database activity first. Keep at least 10 GiB free. Build example (operator substitutes a NEW release directory already containing reviewed source):

```sh
sudo systemd-run --unit=iceland-build-RELEASE --wait --collect \
  --property=User=deploy --property=Group=deploy \
  --property=WorkingDirectory=/srv/iceland-taxi/releases/RELEASE \
  --property=EnvironmentFile=/etc/iceland-taxi/build.env \
  --property=MemoryHigh=2500M --property=MemoryMax=3G \
  --property=MemorySwapMax=0 --property=OOMPolicy=stop \
  --property=CPUQuota=150% --property=CPUWeight=10 --property=IOWeight=10 \
  --property=TasksMax=256 \
  /usr/bin/bash scripts/vps/build-release.sh
```

The script refuses the live release and local .env files, uses a 2 GiB heap and one Next build worker, and stops on failure. The cgroup covers npm/Prisma/Next child processes. It gets **only** public build identifiers; no production database, SMTP or payment credentials. A build killed by its limit leaves the live release untouched: build off-host instead of lifting limits until the live app is starved. Unit changes do not alter the running service until a later authorized deployment.

Before activation on Ubuntu, validate installed templates explicitly:

```sh
sudo systemd-analyze verify /etc/systemd/system/iceland-taxi.service \
  /etc/systemd/system/iceland-taxi-backup.service \
  /etc/systemd/system/iceland-taxi-backup.timer \
  /etc/systemd/system/iceland-taxi-reminders.service \
  /etc/systemd/system/iceland-taxi-reminders.timer
sudo nginx -t
sudo logrotate --debug /etc/logrotate.conf
```

Do not enable reminders until acceptance. Validate installed paths/users first; verification on this Mac cannot substitute for those Linux checks.

## Activation and rollback (future authorized deployment)

1. Rehearse the complete release and auth import on a private clone with outbound integrations disabled. Complete the verification checklist. Keep source Supabase intact.
2. Back up the target and verify a restore before schema changes. Review migration SQL. With owner credentials loaded privately, use `npx prisma migrate status` then **`npx prisma migrate deploy`**, followed by target permissions. No `migrate dev`, reset, db push, seed or automatic `migrate resolve` on production. Restore preserves migration history; do not baseline over an inconsistent history.
3. Install the reviewed release as root:iceland-taxi, directories 0750/files group-readable and not app-writable. Precreate `.next/cache`, owned by iceland-taxi. Preserve executable modes where needed. Copy/symlink protected runtime environment as appropriate only AFTER build if a smoke runner needs it; systemd uses EnvironmentFile directly. Do not mix a cPanel build receipt or NEXT_OUTPUT_DIR into this standard `.next` release.
4. Stop new writes/payments for final database cutover as described in the migration runbook. Record release ID, lockfile checksum, schema migration version, backup checksum and environment version privately. Test candidate on another loopback port before activation; do not run a second reminder scheduler.
5. Atomically update `/srv/iceland-taxi/current` using a temporary symlink and `mv -Tf`, restart `iceland-taxi`, and verify liveness/readiness and real role flows. This has a brief restart interruption; no zero-downtime claim. Reload Nginx only after `nginx -t`.
6. If checks fail before new writes, point `current` to the previous compatible release and restart. A code rollback is safe only with compatible schema. For incompatible schema/auth rollback, stop traffic and restore the verified pre-change dump to a **new** database, validate, then repoint privately. Never overwrite a live database blindly.
7. After new bookings/messages or Teya events reach the target, do **not** simply flip back to stale Supabase. Pause writes, preserve both databases, reconcile new business/payment records and events, and choose a reviewed forward fix or data-aware rollback. Auth changes/passwords during cutover also need reconciliation. Keep old releases and Supabase until a defined acceptance/retention window expires.

## Logs, backups and scheduled jobs

- Application stdout/stderr goes to journald with per-service rate limiting. Install `journald.conf` as `/etc/systemd/journald.conf.d/iceland-taxi.conf`; it bounds the system journal to 256 MB, seven days, with free-space reserve. This affects all system services: review local retention needs first. Restrict journal access. Never add request body, authorization header or token logging.
- Rejected Teya checkout requests emit one `[teya.checkout.rejected]` JSON record with environment, HTTP status, recognized validation codes/schema field names and structured UUID/trace correlation IDs when available. To find these after an authorized checkout attempt: `sudo journalctl -u iceland-taxi --since "15 minutes ago" --no-pager | grep -F '[teya.checkout.rejected]'`. Provider descriptions/messages, request/response bodies, customer/booking values, credentials and tokens are excluded. Unknown codes/field paths and opaque correlation formats are omitted; an empty validation list does not mean the payload is valid. The public checkout response stays generic. No extra request is made to diagnose a rejection.
- Checkout payload follows the [Teya Hosted Checkout API reference](https://developer.teya.com/apis/online-payments/apis): optional phone prefill is normalized to E.164 syntax or omitted if unusable (the booking contact stays unchanged), and the metadata description is limited to 500 Unicode characters. Amounts remain in minor units, and idempotency/return URLs and webhook validation retain their existing behavior. These corrections address documented validation constraints; the actual cause of an individual HTTP 400 still needs its safe diagnostic or Teya support correlation.
- Nginx access logs omit query strings and bodies. Check the existing Ubuntu nginx logrotate rule: if it covers `/var/log/nginx/*.log`, add `maxsize 20M`/`rotate 7` there instead of installing a duplicate rule. Otherwise use the supplied rule. Install the hourly logrotate service/timer so size thresholds are checked hourly. Retention/size thresholds are **rotation bounds, not filesystem quotas**; a flood can grow files within an interval. Monitor disk space and alert at 20% free; use volume quotas if hard per-file budgets are needed. Protect error logs because proxy errors can contain request URLs. PostgreSQL's seven-day ring also needs disk monitoring.
- Install the root-owned backup script at `/usr/local/lib/iceland-taxi/backup.sh`, mode 0755, with postgres-owned 0700 backup directory. Install/enable the backup service/timer after the local database exists. It makes custom-format whole-database dumps, validates archive readability, writes SHA256, retains 14 days and refuses below 5 GiB free. It uses peer auth, not secrets in arguments. Monitor timer failures and backup age. Daily backups imply up to 24-hour data loss; choose more frequent backups/WAL archiving if business requirements need less.
- A local backup is not disaster recovery. Copy encrypted backups off the VPS daily to a separately controlled store, with tested keys and retention; configure failure alerts. No backup destination or off-site credentials have been assumed. Keep configuration/secrets in a separate encrypted recovery bundle; pg_dump does not include OS units, DB roles, Cloudinary assets or SMTP credentials. Test restore monthly and after schema/auth changes.
- Reminder timer/service replaces the old Vercel/cPanel cron. It calls the actual `/api/cron/reminders` endpoint locally with a private Bearer header. Enable **only after production acceptance and SMTP checks**, disable the previous scheduler to avoid duplicates. Do not enable on rehearsal clones; disable WhatsApp, Web Push and email delivery there too. Certbot, backup and reminder timers must be checked after reboot.

## Official price list on VPS start (November 2026)

The release build does not receive database credentials. Ordinary starts leave the catalogue unchanged. Keep `PUBLISH_OFFICIAL_CATALOGUE_ON_START=false` (the default). Only an explicitly opted-in production start publishes the official list once: it replaces prices, hides non-official services/routes/add-ons, zeros vehicle surcharges, fills missing content and sets EUR to 150 ISK. It preserves booking/payment snapshots and matched IDs. Review the Super Admin **Restore reference catalogue** preview and take a database backup before approving any replacement. Remove the opt-in immediately afterwards. The version marker is committed in the same transaction as the replacement. The manual `scripts/replace-official-catalogue.ts` is also a data-writing command, never a validation/build step. No schema migration is introduced by this update.

The restore adds missing airport-transfer, tour and private-driver services, four airport routes, local photo URLs and editable website copy. It corrects the Golden Circle category to TOUR and reuses matching record IDs. Existing custom routes, authored content, non-null prices, publication choices, accounts, bookings and payments are preserved. Exchange rates are appended; previous booking/payment snapshots are unchanged. Matching ambiguities stop the entire transaction. Content is stored in Service, Route, SiteBlock and ExchangeRate; it is not a browser-local fallback.

An operator can instead preview from the reviewed source directory (with its locked dependencies, including tsx):

```sh
node --env-file=/etc/iceland-taxi/app.env --import tsx scripts/vps/restore-catalogue.ts --target-database iceland_taxi
```

Inspect the plan and its fingerprint. Apply that exact reviewed preview with:

```sh
node --env-file=/etc/iceland-taxi/app.env --import tsx scripts/vps/restore-catalogue.ts --target-database iceland_taxi --apply --fingerprint REPLACE_WITH_PREVIEW_FINGERPRINT --restore-eur-rate
```

Do not run db:seed. The CLI refuses a different database name; the operator must also verify the private connection points to the intended VPS. No live restore has been performed from the developer workstation. Verify the public airport/tour/driver pages and a read-only booking price preview afterward; no checkout is needed. A repeated restore should propose no further changes unless content has changed.

For the approved handover list, follow [the catalogue comparison and controlled publication/rollback procedure](catalogue-handover.md). Publication is a separate operator action; keep both opt-in flags false throughout.
