# Local development and chunk-load recovery

Use Node.js 22 to match the VPS. Run `npm run dev` and open http://localhost:3000.

Development output is `.next-dev`; production `npm run build` / `npm run start:vps` output remains `.next`. Explicit NEXT_OUTPUT_DIR verification-build overrides are retained. Both generated directories are ignored by Git and excluded from the VPS source archive. Do not set NEXT_OUTPUT_DIR globally to the same directory for development and production.

A `ChunkLoadError` at `<AppProviders>` means the browser could not load the layout JavaScript. The stack location alone does not establish a bug inside the provider. During this investigation the layout URL returned HTTP 200 and a fresh browser loaded the homepage without script/runtime failures; the original timeout was not reproducible. Separating output directories prevents one known cause: development and production builds overwriting the same generated chunks.

After changing/restarting the server, hard-refresh an already-open tab (Cmd+Shift+R on Mac). If the error recurs, stop the dev server, move only `.next-dev` aside, and restart `npm run dev`. Keep `.env`, source, database data and production artifacts intact. Never delete or reset a database to fix a missing JavaScript chunk.

The current push-only service worker has no fetch/cache handler, so it does not cache application chunks. Do not clear all browser site data or remove notification subscriptions as a first step. Report the failed chunk's HTTP status and the dev terminal's compilation error if a fresh build still fails.

Authentication migration/configuration failures are separate: real-account sign-in requires the restored PostgreSQL target, account import and a private BETTER_AUTH_SECRET. Reloading JavaScript does not migrate accounts.
