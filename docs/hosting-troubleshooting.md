# Hosted crash and authentication diagnosis — 15 November 2026

## Confirmed on the public site

The landing page initially returned HTTP 200. The browser later raised `SyntaxError: Unexpected token '<' ... is not valid JSON` and displayed the application error page. `/api/auth/session`, `/api/company` and even the old `/api/health` returned HTML HTTP 500 pages. `/login` returned HTML 200. All 15 initial script bundles loaded, and the compiled client contained the expected public Supabase URL/key. This does not support blaming the failure on a missing browser key alone.

The catalogue hook parsed the HTML error from `/api/listings`, then threw from render. It now keeps the landing page visible with a pricing-unavailable notice, Retry prices and contact actions. Public catalogue and booking screens use that state; failed requests do not produce sample prices or successful bookings. Browser Auth initialization and sign-out errors are also handled without unhandled exceptions. Liveness no longer imports the database API wrapper, so a database client failure does not also take down the health route.

The shared server initialization failure still needs the cPanel application log or diagnostic output. Plausible causes include missing/uninitialized Linux Prisma Client, missing server dependencies, an unsupported Node version, malformed runtime environment or a database/platform issue. These are hypotheses, not a verified root cause. No database/Auth provider was migrated.

## Low-memory cPanel: prebuilt upload

Use the **prebuilt** ZIP, which contains source, public assets and the matching complete Next.js production build. It excludes build caches, node_modules, private .env, .git and platform native binaries. `cpanel-build.json` tells app.js which build directory to use; keep that receipt with the uploaded build. Do not mix files from different builds or upload only the static folder. Keep the previous release for rollback.

1. On the PC, run an isolated production build, then package it:

```sh
NEXT_OUTPUT_DIR=.next-hosting-fix npm run build
python3 scripts/package-cpanel.py --build-dir .next-hosting-fix
```

2. Upload/extract `deployment-artifacts/iceland-taxi-cpanel-prebuilt.zip` into the private cPanel application root. Keep the existing private environment settings. Choose Node.js 22 and startup file app.js. Remove a conflicting NEXT_OUTPUT_DIR override in the panel; the included receipt selects the matching build directory.
3. Activate the Node environment using the exact command displayed by Setup Node.js App. In the application root, run:

```sh
node --version
npm ci
npx prisma generate
node scripts/diagnose-hosting.cjs
```

**Do not run npm run build on cPanel for this upload.** Dependency installation and Prisma generation are still necessary on Linux; uploading macOS node_modules is not a replacement. Prisma generation uses the host's platform. A future database schema change also needs a separately reviewed migration deployment; do not reset or seed the live database.
4. Restart the app in the panel. Verify `/api/health`, `/api/auth/session` and `/api/listings`. The health response only establishes liveness; it does not establish database health. An anonymous session should return JSON with user:null. Check `/account` redirects to login when signed out, then verify sign-in and all role permissions.
5. Paste the diagnostic statuses/codes and the relevant application error log with secrets removed. The diagnostic script never prints passwords, keys or connection URLs. It performs only SELECT 1 on the database. Find the server log configured in Setup Node.js App; CloudLinux installations commonly expose stderr.log in the application folder. A browser Network entry showing HTTP 500 is a symptom, not the server exception.

Ensure the hosted runtime still has the correct Supabase public settings and server database URLs; browser NEXT_PUBLIC settings must also match when building on the PC. Set NEXT_PUBLIC_APP_URL to the hosted HTTPS origin before creating live checkout sessions. Confirm the host's Node version and database choice before changing providers. Keep all secrets private.

References: [Next.js build-time public variables](https://nextjs.org/docs/app/guides/environment-variables), [Prisma deployment across operating systems](https://docs.prisma.io/docs/orm/v6/prisma-client/deployment/deploy-to-a-different-os).

## Local verification of the fix

78 automated tests and the isolated production build passed. The prebuilt archive was extracted into a separate directory and started using app.js plus its build receipt. Browser checks passed for homepage survival of HTML API 500s, retry recovery to a valid catalogue, booking-page outage handling, and mobile/desktop layout. Health returned 200 despite a deliberately invalid database setting. The database in that smoke test was intentionally unusable; this is not proof that cPanel authentication/database connectivity is repaired. No live credentials were used for test payments and no hosted files/settings were changed.

## Separate local sign-out configuration failure

The local POST /api/auth/signout returned HTTP 503 with code APP_URL_REQUIRED, including for an anonymous request. NEXT_PUBLIC_APP_URL was present but was not a valid URL. The origin guard rejected the request before Supabase sign-out ran. The local setting is now http://localhost:3000; the anonymous endpoint then returned 200. The server origin reader now reads runtime configuration so a PC build cannot freeze the local origin into the cPanel release. The hosted setting must remain the exact live HTTPS origin. Cross-origin mutations are still rejected. No sign-out revocation checks were bypassed and no authentication provider was replaced.

Local verification also used a temporary confirmed Supabase account: same-origin signout returned 200, session cookies expired, the revoked refresh token was rejected, and a foreign-origin request returned 403. The temporary account was deleted. All 79 automated tests and the production build passed.
