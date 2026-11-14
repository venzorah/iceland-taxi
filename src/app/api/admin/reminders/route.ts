import { z } from 'zod'
import { apiHandler, jsonError, jsonOk, prisma } from '@/lib/api'
import { rejectDriverOnly } from '@/lib/auth/admin-access'
import { ensureTripReminders, parseReminderInput, presentReminder } from '@/lib/email/reminder-settings'

const rowSchema = z.object({
  amount: z.number(),
  unit: z.enum(['hours', 'days', 'weeks']),
  active: z.boolean(),
})

async function handleGET() {
  const blocked = await rejectDriverOnly('reminders')
  if (blocked) return blocked
  if (!process.env.DATABASE_URL) return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL required')
  try {
    await ensureTripReminders()
    const rows = await prisma.tripReminder.findMany({ orderBy: { offsetMinutes: 'desc' } })
    return jsonOk({
      ok: true,
      reminders: rows.map((row) => presentReminder(row.offsetMinutes, row.active, row.id)),
    })
  } catch (error) {
    console.error(error)
    return jsonError(503, 'DATABASE_ERROR', 'Could not load reminder times. Check DATABASE_URL.')
  }
}

async function handlePUT(req: Request) {
  const blocked = await rejectDriverOnly('reminders')
  if (blocked) return blocked
  if (!process.env.DATABASE_URL) return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL required')
  const parsed = z.object({ reminders: z.array(rowSchema).max(12) }).safeParse(await req.json().catch(() => null))
  if (!parsed.success) return jsonError(400, 'VALIDATION_ERROR', 'Check each reminder time.')
  const next: { offsetMinutes: number; active: boolean; sortOrder: number }[] = []
  const seen = new Set<number>()
  for (const row of parsed.data.reminders) {
    const result = parseReminderInput(row)
    if (!result.ok) return jsonError(400, 'VALIDATION_ERROR', result.message)
    if (seen.has(result.offsetMinutes)) return jsonError(400, 'VALIDATION_ERROR', 'Two reminders use the same time.')
    seen.add(result.offsetMinutes)
    next.push({ offsetMinutes: result.offsetMinutes, active: result.active, sortOrder: next.length })
  }
  try {
    await prisma.$transaction([
      prisma.tripReminder.deleteMany(),
      ...(next.length
        ? [prisma.tripReminder.createMany({ data: next })]
        : []),
    ])
    const rows = await prisma.tripReminder.findMany({ orderBy: { offsetMinutes: 'desc' } })
    return jsonOk({
      ok: true,
      reminders: rows.map((row) => presentReminder(row.offsetMinutes, row.active, row.id)),
    })
  } catch (error) {
    console.error(error)
    return jsonError(503, 'DATABASE_ERROR', 'Could not save reminder times. Check DATABASE_URL.')
  }
}

export const GET = apiHandler(handleGET)
export const PUT = apiHandler(handlePUT)
