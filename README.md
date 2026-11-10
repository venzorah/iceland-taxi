# Iceland Taxi Booking

Production-bound booking platform for **Iceland Taxi Booking** — airport transfers, private taxis, tours, and vacation drivers. Built from the Magic Patterns design (exact UI) on Next.js with PostgreSQL/Prisma, Google Maps, and Teya payments.

**Design source:** [Magic Patterns OS prototype](https://www.magicpatterns.com/os/efK8cNyhF3fFvvbvHv6MNb/9hdh9VBZWuSFDMPVuUgJCN)

## Surfaces

| Path | Surface |
| --- | --- |
| `/` | Public website (SEO + booking search) |
| `/book` | Customer booking / checkout |
| `/account` | Customer PWA dashboard |
| `/admin` | Desktop admin |
| `/m` | Mobile admin PWA |
| `/driver` | Driver portal (demo login) |
| `/messages` | In-app messaging inbox |

All phone layouts follow a native mobile app feel (touch targets, bottom tabs, safe areas).

## Stack

- **App:** Next.js 15 (App Router), React, TypeScript, Tailwind CSS
- **DB:** PostgreSQL + Prisma
- **Maps:** Google Maps (`GOOGLE_MAPS_API_KEY`)
- **Payments:** Teya first, pluggable provider layer (`src/lib/payments`)
- **i18n:** English (default) + Icelandic
- **Currencies:** Public site shows **EUR** and **ISK**. New international checkouts are charged in EUR. Residents can pay in ISK or EUR. Older bookings may still be snapshotted in USD.
- **Theme:** Light default; Dark fully supported

Brand colours: Deep Navy `#061B3A`, Vibrant Yellow `#FFC400`, Emerald Mint `#00CFA5`, Cyan Blue `#00AEEF`.

## Hard rules

- **Do not invent** company phone, email, address, registration, VAT, testimonials, or fleet ownership claims. Those fields live in `CompanySettings` / Admin CMS and stay `null` until set.
- Services, prices, routes, vehicles, and theme defaults come from the database (seed for demo). Historical booking amounts are snapshotted on the booking row.
- Integrations without credentials **fail clearly** — Teya checkout still creates bookings as **Awaiting Payment** (demo path) when credentials are missing; card PANs are never stored.

## Booking & payments

Guest checkout on `/book` creates a snapshotted booking (EUR for international visitors; ISK or EUR for residents), runs driver/vehicle availability checks, then:

Catalogue prices are stored in ISK. Public euro amounts use `ExchangeRate.iskPerEur` (seed **150** ISK = 1 EUR, admin-editable, not a live FX feed). `iskPerUsd` (seed 138) stays for older USD snapshots. Display: euros as `€153` / `€1.532` (dot thousands); Icelandic amounts as `ISK 22,900` (prefix, comma thousands, no `kr`).

1. **Teya configured** → creates a Hosted Checkout session and redirects to `session_url`.
2. **Teya missing credentials** → keeps the booking as `AWAITING_PAYMENT` and shows a clear demo message (no fake “paid”).
3. **Quotation** → saves as `PENDING` with amount `0` / quote flag.

Webhook: `POST /api/payments/webhook/teya` (optional `TEYA_WEBHOOK_SECRET` HMAC). Admin desktop `/admin` and mobile `/m` share the same booking/services/routes/pricing/payments APIs.

## Quick start

```bash
cp .env.example .env
# Set DATABASE_URL for Postgres. Optional: GOOGLE_MAPS_API_KEY, TEYA_* 

npm install
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Without `DATABASE_URL`, the UI still runs and list APIs serve the Magic Patterns seed fallback so local UI work is unblocked. Writes that need persistence return stub responses or errors accordingly.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Next.js dev server |
| `npm run build` / `start` | Production build |
| `npm run lint` | ESLint |
| `npm run db:generate` | `prisma generate` |
| `npm run db:push` | Push schema (dev) |
| `npm run db:migrate` | Create/apply migrations |
| `npm run db:seed` | Seed demo catalogue + ops data |

## API

| Endpoint | Notes |
| --- | --- |
| `GET /api/health` | Liveness + integration flags |
| `GET /api/services` | Services, routes, destinations, FAQs, fleet |
| `GET/POST /api/bookings` | List / create bookings (price snapshot + availability) |
| `POST /api/bookings/quote` | Catalogue quote (EUR/ISK; legacy USD snapshots still readable) |
| `POST /api/bookings/availability` | Driver/vehicle overlap check |
| `GET/PATCH /api/bookings/[ref]` | Booking detail + admin status/assign |
| `GET /api/drivers` | Driver roster |
| `GET /api/company` | CMS company profile (null contacts until set) |
| `GET /api/integrations` | Live credential status |
| `GET/POST /api/admin/services` · `PATCH/DELETE …/[id]` | Services CRUD |
| `GET/POST /api/admin/routes` · `PATCH …/[id]` | Routes CRUD |
| `GET/POST /api/admin/pricing` | Extras + exchange rate + vehicle upgrades |
| `GET /api/admin/payments` | Payments list |
| `POST /api/payments/checkout` | Create booking (optional) + Teya hosted session / demo path |
| `POST /api/payments/webhook/teya` | Payment status sync (no card data) |
| `POST /api/maps/geocode` | Google geocode stub (fails clearly if unset) |
| `POST/DELETE /api/driver/auth` | Demo driver login cookie (`ari.driver@example.local`) |
| `GET /api/driver/me` · `GET/PATCH /api/driver/bookings` | Assigned jobs + journey status advances |
| `GET/POST /api/auth/demo` | Demo staff / guest messaging session cookies |
| `GET/POST /api/messages` · `GET/PATCH /api/messages/[ref]` | Booking-linked threads (polling ~4s); staff or guest email gate |
| `GET/PATCH /api/admin/company` | Company CMS incl. `whatsappE164` (null until set — never invented) |

### Driver & messaging notes

- Driver portal is **ops-only**: acknowledge → en route → in progress → completed. No admin catalogue powers. Double-assign conflicts reuse availability checks.
- Messaging is **in-app** with HTTP polling (not claimed as WhatsApp Business API sync). Conversations are keyed to booking refs.
- WhatsApp buttons use `CompanySettings.whatsappE164` when set; otherwise `wa.me/?text=…` with booking ref only (no fake number).

### Teya env keys (required for live card checkout)

| Variable | Purpose |
| --- | --- |
| `TEYA_CLIENT_ID` | OAuth client id |
| `TEYA_CLIENT_SECRET` | OAuth client secret |
| `TEYA_STORE_ID` | Store UUID |
| `TEYA_ENVIRONMENT` | `sandbox` or `production` |
| `TEYA_WEBHOOK_SECRET` | Optional webhook HMAC |

Staging API: `https://api.teya.xyz` · OAuth: `https://id.teya.xyz/oauth/v2/oauth-token`

## Project layout

```
src/app/                 # Next.js routes + API
src/components/screens/  # Magic Patterns screens (ported)
src/components/site/     # Shared chrome (header, footer, tabs, sheets)
src/lib/design/          # Design tokens data / i18n / ops helpers
src/lib/payments/        # Pluggable payments (Teya first)
src/lib/maps/            # Google Maps helpers
prisma/                  # Schema + seed
design-src/              # Faithful Magic Patterns export (reference)
public/brand/            # Official logos
```

## Seed data

`prisma/seed.ts` loads catalogue and ops demo records aligned with the Magic Patterns shared data. Company contact/legal fields are explicitly left empty. Demo driver emails use `@example.local` only.

## Deploy notes (Vercel)

Repo layout is a **single Next.js app at the repository root** (`package.json`, `next.config.ts`, `src/app`). It is **not** a monorepo — Root Directory in Vercel must be `.` / empty (not `apps/…`).

1. Import `venzorah/iceland-taxi` with the **Vercel GitHub App** installed for this repo (team `padicheck-7557` already has a linked project `iceland-taxi`).
2. Framework preset: **Next.js**. Build uses `prisma generate && next build` (see `vercel.json`).
3. Set **Node.js 20+**.
4. Environment variables in the Vercel project (do not commit secrets):
   - `DATABASE_URL` — Postgres connection string (required for live booking/admin persistence; UI still boots without it)
   - `NEXT_PUBLIC_APP_URL` — public site URL (payment return links)
   - Optional: `GOOGLE_MAPS_API_KEY`, `TEYA_CLIENT_ID`, `TEYA_CLIENT_SECRET`, `TEYA_STORE_ID`, `TEYA_ENVIRONMENT`, `TEYA_WEBHOOK_SECRET`
5. After first deploy, open Admin and set company contact fields (phone/email/WhatsApp/address) — never invent them in code.
6. If a deployment fails with a React Server Components / Next security gate, upgrade `next` to a patched release (see Vercel automated CVE PRs) before redeploying.

Local production check: `npm run build && npm start`.

## License

Private — Iceland Taxi Booking.
