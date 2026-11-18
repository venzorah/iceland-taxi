# PostgreSQL rehearsal, cutover, backup restore and verification

This is a future operator runbook. No export/restore, authentication import or VPS deployment has been performed. Source metadata inspection and read-only content fingerprinting are safe; all mutation steps below are for **new, empty target databases** after review. Keep Supabase intact until acceptance.

## 1. Preflight and protected connection setup

Read [the provider audit](supabase-exit-audit.md). Rerun `node scripts/vps/inspect-source.mjs` privately; stop for failed/pending migrations, checksum differences, new public objects, unsupported identity types or missing permissions. Current source: PostgreSQL 17.11, 29 public tables, six completed migrations, no public routines/triggers/policies, no Storage buckets/objects. The application does not depend on the source's pgcrypto, uuid-ossp, pg_stat_statements or Vault objects; verify this is still true at export time.

Use PostgreSQL **17** client tools and a supported PostgreSQL **17** target. Upgrade minor patches normally. Do not dump a 17 source with pg_dump 16 or restore it into a 16 server. Match UTF8/locale; test text sort/unique constraints if collations differ. Ensure disk accommodates source dump, restored database, indexes, WAL, local backups and at least two releases, leaving 10 GiB free.

For `psql`/`pg_dump`, create a private `~/.pg_service.conf` (0600) with `iceland_source` pointing to the verified direct/session source connection (not the transaction pooler), and `iceland_rehearsal_owner`/`iceland_target_owner` pointing to the selected local target database as `iceland_owner`. Use a private `~/.pgpass` (0600) or PGPASSFILE. Set source sslmode=require and target sslmode=disable only for loopback. Do not put passwords in shell history, process arguments, reports or git. Use a least-privilege read/export account where possible; it must see every required row despite RLS. Do not use `--enable-row-security` to hide missing rows.

For Node manifest inspection, use private MIGRATION_SOURCE_URL/MIGRATION_DATABASE_URL environment variables; they are not the runtime DATABASE_TRANSACTION_URL. Never change the running app's .env to select a rehearsal target. `database-manifest.mjs` refuses to overwrite an existing manifest and sets read-only, repeatable-read and row_security=off, failing rather than silently omitting protected rows.

## 2. Baseline and consistent rehearsal dump

Create a private work directory outside the checkout and chmod 0700; `umask 077`. Generate source inventory and a source manifest with privately loaded source MIGRATION_DATABASE_URL:

```sh
node scripts/vps/inspect-source.mjs > /PRIVATE/source-inventory.json
node scripts/vps/database-manifest.mjs /PRIVATE/source-manifest.json
pg_dump --dbname='service=iceland_source' --format=custom --schema=public \
  --no-owner --no-acl --file=/PRIVATE/application.dump
pg_restore --list /PRIVATE/application.dump > /PRIVATE/application.contents
sha256sum /PRIVATE/application.dump > /PRIVATE/application.dump.sha256
```

The dump itself uses a consistent snapshot. A separately generated manifest reflects a different snapshot if writes occur between commands: pause application writes for this baseline comparison, or explicitly coordinate an exported PostgreSQL snapshot across pg_dump and verification tooling. Do not interpret mismatched live manifests as corruption without accounting for writes. For final cutover, a complete write freeze is required.

Review the archive table of contents and a schema-only rendering (`pg_restore --schema-only --file=/PRIVATE/application-schema.sql /PRIVATE/application.dump`) for dependencies on auth/extensions/storage/realtime/vault, foreign servers, user-defined types and grants before restoring. A public-schema-only dump does not automatically include external dependencies. Review schema SQL as sensitive operational data, do not commit it. Application migration history **must be included**, as must every public table, enum, constraint, index and sequence. Do not filter business tables just because they are empty today.

Supabase-managed schemas (`auth`, `storage`, `realtime`, `supabase_*`, `vault`, extension schemas and their internal migrations) are not the target application schema. Do not restore Supabase service roles, grants, auth SQL functions, Vault or auth sessions into plain PostgreSQL. Handle **minimal auth identity export separately** only after the password strategy is decided: UUID, email, confirmed/disabled state, provider IDs, original timestamps and bcrypt hash if chosen. Store it encrypted with restricted access, never in a public dump, browser bundle or log. Supabase's internal auth schema_migrations is not Prisma history.

## 3. Restore into a NEW isolated rehearsal database

