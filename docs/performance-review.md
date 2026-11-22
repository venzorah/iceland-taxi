# Performance review — 22 November 2026

Review branch: `perf/measured-checkout-and-catalogue`, based on `10f188a472a80d79fc45c4471758f112fe0905f2`. No deployment, merge, production data changes, real email or payment was performed. Runtime remains one Next.js app. No schema migration, Redis, worker process or DNS change is introduced.

## Prioritized evidence

1. **Measured:** initial homepage and search each made two `/api/listings` requests. Shared loading reduces this to one. Reuse during client navigation avoids another request for 15 seconds. A subscriber unmount cannot cancel another subscriber's request. Failed/invalidated results cannot restore stale data.
2. **Measured:** bundled logo PNGs were 647,116 + 800,764 bytes. Equivalent WebPs are 30,646 + 38,386 bytes. Originals are retained. The splash also changes from 171,598 to 28,892 bytes. Existing stored standard logo paths resolve to the optimized assets without database writes; custom brand URLs are preserved.
3. **Code finding, confirmed by browser transfers:** all five hero images previously loaded immediately. Only current/visited slides now load; the crossfade remains. Offscreen marketing photos use lazy loading and dimensions. Direct Cloudinary delivery uses responsive widths and `f_auto/q_auto` only for recognized unsigned original URLs; already transformed/signed URLs remain untouched. No Cloudinary image passes through the VPS image optimizer. Local marketing JPEGs remain precompressed originals; local logos use committed WebPs.
4. **Code finding:** new checkout awaits booking emails before OAuth/checkout. Notifications still block the response, deliberately: moving them outside it would require an outbox/retry design. They now use two bounded, fully awaited deliveries and one company context per batch. Existing sent/failed EmailNotice records and recipient deduplication remain. This is not a durable job queue and does not claim automatic background retries.
5. **Code finding and fixture test:** simultaneous cold OAuth requests previously fetched separate tokens. One in-flight request is now shared per hashed credential/environment/store context. Failed acquisition clears the promise; expiry and environment isolation remain enforced. A rejected checkout is not automatically retried.
6. **Code finding:** message threads grew without a limit on every poll. Customer/staff and driver-operations threads now page 100 messages in chronological display order, with Older/Latest controls. Only displayed IDs are marked read. Admin bookings/payments page 100 rows with stable createdAt/id ordering and cursors instead of silently stopping at the newest 100.
7. **Code finding:** catalogue queries fetched inactive rows and whole service relations. They now select the public fields and active rows. Quotes still read the database every time. Catalogue/rate reads can run concurrently; availability remains in the serializable booking transaction.
8. **Bundle finding:** public route startup already excludes admin/driver route code. Heavy admin fleet, payments, messages and workspace panels now load on demand. No public map/editor/chart was added.

## Request map and Pay delay

Public startup loads root providers (identity session, application role session, site content, appearance, announcements), page catalogue and company/footer data. The two session endpoints serve different purposes; this change does not weaken the role lookup to remove a request. Search form and results now share one public catalogue store.

Search → result preserves the stable listing ID, kind, date, time, passenger and luggage values. Booking loads vehicles, selects a capacity-compatible vehicle, then requests the authoritative quote. Changes to the selected vehicle/category correctly request a new quote; these are not cacheable availability guarantees.

Pay → validation/rate budget → session/access check → existing-request lookup or new booking → current catalogue/vehicle/rates → serializable availability/create → awaited notices → payment lease → OAuth/cache → Teya POST → read/parse response → persist provider reference/URL → booking-status recheck → JSON response → immediate browser navigation. There is no intentional browser delay after a checkout URL arrives. Saved-booking retries reuse the payment ID/idempotency key and do not create another booking.

