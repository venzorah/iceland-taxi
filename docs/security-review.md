# Security fixes — 14 November 2026

## Fixed

- Updated Next.js and its matching ESLint configuration to 15.5.29. Removed unused next-pwa/Workbox dependencies; the existing custom notification service worker remains. Patched PostCSS and scoped Prisma tooling dependencies while retaining Prisma 6.19.0. Scoped ESLint overrides retain a compatible 8.x parser/plugin and patched minimatch; npm's automatic suggestion downgraded tooling incompatibly and was replaced.
- Enabled RLS and revoked anonymous/authenticated browser grants on MediaAsset, SiteBlock and Prisma's migration table. New ContactMessage and RateLimit tables have the same protection. All public tables were verified to have RLS; anonymous REST checks on the five protected tables denied access or returned no rows. Server-side authorization remains mandatory because the Prisma database connection bypasses RLS.
- API mutations reject foreign browser origins, cap non-multipart request bodies at 64 KiB, and return private/no-store responses. Existing image upload parsing enforces its own stream/file limit. Added anti-framing, MIME, referrer and limited CSP headers; production adds HSTS. This is not a full script-source CSP rollout.
- Public booking, quote, enquiry, checkout, maps and push subscription submissions have database-backed request budgets. Contact submissions also have per-email limits, validation and a honeypot. Counts use HMAC identifiers. Expired counters are removed by the protected reminder cron.
- Push subscriptions require verified identity, account ownership, role/active-driver checks, valid encryption key shapes and an HTTPS browser push-provider destination. Outbound delivery checks destinations and current account eligibility again. Old unowned subscriptions are excluded from delivery until safely registered again; staff legacy subscriptions may require resetting browser push permission. Driver operations notifications never go to customers.
- Removed password/auth identity fields from customer mutation responses, payment provider payloads from general booking responses, conflicting customer booking references from public availability responses, and detailed integration error output. Error logging no longer prints raw database/provider exceptions. Guest access cookies default to Secure in production, with an explicit loopback HTTP exception for local production tests.
- Opening a message thread uses a read-only GET. An authorized, same-origin PATCH marks only the displayed message IDs and associated notices read; unrelated/unseen messages remain unread.
- Replaced the simulated contact-form success with validated, idempotent database persistence and a staff inbox under Contact messages. Only operations roles can read/update it. Submission confirmation means saved for review; no email delivery is claimed.
- Runtime queries prefer the configured Supabase transaction-pooler URL. DIRECT_URL remains for migrations. This addresses the observed unreliable session-pool connection without changing database providers or credentials.

## Database deployment

Both additive migrations were applied to the existing database without resetting data. The Prisma schema-engine connection repeatedly failed while normal queries worked. `scripts/apply-security-migrations.mjs` applied the reviewed statements in a transaction, verified existing migration checksums, took an advisory lock, and recorded the exact new checksums atomically. Use normal `prisma migrate deploy` on hosts where it works; the fallback only handles these two named migrations and is safe to rerun.

## Hosting requirements

Use Node.js 22 LTS on the host (the installed Supabase SDK requires Node >=22); .nvmrc and package engines now state the minimum. Local checks used Node 25.8.1, so verify the selected hosting runtime too. Set NEXT_PUBLIC_APP_URL to the exact HTTPS origin and build with the intended public configuration. Keep .env and all server secrets outside public_html and Git. Configure RATE_LIMIT_PROXY_HEADER only if the hosting proxy overwrites the chosen header and direct origin bypass is blocked. Otherwise leave it empty: anonymous submission limits use a shared budget, which may throttle legitimate traffic on a busy site. Perimeter abuse protection and trusted proxy setup still need hosting verification.

Configure CRON_SECRET and the authenticated scheduler so reminders and counter cleanup run. Follow-up: the client confirmed live credentials and production host selection is now implemented. Complete the hosted signed-webhook/checkout checks before opening payments to customers. SMTP, Supabase email delivery/redirects, handset push, backups/restore and hosting connectivity remain launch checks. No secrets were rotated and no live payment requests were made during this review.

## Evidence

- Configured secret-value scan: no matches in tracked/untracked source; only .env.example is tracked. Pattern scan found only placeholder database URLs in .env.example. A scan of locally available Git history also found no matches for the configured secrets, including the database password. This cannot establish that previously shared credentials, unknown older values or unavailable revisions are safe.
- Dependency audit: zero reported vulnerabilities after the final compatible dependency updates.
- 73 automated tests passed, including request origin/body limits, proxy trust, push destinations/keys, contact validation and role permissions.
- TypeScript, lint without warnings/errors, and isolated production build passed.
- Live checks passed contact persistence/idempotency/role isolation/origin/body/cache controls; all five admin roles and website-content permissions; customer ownership, message persistence/read state and profile privilege rejection; driver ownership, concurrency, full journey, busy lock and profile persistence.
- The complete live runs did not pass: a customer request returned database 503; a driver operations reply and admin assignment expired their database transactions (P2028). Expired-transaction errors now return a private retryable 503, covered by an additional test. No automatic write retry or payment movement was added. Connectivity must be stabilized and these flows retested before launch. All temporary accounts and fixture records were removed; the isolated test server was stopped.

This review reduces identified risks; it is not a penetration test or a guarantee that the application has no vulnerabilities.
