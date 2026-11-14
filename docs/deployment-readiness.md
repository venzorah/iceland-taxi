# Deployment readiness — 14 November 2026

Assessment: the core application is built and tested, but this revision should not be opened to public customer traffic yet. Prepare a hosted test deployment after the security changes below; complete provider and hosting checks before launch.

## Verified

- Clean local working tree at the start of this audit; latest UX work committed locally.
- Current revision passes 76 automated tests, TypeScript, lint (no warnings/errors) and an isolated production build on Next.js 15.5.29. The final dependency audit reports zero vulnerabilities.
- Customer, driver and staff role flows and desktop/mobile UI checks passed with temporary accounts.
- Real Cloudinary upload/delivery/replacement and PostgreSQL metadata/library management passed; fixtures were removed.
- Application data and identity remain on the existing Supabase PostgreSQL/Auth setup. No provider migration is needed just to host the Next.js app.

## Code blockers

1. **Security fixes applied.** Next.js/tooling and transitive dependencies are patched; the final audit reports zero vulnerabilities. RLS restrictions are applied, public request limits and origin/body checks are implemented, sensitive response fields are removed, and push destinations/ownership are validated. See [security-review.md](security-review.md) for scope and deployment requirements.
2. **Contact form connected.** Submissions now persist privately in PostgreSQL and appear in the operations Contact messages inbox. Validation, request idempotency and role restrictions are implemented. No email delivery is claimed.
3. **Teya production implemented.** The client confirmed the supplied credentials are live. TEYA_ENVIRONMENT=production now selects the official live API/OAuth hosts; local .env is set to production without changing credentials. Production requires a webhook key and secure return URLs. Mocked tests verify live/sandbox routing, token separation and rejected unsafe redirects; actual checkout/webhook verification remains pending hosting. Automatic refunds remain unimplemented.


## Configuration and hosted checks

- Booking mail is not configured: `SMTP_URL` and `MAIL_FROM` are absent locally. Supabase Auth SMTP is configured independently and still needs verification for signup/driver activation/recovery links.
- `NEXT_PUBLIC_APP_URL` is absent locally. Set the intended HTTPS application origin in the hosting environment and build with the correct public values; configure exact Supabase redirect allow-list entries and templates, including driver confirmation/recovery intent.
- `CRON_SECRET` is absent. The reminder endpoint intentionally rejects requests until a secret is configured. Add a compatible server-side scheduler with authenticated calls, and verify reminders without duplicates.
- Web Push keys are configured, but real handset/background delivery still requires device testing after HTTPS deployment.
- Confirm database/Auth connectivity from the hosting account and observe connection reliability under realistic load. The current local regression run encountered database/Auth 503 responses and expired transactions during a driver reply and admin assignment. Customer ownership, messaging/profile checks, driver journey/profile checks, all staff roles and the contact security flow passed, but the complete live runs did not. All temporary fixtures were removed. Expired-transaction errors now return a safe retryable 503. Transaction pooling is preferred when configured; this does not establish that connection reliability is resolved.
- Configure database backups, restore procedure, log/error monitoring and a rollback path before public launch.

## cPanel preparation

The user reports Node.js versions and Terminal are available. Select Node.js 22 LTS: the installed Supabase SDK requires Node >=22, and package engines/.nvmrc now reflect this. Exact selected runtime, process/resource limits, application-manager startup requirements, HTTPS and outbound connectivity remain to be verified on the account. Package configuration currently uses `next build` / `next start`; this is a server-rendered application with API routes, not a static export.

Use a test subdomain initially. Keep Supabase/PostgreSQL/Auth and Cloudinary unchanged. Do not copy files into public_html expecting a static site, reset the database, or treat changing DATABASE_URL as a migration. Prepare the startup/build arrangement for the actual cPanel application manager after confirming its requirements.

## Recommended order

1. Review the security regression evidence and resolve/retest intermittent database connectivity from the intended hosting account.
2. Prepare and deploy the server application to a test subdomain with correct environment settings.
3. Complete email, Teya/provider, HTTPS/auth redirect, scheduler, push and operational checks.
4. Obtain customer/client acceptance, then perform the live-domain cutover with backups and rollback ready.

Security fixes now modify application code, dependencies and additive database protections. No hosting configuration, provider credentials or live payment state was changed.

## Deployment preparation follow-up

Customer/driver message composers are now always visible, with a dedicated driver Messages tab and a clear booking requirement/contact link. Driver access through /messages uses assigned journeys and the driver operations API. cPanel startup file app.js and the start:cpanel command are prepared; see [cpanel-deployment.md](cpanel-deployment.md). Production support is locally tested with mocked Teya responses; enabling it does not establish that the live merchant is operational.

Verification of the messaging follow-up: isolated Chrome checks passed customer /messages, driver /driver Messages tab and driver /messages for typing, mocked sends, mobile/desktop fit, empty bookings and loading errors. The first driver attempt hit AUTH_UNAVAILABLE; the retry passed. Temporary Auth/database accounts were removed. The cPanel app.js entry point returned HTTP 200 from /api/health locally. These UI tests stubbed browser APIs and do not replace hosted database/message delivery checks. The source ZIP is prepared for File Manager upload and Terminal installation; no hosting changes have been made.
