import { ensureOfficialWhatsApp } from '@/lib/company-whatsapp'
import { prisma } from '@/lib/prisma'
import { planStaffWhatsApp } from '@/lib/whatsapp'
import { cloudSender, sendWhatsAppCloudText } from '@/lib/whatsapp-cloud'

/**
 * Customer in-app message → staff notification.
 * With a company number and no Cloud API credentials, staff get a deep link.
 * With credentials, the same short notice is sent. The private message body is never included.
 * The company number defaults to +3548353111 when the setting is empty.
 */
export async function notifyStaffWhatsApp(input: { bookingRef: string; messageId: string }) {
  const companyE164 = await ensureOfficialWhatsApp()
  const cloud = cloudSender()
  const plan = planStaffWhatsApp({
    bookingRef: input.bookingRef,
    companyE164,
    cloudConfigured: cloud.configured,
    notifyE164: cloud.notifyE164,
  })
  if (!plan.enabled || !plan.notice) {
    return { enabled: false as const, delivery: 'off' as const, whatsappUrl: null, notice: null, detail: plan.detail }
  }

  let delivery: 'link' | 'sent' | 'failed' = 'link'
  let detail = plan.detail
  if (plan.delivery === 'api' && cloud.token && cloud.phoneNumberId && plan.recipient) {
    const sent = await sendWhatsAppCloudText({
      token: cloud.token,
      phoneNumberId: cloud.phoneNumberId,
      version: cloud.version,
      to: plan.recipient,
      body: plan.notice,
    })
    delivery = sent.ok ? 'sent' : 'failed'
    detail = sent.detail
  }

  try {
    await prisma.staffNotification.create({
      data: {
        bookingRef: input.bookingRef,
        messageId: input.messageId,
        notice: plan.notice,
        whatsappUrl: plan.whatsappUrl,
        delivery,
        deliveryDetail: detail,
      },
    })
  } catch (error) {
    console.error('staff notification', error)
  }

  return { enabled: true as const, delivery, whatsappUrl: plan.whatsappUrl, notice: plan.notice, detail }
}
