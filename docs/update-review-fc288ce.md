# Local review of 6000490 → fc288ce

Reviewed on 24 November 2026. No application server, real database, seed, migration, catalogue replacement, outbound email or payment was run. No production environment file was read or copied. The initial review left changes local; the follow-up handover request authorizes committing and pushing the reviewed fixes.

## Findings and corrections

- As received, `src/instrumentation.ts` invoked catalogue publishing in Node runtimes whenever a parseable database URL existed. That included development starts. The production-build phase check alone was not sufficient protection against inherited runtime credentials. The hook has no direct SMTP, Cloudinary or Teya call, but can connect to the configured PostgreSQL service and write data.
- Publishing replaces official service/route prices and publication states, hides non-official listings/add-ons, installs the official add-ons, zeros vehicle upgrade prices, fills missing content and optionally restores EUR to 150 ISK. Booking/payment snapshots are not rewritten. Matched catalogue IDs stay; unmatched rows are hidden, not deleted.
- Ordinary startup now does nothing. Publishing requires **both** `NODE_ENV=production` and `PUBLISH_OFFICIAL_CATALOGUE_ON_START=true`, and is disabled during production builds. The default/example is false. The manual `scripts/replace-official-catalogue.ts` still explicitly writes data when executed; it was inspected, never executed.
- The preview previously omitted add-on and vehicle-surcharge writes, so approval could become stale without detection. These writes now appear in the plan/count and its fingerprint. Fixture tests verify changes to either invalidate the approved preview without writing.
- The publication marker previously committed after the replacement transaction. It now commits inside that transaction, so marker failure rolls back catalogue/rate changes too.
- `prisma/seed.ts` deletes application records and creates demonstration data. It is not a migration tool. It now also requires explicit `ALLOW_DESTRUCTIVE_SEED=true` and rejects `NODE_ENV=production`. Never enable it against retained data.
- Official 1–4/5–8-person fares previously only displayed their bands. Passenger limits are now checked by search and server-side quoting/booking so selecting a larger-capacity vehicle cannot bypass a smaller fare's passenger limit.
- Staff UI now derives its permissions table from the shared server policy. Super Admin already has all modules in that policy; other role boundaries are retained and tested. The new company form now validates the email and required display name. Add-on deletion returns a useful 404 if another administrator already deleted the record, retaining the permission gate.
- `scripts/vps/build-release.sh` previously asserted absence of `.env` files but still inherited shell credentials. It now runs installation/build in an empty environment with only build settings, PATH/HOME/temp directory and the explicitly allowed public app origin. A mocked-npm fixture confirms database, SMTP and Teya credentials and startup opt-in are stripped. Its release-path/live-directory checks remain intact.

## Catalogue and deployment decisions

The update defines 11 services, 28 route/fare variants and two zero-priced add-ons. Euro source amounts are multiplied by 150 into stored ISK prices; changing the EUR rate later changes their displayed euro amounts. Example airport fares are ISK 24,000/30,750 (€160/€205); Golden Circle ISK 102,000/133,500 (€680/€890). Fixture checks establish internal consistency, not independent business approval of the supplied list.

No Prisma schema, migration or lockfile changes are introduced by this update or review. A clean install requires `npm run db:generate` before standalone TypeScript/tests; `npm run build` already generates Prisma's client. Generation does not connect to a database.

Keep the new startup flag false on deployment. Take a database backup and review the full Super Admin restore preview before separately approving any catalogue replacement, including hidden records, add-ons, vehicle surcharges and FX. An ordinary pull/build/restart should not install this price list. If opting into one-time startup publishing instead, remove that opt-in immediately afterwards. Runtime PostgreSQL/SMTP/Teya configuration remains separate from build configuration. Use the existing fresh Linux release, Node 22, Nginx/systemd and memory-bounded build procedure; the local macOS validation output is not a deployable Linux build.

## Validation scope

Validation uses an ignored source copy under `deployment-artifacts/review-fc288ce`, with no private `.env` files. Dependencies were installed using `npm ci --include=dev`; Prisma was generated with a writable isolated cache. Tests use memory/VM fixtures and an unreachable loopback database URL. The production build has no database URL or external-service credentials, an explicit fixture origin/signing secret, one worker and a 2 GB heap. Only the validation copy pins output tracing to its own directory to avoid parent-workspace lockfile inference.

The passenger bands currently derive from published `paxLabel` text. Keep that label accurate when editing fares; typed capacity columns would require a separate schema decision. Real PostgreSQL cutover, SMTP delivery, Cloudinary uploads, provider checkout and live startup behaviour were deliberately not exercised.

## Completed results

- Locked clean install and Prisma 6.19.0 client generation: passed.
- TypeScript: passed; affected-file ESLint: passed; `git diff --check`: passed.
- 161 tests across 10 suites: passed, including OTP/recovery, role gates, catalogue prices/rollback/staleness, booking/search and Teya verification/idempotency safeguards.
- Production build: passed, including static-page generation. No app server was started.
- Build shell syntax and mocked environment-isolation check: passed.
- Local tools: macOS, Node 25.8.1, npm 11.11.0. Rebuild/acceptance on the target Ubuntu/Node 22 platform remains necessary. Installation warns that ESLint 9 is outside its support window; no dependency versions were changed as part of this review.

No push, merge, deployment or real-data change was performed. Business approval of the new price list and target-platform/runtime acceptance remain outstanding.

The explicit operator command now requires `--preview`, `--verify` or `--apply <reviewed-fingerprint>`. With no arguments it fails closed. See [the approved comparison and deployment/rollback procedure](catalogue-handover.md). Both opt-in flags remain false throughout that procedure.
