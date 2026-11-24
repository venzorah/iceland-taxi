# Approved catalogue handover and explicit publication

The incoming `fc288ce` catalogue is the client-approved handover version. Keep its values. The comparisons below use the earlier reference catalogue/seed at `6000490` and supplied screenshots, **not a read of production**. Actual production before-values must come from the protected preview. All prices are per car. EUR uses 150 ISK per EUR, rounded for display. No operation in this document has been executed against production.

## Earlier reference versus approved handover

| Item | Earlier reference | Approved handover, EUR / ISK |
|---|---|---|
| City transfer | Private taxi seed: ISK 8,900; no reference fare bands | 1–4: €25 / 3,750; 5–8: €35 / 5,250 |
| KEF → Reykjavík | ISK 22,900, displayed €153; no fare bands | 1–4: €160 / 24,000; 5–8: €205 / 30,750 |
| Reykjavík hotel → KEF | ISK 22,900 / €153 | No official reverse-direction fare; old route paused |
| KEF → Blue Lagoon | ISK 14,900 / €99 | No equivalent KEF fare; new Blue Lagoon fares depart Reykjavík |
| KEF → Selfoss | ISK 39,900 / €266 | Not on official list; old route paused |
| Reykjavík sightseeing | Not in earlier reference | 2 h; 1–4: €180 / 27,000; 5–8: €240 / 36,000 |
| Golden Circle | ISK 89,900 / €599, 7–8 h, up to 8 | 6 h; 1–4: €680 / 102,000; 5–8: €890 / 133,500 |
| South Coast | ISK 119,900 / €799, 10–11 h, up to 8 | 12 h; 1–4: €980 / 147,000; 5–8: €1,190 / 178,500 |
| Silver Circle | Absent | 6 h; 1–4: €610 / 91,500; 5–8: €810 / 121,500 |
| Snæfellsnes Peninsula | Absent | 12 h; 1–4: €1,090 / 163,500; 5–8: €1,320 / 198,000 |
| Krýsuvík/Reykjanes | Absent | 1–4: €470 / 70,500; 5–8: €620 / 93,000; duration unspecified |
| Reykjavík → Blue Lagoon, one way | Absent | 1–4: €160 / 24,000; 5–8: €205 / 30,750 |
| Reykjavík → Blue Lagoon, return | Absent | 4 h total; 1–4: €330 / 49,500; 5–8: €410 / 61,500 |
| Reykjavík → Hvammsvík, one way | Absent | 1–4: €195 / 29,250; 5–8: €260 / 39,000 |
| Reykjavík → Hvammsvík, return | Absent | 4 h total; 1–4: €390 / 58,500; 5–8: €520 / 78,000 |
| Reykjavík → Lava Tunnel, one way | Absent | 1–4: €160 / 24,000; 5–8: €200 / 30,000 |
| Reykjavík → Lava Tunnel, return | Absent | 2.5 h total; 1–4: €330 / 49,500; 5–8: €410 / 61,500 |
| Northern Lights | ISK 59,900 / €399, 3–4 h | No official fare; unmatched record hidden, not deleted |
| Private driver | ISK 24,900 / €166 | No official fixed fare; unmatched record hidden; custom enquiry remains |
| Passenger bands | Descriptive capacity, mostly “up to 8” | Separate 1–4 and 5–8 fares; search and booking reject parties exceeding the selected band |
| Add-ons | Seed defaults: meet/greet 0, child seat 2,500, return journey 0; live admin values unknown | Two active zero-priced entries: airport meet/greet and entrance booked separately; other add-ons paused. Entrance is not included |
| Vehicle surcharges | Seed defaults: standard 0; comfort 3,000; premium 6,000; SUV 8,000; minivan 12,000; minibus 25,000; live values unknown | Every existing vehicle upgrade amount set to 0 |
| Visibility | Earlier references plus admin-authored records | 11 official services, 28 route fares; non-official active services/routes paused; duplicate parent-service offers suppressed in public results |
| EUR/ISK | Earlier screenshot reference 150; a prior observed live rate was 1, but current production is unknown | Explicit publication restores 150 ISK/EUR; historical rates and booking/payment snapshots retained; current USD rate retained |

## Known ambiguities and differences

- Missing old reverse airport/Selfoss/KEF–Blue Lagoon/Northern Lights/private-driver fixed fares are deliberate differences in the approved incoming list. They have not been invented or added back.
- Durations for city/airport and several attraction one-way routes and Krýsuvík are unspecified in the approved data. Existing booking logic uses a 60-minute fallback when no duration is stored. Obtain operational acceptance of dispatch windows before reopening traffic; no new duration has been chosen here.
- Passenger bands are currently text labels rather than typed database capacity fields. Keep those labels intact. Smaller parties can select a larger band; enforcing a minimum of five would be a separate business decision. No new minimum has been imposed.
- There are two metadata-only zero-priced add-ons. Do not infer a new charge or included entrance/child-seat service from legacy UI toggles. Verify the booking summary against the selected fare during acceptance; do not initiate a payment.
- The list is ISK-backed. A later administrative FX change moves displayed euro prices; no live FX feed is introduced.