New `X-Checkout-Diagnostic-ID` identifies a request using a generated UUID. `[checkout.timing]` logs fixed stage names, numeric milliseconds, HTTP status and that UUID only. Timed stages include validation/auth, booking reads/create, catalogue, vehicle, rates, availability transaction, notifications, payment reads/writes, OAuth/cache/wait, Teya headers/body parsing and total. Stages can overlap/nest; **do not add them to derive total**. Total includes API wrapper/rate-budget work not separately attributed. The browser exposes only total Server-Timing; `itb.pay-to-redirect` is an in-memory Performance measure. No analytics beacon was introduced. Provider validation diagnostics retain their existing sanitizer and may include the same opaque ID on rejection.

No tokens, credentials, customer fields, booking links, raw provider errors or request/response bodies are added to logs. Journal limits remain the operator's configured bounds. Connect timeout/DNS/provider latency cannot be diagnosed from the old generic failure alone: the new stages must be observed on the VPS before attributing slow live checkout. No DNS/IPv6 changes or blind POST retries were made.

## Browser measurements

Raw, sanitized records: `performance/browser-before.json`, `browser-after.json`; bundle inventory: `bundles-before.json`, `bundles-after.json`. Script: `scripts/performance/browser.mjs`.

Production builds, isolated Chrome profile, loopback HTTP; all APIs intercepted with a fixed 50ms fixture wait, external hosts (including fonts) blocked. Desktop 1440×1000 unthrottled; mobile 390×844, CPU 4×, network 150ms/1.6Mbps download/750kbps upload. Each route/profile has one cleared-cache and two warm-cache loads, with 1.8s observation after readiness. These are small lab samples, not a statistical load test, real-device field data or VPS timings. Error-boundary/stalled setup attempts were discarded; the retained records are ready and error-free. The synthetic announcement response removes seeded announcements after hydration and contributes to measured CLS. CLS is not presented as a production estimate.

| Cold load | LCP before → after | Bytes before → after | Requests before → after |
|---|---:|---:|---:|
| Desktop homepage | 324 → 316 ms | 4,091,476 → 950,492 | 43 → 35 |
| Desktop search | 224 → 260 ms | 1,890,284 → 369,910 | 35 → 34 |
| Throttled mobile homepage | 7,108 → 3,136 ms | 4,090,827 → 596,651 | 43 → 32 |
| Throttled mobile search | 2,224 → 1,844 ms | 1,889,561 → 369,187 | 34 → 33 |

Warm LCP medians before → after: desktop home 184→172ms, desktop search 182→200ms, mobile home 508→478ms, mobile search 566→558ms. Initial compressed JS increases about 1.1KB on home and 1.5KB on search; cold desktop search LCP regresses 36ms. Desktop CLS stays around .026 home/.093 search; mobile cold home stays .043, and warm mobile home regresses from 0 to a .021 median. No material CLS improvement is claimed. These small samples do not establish significance. No genuine INP sample exists (event observations are empty); do not label synthetic clicks INP.

The design markup is retained; optimized logos should also be visually accepted on a real high-DPR phone. The full cold/warm comparison precedes the final signup-feedback and messaging/cursor refinements, which do not change public imagery; final bundle/flow verification is separate (`browser-final-smoke.json` and `journey-fixture.json`). All twelve final public samples were ready/error-free with one catalogue request. The fixture Pay-to-redirect measure was201.5ms for an intentionally200ms mocked checkout response; no browser wait was added.

## API, database and checkout measurements

Operator-provided VPS baseline: loopback home20ms/search6ms/listings47ms/readiness12ms; RAM6.6GiB available, disk79GB. Public HTTPS single-request home DNS178ms/TCP354ms/TLS744ms/TTFB919ms/total1.06s; search TTFB629ms; listings484ms. The timing fields are cumulative. For home, TCP setup increment is176ms and TLS increment390ms; these are not independent durations to sum again. Network setup is material relative to the provided loopback time, but these individual measurements do not prove a DNS fault or database/load bottleneck.

