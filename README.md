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
| `/driver` | Driver portal |

All phone layouts follow a native mobile app feel (touch targets, bottom tabs, safe areas).

## Stack

- **App:** Next.js 15 (App Router), React, TypeScript, Tailwind CSS
- **DB:** PostgreSQL + Prisma
- **Maps:** Google Maps (`GOOGLE_MAPS_API_KEY`)
- **Payments:** Teya first, pluggable provider layer (`src/lib/payments`)
- **i18n:** English (default) + Icelandic
- **Currencies:** USD + ISK
- **Theme:** Light default; Dark fully supported

Brand colours: Deep Navy `#061B3A`, Vibrant Yellow `#FFC400`, Emerald Mint `#00CFA5`, Cyan Blue `#00AEEF`.

## Hard rules

- **Do not invent** company phone, email, address, registration, VAT, testimonials, or fleet ownership claims. Those fields live in `CompanySettings` / Admin CMS and stay `null` until set.
- Services, prices, routes, vehicles, and theme defaults come from the database (seed for demo). Historical booking amounts are snapshotted on the booking row.
- Integrations without credentials **fail clearly** — Teya checkout still creates bookings as **Awaiting Payment** (demo path) when credentials are missing; card PANs are never stored.

## Booking & payments

Guest checkout on `/book` creates a snapshotted booking (USD for international visitors; ISK or USD for residents), runs driver/vehicle availability checks, then:

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
| `POST /api/bookings/quote` | Catalogue quote (USD/ISK) |
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

## Deploy notes

- Frontend + API: Vercel (or any Node host for Next.js)
- Database: managed Postgres
- Set all secrets in the host env — never commit `.env`
- Configure company contact details in Admin after deploy

## License

Private — Iceland Taxi Booking.
