/** OS / push text. Booking reference only — never the private message body. */
export function messageAlertCopy(bookingRef: string, href: string) {
  return {
    title: 'Iceland Taxi Booking',
    body: `New message on ${bookingRef}`,
    url: href,
  }
}
