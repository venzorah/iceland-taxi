# Incoming UI update review

Reviewed fetched commits `f4854c1`, `2ddd680`, and `70f57aa` against local base `2b3fd8a` and the current uncommitted implementation. The fetched update changes 47 files. The failed pull did not merge those commits; application files, credentials, database and Git history were left unchanged during this review.

## Incoming features

- Website content editor for homepage, About, Services and FAQ text, with public content context/provider.
- Image library and reusable upload/image-picker fields, including replaceable public photos and logos.
- Driver/vehicle card layouts with contact fields, categories, use cases and suspension controls.
- More visible sign-out buttons and reduced payment/provider detail in presentation.

## Issues to resolve before integration

1. **High — Sign-out is incompatible with current authentication.** Incoming `src/lib/auth/sign-out.ts:2` posts to `/api/auth/demo`, ignores HTTP failures, then redirects. Locally, that POST intentionally returns 410. Using this helper would leave the Supabase session active even though the UI navigates away. Keep the UI controls but connect them to the existing `/api/auth/signout` handler and check success.

2. **High — Driver password handling introduces a second authentication system.** Incoming `src/app/api/admin/drivers/route.ts` and `[id]/route.ts` write `User.passwordHash`, while `src/app/api/driver/auth/route.ts:50` checks it only when present and then writes the old driver-ID cookie. Existing verified Supabase Auth does not use that password hash. A driver with no hash is not required to provide a password in the incoming handler. Retain Supabase sign-in, active-driver checks and real session verification; do not re-enable demo cookies or present local password hashes as working Supabase credentials. Driver email changes must also preserve the verified Auth identity rather than updating only the application email.

3. **High — New management endpoints lack module-level permissions.** New library/site-block endpoints and driver/vehicle DELETE handlers call `rejectDriverOnly()` without a module. With the current helper this permits any active staff role, including finance/content roles outside the relevant module. Apply the existing content/driver/vehicle permissions. Deleting a driver/vehicle also clears assignments on every booking, including active and historical ones; lifecycle/history guards are required before offering those actions.

4. **High — Do not overwrite current payment safeguards.** Incoming `src/app/api/admin/payments/route.ts` lacks the current payment permission check. Incoming `[id]/route.ts:25` still marks payment and booking refunded without a provider refund. This behavior predates these commits but conflicts with the local fixes. Keep the limited response fields while retaining local authorization and the refusal to fabricate a refund. Configuration flags should say “configured”, rather than “connected”, until provider connectivity is verified.

5. **Medium — The image library changes the agreed storage architecture and omits migrations.** Incoming Prisma adds `MediaAsset.data Bytes` and serves those bytes through `/api/media/[id]`, rather than uploading media to Cloudinary. It also adds `SiteBlock`, with no SQL migration in these commits. Preserve the library/picker UX, use Cloudinary for media bytes, store appropriate URL/metadata in PostgreSQL, and add an additive migration for the final schema. Do not use a database reset or assume editing schema.prisma creates tables.

6. **Medium — Read errors are hidden as empty/default content.** New library/site-block/public-media endpoints catch database errors as empty lists or not-found responses. Missing tables or an outage can therefore resemble a successful empty library, discard the administrator's view of saved content, or show default text silently. Use the existing sanitized API error wrapper and explicit loading/error states; validate upload bytes and cap request size before buffering, as the current upload route does.

## Safe integration sequence

- Preserve all tracked AND untracked local work in a reviewed checkpoint/backup; keep private `.env` ignored and out of commits. A stash without untracked files would omit much of the implemented authentication, migrations and tests.
- Merge the fetched commits with explicit conflict resolution. Keep local authentication, authorization, booking/payment state rules and migration history.
- Adapt incoming content/library/fleet UI to those APIs and Cloudinary, preserving session-aware navigation, absence of footer portal links, empty customer states, driver flow and the recent password visibility controls.
- Generate/review only the necessary additive migration. Verify TypeScript, lint, production build and affected ownership/role/session/payment/upload regressions; inspect the merged pages in the browser.

This was a source review. The incoming version has not been merged, built or rendered, and no claim is made that its UI works with the current backend unchanged. Do not run a force reset, accept all incoming changes, or blindly stash/pull/pop.
