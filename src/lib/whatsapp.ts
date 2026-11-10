/** Build a wa.me deep link. Never invent a company number — omit the path when unset. */
export function whatsappHref(opts: {
  e164?: string | null
  text?: string
}) {
  const digits = (opts.e164 || '').replace(/\D/g, '')
  const q = opts.text ? `?text=${encodeURIComponent(opts.text)}` : ''
  if (!digits) {
    return `https://wa.me/${q}`
  }
  return `https://wa.me/${digits}${q}`
}

export function bookingWhatsAppText(ref: string, extra?: string) {
  return extra || `Hello Iceland Taxi Booking, about booking ${ref}`
}

/** Short staff notice. Booking reference only — never the private message body. */
export function staffMessageNotice(bookingRef: string) {
  return `New message on booking ${bookingRef}. A new customer message arrived.`
}

/** International number, or null when the value is empty or not a usable E.164 string. */
export function normalizeStoredE164(value: string | null | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  if (!/^\+?[0-9][0-9\s().-]{6,20}$/.test(trimmed)) return null
  const digits = trimmed.replace(/\D/g, '')
  if (digits.length < 8 || digits.length > 15) return null
  return `+${digits}`
}

export function planStaffWhatsApp(input: {
  bookingRef: string
  companyE164: string | null | undefined
  cloudConfigured: boolean
  notifyE164?: string | null
}) {
  const company = normalizeStoredE164(input.companyE164)
  if (!company) {
    return {
      enabled: false as const,
      delivery: 'off' as const,
      whatsappUrl: null,
      notice: null,
      recipient: null,
      detail: 'Company WhatsApp number is not set',
    }
  }
  const notice = staffMessageNotice(input.bookingRef)
  const whatsappUrl = whatsappHref({ e164: company, text: notice })
  const recipient = normalizeStoredE164(input.notifyE164) || company
  if (!input.cloudConfigured) {
    return {
      enabled: true as const,
      delivery: 'link' as const,
      whatsappUrl,
      notice,
      recipient,
      detail: 'No WhatsApp Cloud API credentials. Staff open the WhatsApp link from the notification.',
    }
  }
  return {
    enabled: true as const,
    delivery: 'api' as const,
    whatsappUrl,
    notice,
    recipient,
    detail: 'WhatsApp Cloud API credentials present. Outbound notice only.',
  }
}

export function describeWhatsAppFeature(input: {
  companyE164: string | null | undefined
  cloudConfigured: boolean
}) {
  const number = normalizeStoredE164(input.companyE164)
  if (!number) {
    return {
      enabled: false,
      mode: 'off' as const,
      number: null as string | null,
      cloudConfigured: input.cloudConfigured,
      note: 'WhatsApp delivery is off. Add the official company WhatsApp number in System settings. No number is invented, and customer messages are not sent to WhatsApp until one is saved.',
    }
  }
  if (!input.cloudConfigured) {
    return {
      enabled: true,
      mode: 'link' as const,
      number,
      cloudConfigured: false,
      note: 'Each new customer message creates a staff notification and a WhatsApp link with the booking reference. The private message is not included. Set WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID on the server to send that notice automatically. Inbound WhatsApp chats are not synced.',
    }
  }
  return {
    enabled: true,
    mode: 'cloud' as const,
    number,
    cloudConfigured: true,
    note: 'Outbound WhatsApp notices are sent when a customer messages. Inbound WhatsApp chats are not synced into this inbox.',
  }
}