Use a separate name `iceland_taxi_rehearsal`, owned by iceland_owner, created from template0 with the selected encoding/locale. It must be empty. Do not use `--clean`, `--create`, dropdb or reset against an existing database. Ensure the psql service definition names the rehearsal database, then:

```sh
psql 'service=iceland_rehearsal_owner' -X -v ON_ERROR_STOP=1 \
  -c 'SELECT current_database(),current_user,version();'
pg_restore --dbname='service=iceland_rehearsal_owner' --no-owner --no-acl \
  --single-transaction --exit-on-error /PRIVATE/application.dump
```

Objects restored by this connection belong to iceland_owner. Validate the original restored tables **before** adding auth tables or target policies. Load MIGRATION_DATABASE_URL privately with the rehearsal owner URL:

```sh
node scripts/vps/database-manifest.mjs /PRIVATE/restored-manifest.json
node scripts/vps/compare-manifests.mjs /PRIVATE/source-manifest.json /PRIVATE/restored-manifest.json
```

The manifest streams canonical JSONB rows through a cursor, storing only per-table row counts and SHA256 content fingerprints; all columns including IDs, timestamps and payment snapshots are covered. It uses bytewise ordering and UTC. Compare on the same PostgreSQL major and canonical settings. It can use database-side sort space for large tables; monitor rehearsal temp disk. Inspection and manifest scripts have timeouts, so plan an explicitly reviewed increase for very large datasets.

The manifest is comparison evidence, not a backup. Changes caused by new auth migrations or reviewed normalization must be evaluated separately; do not discard an unexplained mismatch. Ensure FK constraints are present and validated, inspect orphan relationships, and check important business records listed below.

## 4. Prisma and authentication on the clone

Use a separate protected migration environment with target owner DATABASE_URL and DIRECT_URL and blank DATABASE_TRANSACTION_URL. Verify the destination without printing credentials. Use the same Prisma 6.19.0 CLI as the lockfile:

```sh
npx prisma migrate status
npx prisma migrate deploy
psql 'service=iceland_rehearsal_owner' -X -v ON_ERROR_STOP=1 \
  -f deploy/vps/target-permissions.sql
```

After restoring the six source migrations, the reviewed additive **20261118000000_independent_auth** migration should be the only pending migration. Do not run migrate dev, reset, db push, seed or resolve to make errors disappear. Preserve `_prisma_migrations` row IDs/checksums/timestamps. Future auth changes require new additive migrations reviewed and tested here; applied SQL files must never be edited.

Authentication replacement and the password-preserving importer are now implemented; follow [auth-transition.md](auth-transition.md) for the private dry-run/apply commands and refusal guards. Rehearsal must validate the restored business data before the new migration, then verify imported identities/mappings and target behavior. The importer preserves business rows and source UUIDs, keeps verified/disabled state and counts reset exceptions. It reads the source without writing and never imports old sessions. Synthetic local acceptance passed; the actual source import remains pending.

Run the clone behind private access; disable reminders/SMTP, WhatsApp and Web Push until explicitly testing against controlled sinks. Do not let a restored live Payment table make real Teya calls. Keep live Teya credentials out of the clone; use stubbed transport and freshly generated test signature keys. Avoid changing Cloudinary assets; test uploads with designated fixtures only in a separately authorized step.

## 5. Release acceptance checklist

