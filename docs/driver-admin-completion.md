# Driver and admin implementation checkpoint

Updated 13 November 2026. Supabase Auth/PostgreSQL and the agreed local development workflow remain unchanged. No database reset, provider migration or additional schema migration was performed for this phase.

## Driver

Implemented:

- Active verified drivers see only their assigned journeys and real empty states. Removed demo sign-in/sample email from the active portal.
- Automatic foreground refresh with bounded polling/backoff; failed refreshes retain existing jobs and show an error. Drivers can select other assignments. Journey dates/times use Iceland time.
- Assignment acknowledgement → en route → passenger picked up → completed. Requests carry the displayed state; repeat requests do not skip a step. Serializable transactions handle status, ownership, overlap checks and driver availability together.
- Only one en-route/in-progress journey per driver. Closed/payment-review trips have no driving action. Completed and cancelled/reviewed trips are separated from actionable assignments.
- Name/phone and availability save to the database. Drivers cannot set their own role, assignments or approval. Availability cannot change during an active journey.
- Private driver–operations messages use the existing Message table with `channel=driver_ops`. Customer message lists, reads, counts and alerts exclude this channel. Assigned active drivers and operations staff can read/reply; reassignment or deactivation removes former driver access. Driver messages have independent unread state from the customer conversation.
- Operations can select the assigned-driver conversation from admin Messages. Open-tab alerts work through existing controls; actual handset/background delivery still needs device testing.

Verification completed:

- Temporary Supabase integration run passed ownership/role isolation, simultaneous/repeated requests, every trip step, busy-driver lock, history, contact persistence, private messaging, unread alerts, reassignment and deactivation. Temporary identities and records were removed.
- Headless driver browser checks passed mobile/desktop viewport fit, real job display, account controls and mobile sign-out. A later API run after the browser checks was interrupted by an intermittent authentication failure; it does not replace the earlier complete API pass.

Driver onboarding: add the email/profile in admin first, then register/verify that same email through the existing sign-in flow. A verified identity claims the provisioned driver role; registration does not accept a driver role supplied by the browser. Auth confirmation/reset email delivery remains dependent on Supabase SMTP.

## Admin

Implemented:

- Real staff identity and role-based desktop/mobile navigation, using server-equivalent module permissions. Finance starts at payments; content starts at services. Unknown/nonstaff roles do not receive a Super Admin menu.
- `/admin` and `/m` now use the same responsive admin implementation. The previous separate mobile prototype remains as unused source; it is not the active `/m` entry point.
- Database overview with actual today's Iceland journeys, driver states, conversations and booking counts/values. Removed sample weekly revenue bars and fictitious unread counts. Saved booking values are labelled separately from settled revenue and kept separate by currency.
- Workspace responses are projected by permitted section. A finance report request does not return customer/company records. Operational messages require booking-operations permission rather than any staff role.
- Booking search and foreground refresh. Selected edit snapshots are retained while polling so unsaved edits are not repeatedly reset. Driver selection uses database IDs rather than names; notes preserve saved values.
- Assignment updates use serializable availability checks, active-driver/vehicle/capacity validation, stale-status guards, and closed/in-progress assignment locks. Driver status remains consistent when staff update a journey.
- Admin cancellation retains booking/payment history. Paid cancellations save refund review, without moving money. The delete endpoint cannot erase booking history.
- Removed the endpoint/UI behavior that marked a payment refunded without a provider refund. Real refund processing is not implemented and must remain unavailable until verified provider integration is added.
- Driver provisioning and catalogue/fleet APIs continue to persist to PostgreSQL. Service/destination image forms now support authenticated server-side Cloudinary uploads, with a 5 MB stream cap, JPEG/PNG/WebP byte/MIME checks, fixed server-owned public IDs and SHA-256 signing. Returned URLs are published when the item is saved; no secrets go to the browser. Asset deletion/orphan cleanup is not implemented.

Cloudinary references: [upload guide](https://cloudinary.com/documentation/upload_images), [authentication signatures](https://cloudinary.com/documentation/authentication_signatures). Credentials were added privately to `.env`; `.env` is ignored by Git. The secret supplied in chat should be rotated and its replacement entered directly in `.env`.

Verification completed:

- 60 automated tests passed across the application (59-test suite plus the added admin assignment rejection test), including driver flow, admin navigation permissions, upload validation/mocked provider behavior, customer ownership and existing regressions.
- TypeScript, lint and final isolated production build passed.
- Temporary admin integration checks passed all five staff role matrices, section data isolation, database overview, and creation of temporary driver/vehicle/service/destination records with protected writes.
- The first positive admin assignment check correctly rejected a test fixture because another fixture had already reserved the same test vehicle. The fixture was corrected locally. The corrected integration rerun and admin browser checks have NOT run.
- All temporary records/identities from the completed/failed integration attempts were removed, and isolated test servers/browser were stopped. Existing application records were preserved.

## Outstanding verification and functionality

Automatic approval review could not complete the corrected external integration rerun because of an account usage limit. The rerun was not executed; this was a review failure, not a finding that the action was unsafe. Do not bypass the review restriction.

When execution is available again:

1. Build with `NEXT_OUTPUT_DIR=.next-portals-final`, start an isolated local server using the same directory with SMTP/WhatsApp/VAPID/Teya/Cloudinary delivery disabled, then run `node scripts/check-admin.mjs <local-origin>`. This verifies corrected assignment, overlap/stale/inactive checks, paid cancellation review, refund protection and retained history.
2. Start isolated Chrome and pass `CHROME_DEBUG_URL` to that script for Super Admin/Finance desktop/mobile/menu checks.
3. Use rotated private Cloudinary credentials to test one real upload and saving/display of its URL. No actual Cloudinary upload has been performed yet. Mocked tests are not proof of account connectivity.
4. Teya merchant checkout/webhook/refund integration, SMTP/Auth email delivery and real handset push delivery remain pending, as recorded in customer-completion.md. No production payment/refund was enabled.
5. Client acceptance of the remaining business/CMS screens is still required. This checkpoint is not a claim that every admin feature or third-party delivery path is production-ready.

Verification scripts must run only against isolated local servers. They create exact, identifiable temporary fixtures and remove those fixtures in `finally`. They do not reset or reseed the database.
