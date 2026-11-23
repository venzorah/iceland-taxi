# Performance branch: validation and optional operations

Nothing in this document has been run against the VPS. Do not deploy or apply the Nginx patch until the review branch is accepted. No database migration/seed/restore is needed for these changes. Production uses port **3002**, not the repository template's3000; preserve the installed unit and its protected EnvironmentFile.

## Local checks

```sh
npm run typecheck
node --import tsx --test src/lib/**/*.test.ts src/app/login/LoginForm.test.ts
# Scoped ESLint: see the changed .ts/.tsx files in git diff; include new test/helpers too.
NEXT_OUTPUT_DIR=.next-perf-after VPS_BUILD_CPUS=1 NODE_OPTIONS=--max-old-space-size=2048 \
  DATABASE_URL=postgresql://fixture:fixture@127.0.0.1:1/unused \
  DIRECT_URL=postgresql://fixture:fixture@127.0.0.1:1/unused npm run build
```

Final checks passed: 130 library tests plus three signup transition tests (133 total), TypeScript, scoped ESLint and the one-worker production build using effect3.22.5. An additional twelve final public-browser smoke samples were ready/error-free with one catalogue request each. The actual signup desktop/mobile screenshots were visually inspected. The fixture home→search→booking journey retained every selection and made one checkout POST despite a double click; a deliberately200ms fixture response yielded a201.5ms browser Pay-to-redirect measure and256ms observed navigation. These are fixture measurements, not live Teya latency. Tests include actual checkout-handler lease exclusion/session reuse, rejection/timeout unpaid state, unauthorized access before payment writes, OAuth expiry/recovery/context isolation, sanitized timing/validation diagnostics, RSA signatures, webhook replay/refund/environment isolation, shared-cache invalidation/unmount/error retry, notification dedupe/failed delivery state, and a205-message history paged without losses. No live network-backed integration test was run.

`browser-before.json`/`browser-after.json` contain twelve valid public-page samples each. Run `scripts/performance/browser.mjs /tmp/result.json` only with an isolated production preview at127.0.0.1:3118 and a separate headless Chrome profile exposing CDP on127.0.0.1:9250. The script hardcodes loopback, fulfills all API requests with fixtures and blocks outside hosts. It closes only its loopback-origin tabs. Use optional third argument `desktop-home`, `desktop-search`, `mobile-home`, `mobile-search` for separate rounds. No actual provider/DB timings are collected by this script. Do not point it at production. `checkout-stages.ts` is a synthetic scheduling benchmark, not a payment test.

## Deployment preparation (operator, later)

1. Review the committed diff against10f188a. Retain the old source/release and current service target. Privately inspect the installed systemd WorkingDirectory/ExecStart and reverse-proxy configuration; do not paste secret Environment values. Keep `/etc/iceland-taxi/app.env` unchanged, including live/sandbox credentials and port3002.
2. Use a fresh Linux x86-64 release with Node22 and `npm ci` using the reviewed lockfile. Never upload macOS node_modules or private `.env`. Verify `npm ls prisma effect` shows Prisma6.19.0/effect3.22.5; run `npm audit`. Retain libc metadata in the lockfile. No `--force`/`--legacy-peer-deps` was used to alter the dependency tree. Stop if clean installation fails.
3. Use the existing memory-bounded `scripts/vps/build-release.sh`/systemd build-cgroup procedure with public build values only, one worker,2GB heap and a fresh release. Never build in the running release. The reference production start command is `node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3002`; preserve the installed unit's equivalent command and EnvironmentFile rather than replacing it with the generic3000 template.
4. No migrations, resets or seeds. The first start of this release publishes the official price list once; take the normal database backup before that restart. Activate only through the existing reviewed release procedure. Restart the app only after successful build, then perform the read-only and fixture-safe smoke checks below. No live payments or outbound emails are necessary to verify asset delivery.

## Target smoke checks and measurement

- Confirm systemd healthy and loopback3002 listening; health/readiness should succeed with the existing private target. Compare three cold/warm loopback/public rounds to the supplied baseline. Inspect only safe `[checkout.timing]` entries; never enable Prisma query/parameter or full HTTP body logging.
- Guest home→search→result→booking must retain future Iceland date/time, passengers/luggage and stable listing ID. Search shows one catalogue request; client navigation within15s should reuse it. Quote/availability responses stay private/no-store and still revalidate capacity and price. Do not click a live Pay button for this smoke test.
- Use the isolated fixture browser or a separately authorized sandbox rehearsal for Pay→redirect checks. Capture `performance.getEntriesByName('itb.pay-to-redirect')` locally and correlate the network response's opaque diagnostic ID with safe server stages. A timer in a synthetic provider fixture is not proof of production acceptance. Do not change production to sandbox merely to benchmark.
- Authenticated portal acceptance: sign-in/sign-out/roles, booking/payment Next/Previous pages, message Older/Latest chronology, displayed-message read state, notifications and mobile composer. With a separately authorized publication/price edit in rehearsal, verify immediate same-origin cache invalidation and≤30s visible refresh in another browser. No production publication change was performed here.
- Customer signup verification transition is covered with mocked auth responses, including resend failure. A later real-email acceptance test requires explicit authorization; this branch did not create accounts or send mail.
- Record real portal LCP/CLS and interactions under the same desktop/mobile conditions. Initial fixture event observations are not INP. Collect query plans and row volumes before adding indexes or changing pool limits. Preserve the operator's journal/logrotate limits.