- [ ] Source/target PostgreSQL versions, encoding, locale, extensions and archive dependencies reviewed. Supabase-managed schemas excluded intentionally.
- [ ] Every public table count and content fingerprint matches before auth changes. Six original Prisma migrations and local checksums preserved, no unfinished migrations.
- [ ] User.id/authId/email mappings checked privately; no duplicate case-folded emails, lost auth-only accounts or accidental privileged claims. Roles and staff active flags preserved.
- [ ] Booking.customerId/driverId/vehicleId, Driver.userId and StaffProfile.userId resolve; Payment.bookingId and Message.bookingId/authorId resolve; all FKs validated. IDs/timestamps unchanged.
- [ ] Booking refs, pickup times, status, currencies/amount snapshots, captured amounts, providerRef, environment tags and checkout leases match selected source business records. No checkout started and no money moved.
- [ ] Sign in existing customer, approved driver, active admin and each staff role; incorrect password and unconfirmed/disabled identity rejected. Public registration defaults to CUSTOMER, provisioned driver/staff linking requires verified identity. Driver activation does not grant itself driver permissions.
- [ ] Session cookie HttpOnly/Secure/SameSite, expiry/rotation, actual revocation/logout, private-route redirects, cross-tab state and CSRF/origin checks verified. Changing a cookie or user/booking ID never bypasses permissions. Clear stale Supabase cookies on provider cutover.
- [ ] Registration verification, reset, old-password confirmation, password update and secure email change tested through a controlled SMTP sink, then verified production sender. Reset token single use/expiry, unknown-email generic response and safe redirects tested.
- [ ] Customer booking creation/idempotency, cancellation/refund-request rules, trip ownership, driver assignments/status transitions and role-specific admin operations verified on clone fixtures only. No real payment or refund requests sent.
- [ ] Customer/driver/staff messages can be typed/sent/read, assignment and booking ownership enforced; polling and unread counts work. No message body leaks into push/WhatsApp notices.
- [ ] Booking emails/reminders use the controlled sink, notice/dedupe persistence checked. SMTP failure does not lose a saved booking. Previous cron disabled before enabling new timer.
- [ ] Teya raw-body RSA verification accepts valid generated-key signatures and rejects modified body/signature; duplicate/out-of-order event handling and environment separation tested with stubs. Real webhook path remains `/api/payments/webhook/teya`; preserve production public key/store settings for final host. No real checkout initiated.
- [ ] Cloudinary metadata/URLs and media library preserved; credentials server-only. Map/search/weather, browser push configuration and public content smoke checked.
- [ ] Build/type/lint/unit checks pass. Linux Prisma engine and runtime DML/RLS permissions verified. Runtime cannot change migration history or create/drop tables.
- [ ] Nginx TLS, streaming, upload limit, real-IP trust, secure cookies, certificate renewal, liveness/readiness and reboot startup verified. No public 3000 or 5432.
- [ ] Logs rotate, disk/backup failure monitoring configured, encrypted off-site copy restored successfully, rollback drill completed. Record evidence privately.

Current unit checks cover authorization, booking rules/pricing, message read-state, reminder scheduling, CSRF and Teya signatures/environment behavior. They do **not** prove the final imported-account authentication behavior, VPS role permissions or restored database behavior. Mark those pending until rehearsal actually runs.

## 6. Final cutover and rollback boundary

Only after the checklist passes and deployment is authorized: announce a maintenance window, block new bookings/account writes/messages/admin edits on the old application, disable old scheduled jobs and stop starting new checkouts. **Include pending Teya callbacks in the plan**: drain/reconcile in-flight checkouts, or arrange and verify provider retry/queue behavior before making the webhook unavailable. Do not assume webhook retries or DNS changes prevent writes. Keep one authoritative writer; old and new apps must not write divergent databases.

Take final public data dump, auth export if approved, inventory and comparison manifest under the same write freeze; restore to a new final target. Reconcile Teya sessions/events against the final booking/payment records before reopening payments. Retain the production webhook domain/path, key and store, and verify delivery once the approved host cutover occurs. DNS TTL/caches, browser builds and old auth links need explicit handling. Preserve Supabase until the agreed acceptance window and recovery copy are confirmed.

Before target writes, rollback may return to the still-intact source. After target writes/payments/password changes, keep both copies and reconcile all new records before switching back; DNS rollback alone would lose data. Prefer a compatible forward fix when possible.

## 7. Backup and restore drill

The supplied backup timer makes daily local full database dumps after cutover, not just public tables. Check `systemctl list-timers`, backup service status, backup age, archive list and SHA256; an archive listing is **not** a restore test. Configure encrypted off-site storage and monitoring separately. Do not delete the old provider to save space before recovery is proven.

For a drill, verify the checksum, create a **new empty** recovery database with owner/encoding/locale matching production, inspect its destination with psql, and restore as the owner with `pg_restore --single-transaction --exit-on-error --no-owner --no-acl`. Do not restore over production. Some restored RLS policies mention iceland_app, so recreate expected roles first; Supabase objects should be absent after cutover. Apply reviewed target grants/policies for the chosen recovery database (the template guard deliberately allows only the two named target databases; review an explicit clone-name amendment rather than bypassing it globally).

Compare manifests against the backup-time baseline where available, run migration status and business acceptance checks with outbound services disabled, and measure recovery duration. Record RPO/RTO. Restore the separate encrypted role/configuration/secret bundle when recovering a whole VPS; pg_dump does not restore PostgreSQL roles or server configuration. Rotate credentials only as a separate authorized operational decision.
