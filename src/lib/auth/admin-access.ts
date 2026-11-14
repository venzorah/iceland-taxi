import { jsonError } from '@/lib/api'
import { getStaffUser } from '@/lib/auth/session'
import { canUseAdminModule } from './permissions'
export { adminScreenAccess } from '@/lib/auth/admin-screen'

/** Compatibility name; requires verified active staff and checks module permission. */
export async function rejectDriverOnly(module?: string) {
  const user = await getStaffUser()
  if (!user) return jsonError(403, 'FORBIDDEN', 'An active staff account is required.')
  if (module && !canUseAdminModule(user.role, module)) return jsonError(403, 'FORBIDDEN', 'Your role does not have access to this module.')
  return null
}
