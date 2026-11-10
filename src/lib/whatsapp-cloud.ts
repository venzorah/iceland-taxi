import { whatsappCloudCredentials } from '@/lib/env'

/** Outbound WhatsApp Cloud API text. Does not import or sync inbound chats. */
export async function sendWhatsAppCloudText(input: {
  token: string
  phoneNumberId: string
  version: string
  to: string
  body: string
}) {
  const to = input.to.replace(/\D/g, '')
  const version = /^v\d+\.\d+$/.test(input.version) ? input.version : 'v21.0'
  const phoneNumberId = input.phoneNumberId.replace(/[^\d]/g, '')
  if (!to || !phoneNumberId || !input.token) {
    return { ok: false as const, detail: 'WhatsApp Cloud API credentials are incomplete' }
  }
  try {
    const res = await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { preview_url: false, body: input.body },
      }),
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return { ok: false as const, detail: `WhatsApp Cloud API returned HTTP ${res.status}` }
    return { ok: true as const, detail: 'Outbound notice sent. Inbound WhatsApp is not synced.' }
  } catch {
    return { ok: false as const, detail: 'WhatsApp Cloud API request failed' }
  }
}

export function cloudSender() {
  return whatsappCloudCredentials()
}
