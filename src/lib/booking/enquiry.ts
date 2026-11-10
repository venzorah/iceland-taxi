import { OFFICIAL_WHATSAPP_E164 } from '@/lib/whatsapp'

export type EnquiryChannelName = 'EMAIL' | 'WHATSAPP'

export function enquiryFollowUp(input: {
  channel: EnquiryChannelName
  email: string
  phone: string
  name: string
  fromLabel: string
  toLabel: string
}) {
  if (input.channel === 'EMAIL') {
    const subject = encodeURIComponent('Iceland Taxi Booking enquiry')
    const body = encodeURIComponent(
      `Hello ${input.name},\n\nAbout your trip from ${input.fromLabel} to ${input.toLabel}.\n`,
    )
    return {
      channel: 'EMAIL' as const,
      label: 'Email',
      href: `mailto:${input.email.trim()}?subject=${subject}&body=${body}`,
    }
  }
  const digits = input.phone.replace(/\D/g, '')
  const text = encodeURIComponent(
    `Hello ${input.name}, this is Iceland Taxi Booking about your trip from ${input.fromLabel} to ${input.toLabel}.`,
  )
  return {
    channel: 'WHATSAPP' as const,
    label: 'WhatsApp',
    href: digits ? `https://wa.me/${digits}?text=${text}` : null,
  }
}

/** Customer follow-up must not open the company WhatsApp number. */
export function followUpTargetsCustomer(href: string | null, customerPhone: string) {
  if (!href) return false
  const companyDigits = OFFICIAL_WHATSAPP_E164.replace(/\D/g, '')
  const customerDigits = customerPhone.replace(/\D/g, '')
  if (!customerDigits || customerDigits === companyDigits) return !href.includes(companyDigits)
  return href.includes(customerDigits) && !href.includes(companyDigits)
}