## Optional Nginx patch, based on the supplied installed configuration

Files: `deploy/performance/nginx-production.before.conf`, `.optional.conf`, `.optional.patch`. The before snapshot normalizes formatting only; compare semantic content to the current file. Do not blindly replace an independently changed configuration. Whitespace differences in the pasted snapshot can make the unified patch fail: inspect the diff and apply the equivalent two listen changes/static location manually to a reviewed candidate instead of forcing a failed patch.

Evidence supplied: Nginx1.24.0 Ubuntu, OpenSSL3.0.13, `--with-http_v2_module`, global `gzip on;`. Therefore the candidate uses **`listen 443 ssl http2;`** for both existing TLS servers. The newer `http2 on;` directive is not valid on1.24. No gzip directive is added: it is already enabled. The supplied awk filter matches bare gzip/http2 only, not `gzip_types`/`gzip_vary`; inherited MIME coverage is unverified. Read the effective directives before considering another change:

```sh
sudo nginx -T 2>/dev/null | awk '/^[[:space:]]*(gzip([_[:space:]])|http2[[:space:]])/ {print}'
```

Local production checks confirmed successful chunks return `public, max-age=31536000, immutable`, `Content-Encoding: gzip` and `Vary: Accept-Encoding`; a missing chunk returns404 with private/no-store. This verifies Next.js headers locally, not Nginx on the VPS.

The only new location is `^~ /_next/static/`. It proxies to the same3002 with the same authentication/proxy header behavior and enables response buffering for static assets only, with `proxy_cache off`. It **preserves Next.js's upstream Cache-Control**, including one-year immutable successful fingerprinted assets and no-store errors. It does not overwrite404 headers or add duplicate cache directives. No long-lived policy is applied to photos, HTML, RSC, APIs, auth, personalized content, quotes, booking mutations or payments. Root `proxy_buffering off` stays appropriate for dynamic/streamed responses. The exact webhook route, ACME renewal, redirects, certificates, body limits and `Authorization ""` behavior stay unchanged. No blanket proxy cache or compression of private endpoints is proposed.

The source still sends **`X-Robots-Tag: noindex, nofollow, noarchive`**. This is an indexing/launch decision, not a performance change. It remains in the candidate and is inherited by the new static location (which does not add headers of its own).

Later operator commands, after reviewing current config and the candidate:

```sh
sudo nginx -t
sudo cp -a /etc/nginx/sites-available/iceland-taxi-production \
  /etc/nginx/sites-available/iceland-taxi-production.pre-performance
sudo patch --dry-run /etc/nginx/sites-available/iceland-taxi-production \
  < deploy/performance/nginx-production.optional.patch
# Only after the dry run and review succeed:
sudo patch /etc/nginx/sites-available/iceland-taxi-production \
  < deploy/performance/nginx-production.optional.patch
sudo nginx -t
# Reload only if nginx -t passes:
sudo systemctl reload nginx
```

A successful local text patch check is not `nginx -t` on the installed server. No Nginx binary/certificates were assumed locally. If test fails, restore the backup before any reload. Never force the patch to fit changed production config.

Verification (GET/HEAD only, no secret URLs):

```sh
curl --http2 -sSI https://icelandtaxibooking.is/
curl -sSI http://icelandtaxibooking.is/
curl -sSI https://www.icelandtaxibooking.is/
# Substitute a REAL fingerprinted chunk from the deployed homepage, not a guessed name:
curl -sS -D - -o /dev/null -H 'Accept-Encoding: gzip' \
  https://icelandtaxibooking.is/_next/static/chunks/REPLACE-WITH-REAL-CHUNK.js
curl -sSI https://icelandtaxibooking.is/_next/static/nonexistent-performance-check.js
curl -sSI https://icelandtaxibooking.is/api/listings
curl -sSI https://icelandtaxibooking.is/api/auth/session
```

Expect HTTP/2 negotiation, canonical HTTPS redirects, successful chunks with immutable max-age and compression (Content-Encoding/Vary),404 without immutable policy, private/no-store APIs/auth and unchanged noindex. HEAD support varies by route; an unsuccessful HEAD is not a failed GET. Use a read-only GET if needed. Do not POST the webhook to “test speed”; retain existing signed delivery checks for an authorized sandbox rehearsal. Recheck ACME path handling and normal login behavior after reload. Global gzip plus upstream gzip must not lead to double compression; inspect actual headers rather than adding directives speculatively.

## Rollback

App: reactivate the recorded previous compatible release using the existing service-target procedure and restart `iceland-taxi.service`. No schema rollback or database restore is needed. In-memory catalogue/token caches reset on restart. Preserve all payment rows/idempotency keys and reconcile ambiguous attempts before initiating another checkout. Do not roll the effect security fix backward solely to roll back a UI change.

Nginx (independent of the app):

```sh
sudo cp -a /etc/nginx/sites-available/iceland-taxi-production.pre-performance \
  /etc/nginx/sites-available/iceland-taxi-production
sudo nginx -t
# Only if the restored config passes:
sudo systemctl reload nginx
```

Recheck health, redirects, static headers and login. This proposal changes no DNS, cPanel SMTP routing or production environment variables.
