# Iceland Taxi Booking

Production-bound booking platform for **Iceland Taxi Booking** — airport transfers, private taxis, tours, and vacation drivers. Built by KM Consulting & Tech on Next.js with PostgreSQL/Prisma, Google Maps, and Teya payments.

**Designed by:** KM Consulting & Tech

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
- Integrations without credentials **fail clearly**. Checkout without Teya sandbox keys does not mark a booking paid and does not pretend the gateway succeeded. Card numbers are never stored.

## Booking & payments

Guest checkout on `/book` creates a snapshotted booking (EUR for international visitors; ISK or EUR for residents), runs driver/vehicle availability checks, then:

Catalogue prices are stored in ISK. Public euro amounts use `ExchangeRate.iskPerEur` (seed **150** ISK = 1 EUR, admin-editable, not a live FX feed). `iskPerUsd` (seed 138) stays for older USD snapshots. Display: euros as `€153` / `€1.532` (dot thousands); Icelandic amounts as `ISK 22,900` (prefix, comma thousands, no `kr`).

1. **Teya configured** → creates a Hosted Checkout session and redirects to `session_url`.
2. **Teya missing credentials** → keeps the booking as `AWAITING_PAYMENT` and shows a clear demo message (no fake “paid”).
3. **Quotation** → saves as `PENDING` with amount `0` / quote flag.

Webhook: `POST /api/payments/webhook/teya` (RSA, `TEYA_WEBHOOK_PUBLIC_KEY`). Admin desktop `/admin` and mobile `/m` share the same booking/services/routes/pricing/payments APIs.

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

Without `DATABASE_URL`, the UI still runs and list APIs serve the KM Consulting & Tech seed fallback so local UI work is unblocked. Writes that need persistence return stub responses or errors accordingly.

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
| `POST /api/payments/checkout` | Create booking + Teya sandbox hosted session. Missing keys return 503 and do not mark the booking paid |
| `GET /api/payments/teya/return` | Browser return. Confirms via session lookup, then redirects |
| `GET /api/payments/teya/status` | Re-check the latest sandbox session for a booking ref |
| `POST /api/payments/webhook/teya` | `payment.succeeded.v1` only, after RSA signature verification |
| `POST /api/maps/geocode` | Google geocode stub (fails clearly if unset) |
| `POST/DELETE /api/driver/auth` | Demo driver login cookie (`ari.driver@example.local`) |
| `GET /api/driver/me` · `GET/PATCH /api/driver/bookings` | Assigned jobs + journey status advances |
| `GET/POST /api/auth/demo` | Demo staff / guest messaging session cookies |
| `GET/POST /api/messages` · `GET/PATCH /api/messages/[ref]` | Booking-linked threads (polling ~4s). Staff inbox is every customer conversation. `?as=staff` or `?as=customer` chooses which side is marked read. |
| `GET/PATCH /api/admin/notifications` | Staff notices for new customer messages (booking ref and short WhatsApp text, no message body) |
| `GET /api/messages/alerts` | Unread alert ids and booking refs only (no message text) |
| `GET /api/push/config` · `POST /api/push/subscribe` | Optional Web Push. Needs `VAPID_*` |
| `GET/PATCH /api/admin/company` | Company CMS. `whatsappE164` defaults to `+3548353111`. Other contact fields stay empty until set |

### Driver & messaging notes

- Driver portal is **ops-only**: acknowledge → en route → in progress → completed. No admin catalogue powers. Double-assign conflicts reuse availability checks.
- Messaging is **in-app** with HTTP polling. Conversations are keyed to booking refs. This is not WhatsApp inbox sync.
- Admin, booking managers, and staff share one inbox. A conversation stays visible to every message-handling role, including when a driver is assigned to the trip.
- A thread shows **Unread** until that side opens it, then **Read**. The flag is stored on the message row (`unread`). Opening as staff marks customer messages read for the whole staff inbox. Opening as the guest marks staff replies read for that guest. Pass `?as=staff` or `?as=customer` so the correct side is updated.
- Staff replies in chat are shown as **Juliet** (the stored name `Platform Admin` is displayed as Juliet).
- When a customer sends a message, staff get an admin notification and a WhatsApp link to **+3548353111**: booking reference plus “a new message arrived”. The private message is not copied into WhatsApp. That number is the company default (`CompanySettings.whatsappE164`). If the saved value is empty, the app stores it. A different number saved in System settings is kept. Email, phone, and address stay empty until set.
- A real send needs `WHATSAPP_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID` (Meta WhatsApp Cloud API). Optional `WHATSAPP_NOTIFY_E164` is the handset that receives the notice; when empty, the company number is used. Optional `WHATSAPP_API_VERSION` defaults to `v21.0`. Without those credentials the link path is used. Inbound WhatsApp messages are not imported.
- A new message plays `/sounds/message.wav` after the person turns alerts on or taps inside messages, account, admin, or the driver portal. The same event shows an in-app banner. If they allow notifications, a backgrounded tab uses the service worker to put **New message on &lt;booking ref&gt;** at the top of the phone. The private message text is not included and is not cached in the service worker.
- Background delivery when the site is fully closed needs `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT` (`mailto:` or `https:` you control). Without them, sound and notifications still work while the site is open. Generate keys with `npx web-push generate-vapid-keys`. Do not commit the private key.
- Customer and staff WhatsApp links use `CompanySettings.whatsappE164`, which defaults to `+3548353111`.

