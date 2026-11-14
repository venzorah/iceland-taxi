import { apiHandler, jsonOk } from '@/lib/api'
import { getCurrentUser, isStaffRole } from '@/lib/auth/session'
async function handleGET() {
  const user = await getCurrentUser()
  return jsonOk({ ok: true, user: user ? { id: user.id, email: user.email, name: user.name, role: user.role } : null,
    staff: !!user && isStaffRole(user.role) && user.staffProfile?.active !== false,
    driver: user?.role === 'DRIVER', guestEmail: user?.role === 'CUSTOMER' ? user.email : null,
    guestName: user?.role === 'CUSTOMER' ? user.name : null,
  }, { headers: { 'Cache-Control': 'private, no-store' } })
}

export const GET = apiHandler(handleGET)
