# Portal and implementation requirements

- Keep admin, driver, and customer portal links out of the public footer.
- `/admin` remains the direct, protected admin entry point.
- Public navigation provides customer sign-in and reflects verified session state with account access and sign-out.
- Work through the portals one at a time: customers first, drivers second, admins third.
- Implement and test each portal's agreed workflows before moving to the next.

## Customer dashboard verification

- The account dashboard renders only `/api/account/trips` records; no sample trip, driver, flight, price, or payment status is rendered.
- Empty trip tabs offer a working `/book` action. Trip failures show a retry action rather than a fabricated booking.
- Clock/date use the browser's local timezone. The customer explicitly shares their location for city lookup and weather; denied permissions show an unavailable state.
- City lookup uses BigDataCloud's consent-based client endpoint. Forecast data comes from MET Norway with attribution, rounded server coordinates, provider expiry caching, and an identifying company domain. No weather API key is required.
- Each real booking can start a conversation even before the first message. The selected booking determines the thread. Send failures preserve the draft.
- Sound/phone notifications use a switch with permission feedback. Turning off removes the current account's server subscription and unsubscribes the browser. Actual phone delivery requires permission and browser/device Web Push support.
- VAPID public/private keys were generated locally; put them and `VAPID_SUBJECT=https://icelandtaxibooking.is/` in the hosting environment for deployment. Never publish the private key.
- `scripts/check-customer.mjs` exercises temporary customer records against a local test server with outbound notifications disabled, then cleans up its account, bookings, messages, notices, and subscriptions.