## What deployment changes

A code deployment changes UI, permissions presentation, search/quote validation, public listing grouping and the build/start safeguards. **It does not publish the new database catalogue.** Keep both `PUBLISH_OFFICIAL_CATALOGUE_ON_START=false` and `ALLOW_DESTRUCTIVE_SEED=false`, or leave them absent. No schema migration is required. Never run `prisma/seed.ts` for this handover.

## Operator procedure — separate approval required before execution

Use the existing Nginx/systemd deployment procedure, Node 22 on Ubuntu, an isolated release and the resource-bounded build wrapper. The active production port remains 3002. Confirm actual systemd unit names and paths privately; examples use `iceland-taxi.service`. Do not print the environment file. Runtime credentials stay in `/etc/iceland-taxi/app.env`, never in the release/build tree. Keep an SSH session open and record the current release symlink target.

1. **Build and freeze writes.** Build the reviewed commit in a fresh release using `scripts/vps/build-release.sh` with only the public origin exported. Confirm both opt-ins are false in the private runtime environment. Arrange a maintenance window, put Nginx into the site's reviewed maintenance/503 configuration, and stop the application and any reminder/background writers. Do not reopen traffic until acceptance. This is necessary for the full-data rollback below to preserve all records without discarding subsequent activity.
2. **Back up and record the baseline.** From a privileged shell, use `umask 077`, create a protected backup directory, and run `sudo -u postgres pg_dump --format=custom --no-owner --no-privileges --dbname=iceland_taxi > /protected/backup/handover-before.dump`. Check command status, compute a checksum, and inspect the archive listing with `pg_restore --list`. Record table counts for bookings, payments, customers/users, staff and Better Auth tables using the read-only migration checklist. Restore the dump to a separate rehearsal database first and verify counts; a dump listing alone is not a restore test. Retain the old code release and an encrypted off-server backup.
3. **Preview the exact target state.** In the newly built release, execute `node --env-file=/etc/iceland-taxi/app.env node_modules/tsx/dist/cli.mjs scripts/replace-official-catalogue.ts --preview > /protected/backup/catalogue-plan.json`. This explicit command reads PostgreSQL, not the web server. Inspect every action and warning, rate, affected ID and conflict against the approved table. Stop on conflicts. Record the plan's SHA-256 `fingerprint`. Do not use the old unguarded no-argument command.
4. **Apply only the reviewed fingerprint.** After operator approval, run the same explicit command with `--apply <reviewed-fingerprint>` instead of `--preview`. It rechecks the fingerprint inside a serializable transaction, then applies service/route/add-on/vehicle/content actions, EUR rate and publication marker atomically. Stale plans, conflicts or transaction failures abort; never treat an error as success. Obtain a fresh preview before retrying. Neither startup flag needs enabling.
5. **Verify before traffic.** Run the command with `--verify`; require `valid:true`, no conflicts, zero pending changes and EUR 150. Save a new preview and confirm no differences. Recheck baseline identity/auth/booking/payment counts and important existing booking/payment amounts and relationships; catalogue writes must not change them. Activate the new code release with opt-ins false. Start it behind maintenance access only. Using existing controlled acceptance accounts, verify published categories, all 28 fare variants, representative quote endpoints for both bands, zero vehicle surcharge, admission exclusions, past bookings, OTP and role separation. A five-person party must not obtain a 1–4 fare; nine must not obtain either official car fare. Quote inspection must not create a booking, send an OTP/email or start checkout. Use local fixture OTP tests for delivery-free auth validation. Obtain acceptance of unspecified durations and any legacy toggle presentation. Do not pay. Reopen traffic only after these checks and operator acceptance.

## Rollback

**Before reopening traffic:** leave maintenance enabled and writers stopped. Code rollback switches the current symlink back to the recorded previous release and retains opt-ins false. For catalogue/data rollback, restore the verified pre-publication dump into a **new private rollback database**, owned by `iceland_taxi`, rather than deleting the current database. For example, a privileged operator creates `iceland_taxi_rollback_HANDOVER`, then runs `sudo -u postgres pg_restore --no-owner --no-privileges --role=iceland_taxi --single-transaction --dbname=iceland_taxi_rollback_HANDOVER < /protected/backup/handover-before.dump`. Check status, row counts and preserved authentication/payment/booking records. Privately point the runtime database URL to this verified database, leaving both flags false, start the previous release behind maintenance, and accept before reopening traffic. Keep the failed database intact for investigation. Do not paste the connection string.

**After reopening traffic:** code rollback can still use the previous release, but do **not** switch to the old dump or restore the whole database: that would lose intervening bookings, payments, customers and auth changes. Keep current data, freeze catalogue administration, and prepare a separately reviewed catalogue-only compensating transaction from the saved preview/before-images, with concurrency checks. New catalogue IDs referenced by later bookings must be retained/hidden rather than deleted. This reconciliation requires a fresh backup and approval; it is not an automatic rollback command in this handover.