### Teya sandbox checkout

Checkout charges only the Teya **staging** API (`https://api.teya.xyz`, OAuth `https://id.teya.xyz/oauth/v2/oauth-token`). `TEYA_ENVIRONMENT=production` is rejected and `api.teya.com` is never called. Card numbers are not stored. A booking is marked paid only after `GET /v2/checkout/sessions/{id}` reports `session_status=COMPLETED` and `payment_status=SUCCESS`, or after a signature-valid `payment.succeeded.v1` webhook. The browser return URL is not treated as proof of payment. If the gateway is not called, the API responds with an error and the confirmation screen is not shown.

Teya does not publish shared test merchant credentials. Each development store has its own client id, client secret, and store id.

| Variable | Purpose |
| --- | --- |
| `TEYA_CLIENT_ID` | OAuth client id from the staging Business Portal |
| `TEYA_CLIENT_SECRET` | OAuth client secret (shown once when created) |
| `TEYA_STORE_ID` | Store UUID from the same Integrations screen |
| `TEYA_ENVIRONMENT` | Must be `sandbox` |
| `TEYA_WEBHOOK_PUBLIC_KEY` | PEM public key for `x-teya-signature` (SHA256withRSA). Optional for the return-url lookup; required before a webhook can mark a booking paid |

Where to create them: request a development store with an ecommerce subscription from Teya, then open [business.teya.xyz](https://business.teya.xyz) → the store → Integrations → ecommerce API credentials. Point the webhook at `https://<your-host>/api/payments/webhook/teya` and copy that webhook's public key. Docs: [Hosted Checkout](https://developer.teya.com/online-payments/hosted-checkout/get-started) and [Testing](https://developer.teya.com/online-payments/testing).

Sandbox card that completes without a 3DS challenge: Visa `4427800000180034`, any future expiry, any 3-digit CVC. More cards are on the testing page. These cards do nothing until the three merchant values above are set.

## Project layout

```
src/app/                 # Next.js routes + API
src/components/screens/  # KM Consulting & Tech screens (ported)
src/components/site/     # Shared chrome (header, footer, tabs, sheets)
src/lib/design/          # Design tokens data / i18n / ops helpers
src/lib/payments/        # Pluggable payments (Teya first)
src/lib/maps/            # Google Maps helpers
prisma/                  # Schema + seed
design-src/              # KM Consulting & Tech design export (reference)
public/brand/            # Official logos
```

## Seed data

`prisma/seed.ts` loads catalogue and ops demo records aligned with the KM Consulting & Tech shared data. Company contact/legal fields are explicitly left empty. Demo driver emails use `@example.local` only.

## Deploy notes (Vercel)

Repo layout is a **single Next.js app at the repository root** (`package.json`, `next.config.ts`, `src/app`). It is **not** a monorepo — Root Directory in Vercel must be `.` / empty (not `apps/…`).

1. Import `venzorah/iceland-taxi` with the **Vercel GitHub App** installed for this repo (team `padicheck-7557` already has a linked project `iceland-taxi`).
2. Framework preset: **Next.js**. Build uses `prisma generate && next build` (see `vercel.json`).
3. Set **Node.js 20+**.
4. Environment variables in the Vercel project (do not commit secrets):
   - `DATABASE_URL` — Postgres connection string (required for live booking/admin persistence; UI still boots without it)
   - `NEXT_PUBLIC_APP_URL` — public site URL (payment return links)
   - Optional: `GOOGLE_MAPS_API_KEY`, `TEYA_CLIENT_ID`, `TEYA_CLIENT_SECRET`, `TEYA_STORE_ID`, `TEYA_ENVIRONMENT` (`sandbox` only), `TEYA_WEBHOOK_PUBLIC_KEY`
   - Email: `SMTP_URL`, `MAIL_FROM`, and `CRON_SECRET` (booking, account, enquiry, and trip reminder mail). Admin mail goes to the company email and active staff accounts. Set the company email in admin. Do not invent one.
   - Optional Web Push: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
   - Optional WhatsApp Cloud API (outbound notices only): `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, and optionally `WHATSAPP_NOTIFY_E164`, `WHATSAPP_API_VERSION`
5. After deploy, run `npx prisma db push` so `StaffNotification`, `EditorialPost`, `Enquiry`, booking listing snapshots, announcement link labels, and theme settings exist. The official WhatsApp number is `+3548353111`. Phone, email, address and registration stay empty until set. Do not invent them. Custom enquiries are answered on the customer's email or WhatsApp number. Admin saves for fleet, catalogue, pages, SEO, staff, theme, and refunds need that database.
6. If a deployment fails with a React Server Components / Next security gate, upgrade `next` to a patched release (see Vercel automated CVE PRs) before redeploying.

Local production check: `npm run build && npm start`.

## License

Private — Iceland Taxi Booking.
