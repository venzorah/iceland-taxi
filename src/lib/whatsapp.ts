/** Build a wa.me deep link. Never invent a company number — omit path when unset. */
export function whatsappHref(opts: {
  e164?: string | null
  text?: string
}) {
  const digits = (opts.e164 || '').replace(/\D/g, '')
  const q = opts.text ? `?text=${encodeURIComponent(opts.text)}` : ''
  if (!digits) {
    // No company WhatsApp configured — still allow opening WhatsApp with prefilled text only.
    return `https://wa.me/${q}`
  }
  return `https://wa.me/${digits}${q}`
}

export function bookingWhatsAppText(ref: string, extra?: string) {
  return extra || `Hello Iceland Taxi Booking, about booking ${ref}`
}
