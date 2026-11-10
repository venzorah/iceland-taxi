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
- Integrations without credentials **fail clearly** (HTTP 503 + message) — they never fake success.

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

## API stubs

| Endpoint | Notes |
| --- | --- |
| `GET /api/health` | Liveness + integration flags |
| `GET /api/services` | Services, routes, destinations, FAQs, fleet |
| `GET/POST /api/bookings` | List / create bookings |
| `GET /api/drivers` | Driver roster |
| `GET /api/company` | CMS company profile (null contacts until set) |
| `GET /api/integrations` | Live credential status |
| `POST /api/payments/checkout` | Teya checkout (fails clearly if unset) |
| `POST /api/maps/geocode` | Google geocode stub (fails clearly if unset) |

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
