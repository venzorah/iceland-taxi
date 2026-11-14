import { rejectDriverOnly } from '@/lib/auth/admin-access'
import { apiHandler, jsonError, jsonOk, prisma } from '@/lib/api'
import { enquiryFollowUp, type EnquiryChannelName } from '@/lib/booking/enquiry'

async function handleGET() {
  const blocked = await rejectDriverOnly('enquiries')
  if (blocked) return blocked
  if (!process.env.DATABASE_URL) return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL required')
  try {
    const rows = await prisma.enquiry.findMany({ orderBy: { createdAt: 'desc' }, take: 200 })
    const enquiries = rows.map((row) => {
      const channel = row.channel as EnquiryChannelName
      const followUp = enquiryFollowUp({
        channel,
        email: row.email,
        phone: row.phone,
        name: row.name,
        fromLabel: row.fromLabel,
        toLabel: row.toLabel,
      })
      return { ...row, followUp }
    })
    return jsonOk({ ok: true, enquiries })
  } catch (error) {
    console.error(error)
    return jsonError(503, 'DATABASE_ERROR', 'Could not load enquiries')
  }
}

export const GET = apiHandler(handleGET)
