# Database and polling reliability

## Implemented

- Alert polling runs only for an established signed-in account. It stops on 401/403, pauses while hidden, waits for request completion, aborts on cleanup, and backs off from 30 seconds to 2 minutes after failures.
- Customer trips and conversation lists refresh every 30 seconds; the active conversation refreshes every 10 seconds. All use the same non-overlapping scheduler.
- Session refreshes share an in-flight request, avoid duplicate initial-session work, and throttle navigation/focus refreshes for 15 seconds. User objects remain stable when identity/profile fields are unchanged, so refreshes do not restart polling.
- Concurrent requests with the same access token share only the pending server-side getUser verification; tokens are fingerprinted and never logged. Identity is always taken from the verified response, never from getSession contents. Concurrent verified requests for the same application account also share only the pending database lookup. Completed role/permission results are not cached.
- API handlers verify their own identity. Public API requests no longer make an unnecessary Supabase Auth call in middleware.
- Public language preferences come from `/api/appearance`, rather than the protected admin endpoint.
- API boundaries translate database unavailability to JSON 503 with Retry-After: 30 and no private queries/credentials. `withDb` never converts a database outage into design data. Listings and vehicles also propagate failures rather than reporting empty successful results.
- The company read endpoint performs one read and does not write settings as a side effect.
- Runtime Prisma defaults remain a pool of 3, with a 10-second connection timeout, a 20-second query timeout, and a 20-second pool wait, and required TLS. Explicit URL parameters override defaults. The initial 5-second pool bound was rejected after it consistently failed while a 20-second allowance succeeded; they do not repair an external network or pooler outage.
- The existing favicon is served as a public static asset rather than through the Next.js metadata route.

## Verification

- `node_modules/.bin/tsx --test src/lib/polling/scheduler.test.ts src/lib/api.test.ts src/lib/alerts/client.test.ts src/lib/auth/permissions.test.ts`
- `npm run typecheck`, `npm run lint`, and isolated production build.
- With an intentionally unreachable local database, `/api/listings`, `/api/company`, `/api/vehicles`, and `/api/appearance` return 503 and no fake success payload.
- `scripts/check-polling-browser.mjs` observes a signed-out browser and verifies zero alert requests and deduplicated session refreshes.
- Read-only `scripts/diagnose-database.mjs` and `scripts/compare-connections.mjs` report timings without credentials or records.

## Remaining external investigation

Read-only checks on 12 November 2026 found transaction-pooler SELECT 1 requests taking 5–16 seconds. An explicit TLS comparison returned warm queries around 2.6 seconds; session-mode connections repeatedly failed. HTTPS Data API reads returned around 0.75–3.36 seconds. These samples demonstrate remaining remote-connection latency; they are not a sustained performance guarantee and do not identify a single cause.

Check the Supabase project's status, Pool Size, Max Client Connections, and database metrics. Compare a different local network if the limits are healthy. Do not increase application pool sizes across processes without checking the project's total connection budget.

Restart `npm run dev` after connection configuration changes: an existing hot-reload Prisma singleton retains its original connections until the process restarts. Keep temporary verification servers isolated from the user's development output with `NEXT_OUTPUT_DIR`.

After the user changed Supabase Pool Size from 15 to 49 (Max Client Connections: 200), a fresh comparison returned session-mode SELECT 1 timings of 2709 ms cold and 193–197 ms warm. Transaction mode returned 12043 ms cold and 947–2345 ms warm. This is an improvement observed after the setting change, not proof that the size alone caused it. The running app is now configured to use the measured session connection for its persistent Node process; its transaction URL is retained in the private environment file for future serverless use. Application pool size stays at 3 per process. Review the project-wide backend budget before making further pool-size changes.

A six-batch read check after switching to session mode returned 200 for all 18 requests (session, staff alerts, and listings). Observed responses ranged from 197 ms to 7988 ms, so network/auth latency remained variable despite eliminating the failures seen in the earlier transaction-mode run. Concurrent token verification was subsequently coalesced without caching completed identity results or trusting unverified session contents.

Final local verification uses an explicit `connection_limit=1`, `connect_timeout=20`, and `pool_timeout=30` on the private session URL to reuse a warm connection and tolerate slow initial setup. The final three concurrent read batches all returned 200 (9/9); the first batch took 7.4–9.8 seconds and subsequent requests took 0.4–5.2 seconds. This is a short successful check, not proof of production load capacity or elimination of network latency. Restart the original development process to adopt the new URL and replace its cached Prisma client.