No private PostgreSQL connection or live checkout was benchmarked here. Local API responses in the browser measurements are fixtures, **not measured Prisma latency**. `checkout-synthetic.json` isolates scheduling only: two15ms reads, four50ms deliveries, OAuth75ms and provider125ms. Five runs change 438–440ms sequential to320–322ms with parallel reads/bounded2 notices. This does not predict live email/Teya speed. Concurrent-provider fixtures reduce OAuth calls from two independent cold requests to one shared request; cold single-request OAuth/provider latency itself is not removed.

The code still performs server revalidation at checkout, including capacity/price reads. Those reads are correctness checks, not removed as speculative duplication. Prisma uses one process-local singleton and a default three-connection pool; the target runtime URL may explicitly override it. Do not increase it solely because the VPS has8GB. Measure pool wait/DB connections before changing. No new indexes/migrations: first collect query plans and row volumes for cursor lists, assignment history and busy-window checks. `CREATE INDEX CONCURRENTLY` would need a separate migration/runbook and is not bundled into app startup.

## Remaining checks and limits

- Measure real authenticated customer/driver/admin browser sessions and non-mutating DB/API requests on the target. No authenticated portal browser performance or production data-volume profile is claimed here. Driver all-assignment history and inbox thread limits still need volume-driven pagination review; message bodies are now bounded per page.
- Collect three or more real VPS cold/warm rounds with new timing IDs, including failed/slow provider calls. One historic `UND_ERR_CONNECT_TIMEOUT` does not establish a recurring cause. Live end-to-end payment acceptance remains undocumented in this task; do not create a live payment just to benchmark it.
- Further remove SMTP from checkout only with a transactionally persisted, deduplicated outbox, explicit retry/delivery states and operator-approved processing. There is no fire-and-forget email in this patch.
- Default public images/content are still client-overridden. Server-provided public bootstrap data could remove that waterfall, but needs an explicit server cache/invalidation design. No public server/proxy cache was added. Public catalogue cache is memory-only: reuse15s, visible refresh30s, refresh on focus/visibility/mount after expiry, immediate same-origin admin mutation event/BroadcastChannel invalidation, and forced retry. Edits from another browser/session are seen on refresh/focus or the next visible30s tick. Quotes remain authoritative and uncached throughout.
- A CDN can reduce static-asset geographic latency and origin bandwidth. It cannot remove uncached auth/quotes/bookings, SMTP or Teya/DNS latency at the origin. No nameserver/email-routing change or larger VPS is recommended from the available evidence.

## Validation and operational handoff

See `performance-operations.md` for commands, final check results, smoke tests, Nginx verification and rollback. Tests use isolated in-memory/VM/provider fixtures. The working environment's local disk pressure caused failed benchmark/setup attempts; it is not evidence of VPS pressure. The lockfile changes only effect3.22.0→3.22.5 (same dependencies, registry-verified integrity), with Prisma6.19.0 and optional libc metadata preserved. npm audit of the reviewed lockfile reported zero vulnerabilities. A local npm resolver attempt failed; the exact effect tarball was integrity-checked and installed without force flags or lockfile regeneration before the final build. A clean Linux `npm ci` remains a deployment check.

Customer signup follow-up: successful unverified signup now replaces the registration form with an accessible Check your email screen, resend with cooldown, sign-in link and change-email action. It clears the password from state. Failure leaves the editable form; no automatic login or verification bypass is introduced.

## Primary references

- Cloudinary responsive optimization: https://cloudinary.com/documentation/image_optimization and https://cloudinary.com/documentation/responsive_html
- Teya hosted checkout/idempotency: https://developer.teya.com/apis/online-payments/apis
- Nginx gzip, HTTP/2 and proxy buffering: https://nginx.org/en/docs/http/ngx_http_gzip_module.html, https://nginx.org/en/docs/http/ngx_http_v2_module.html, https://nginx.org/en/docs/http/ngx_http_proxy_module.html
