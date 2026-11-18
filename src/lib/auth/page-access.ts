import { redirect } from 'next/navigation'
import { getCurrentUser, isStaffRole } from './session'
import { portalNavigation } from './portal-navigation'
export async function requirePortal(portal: 'staff' | 'driver' | 'customer') {
  const user = await getCurrentUser()
  const loginPath = portal === 'staff' ? '/admin-login' : portal === 'driver' ? '/driver-login' : '/login'
  if (!user) redirect(loginPath)
  const staff = isStaffRole(user.role) && user.staffProfile?.active !== false
  if (portal === 'customer' && (staff || user.role === 'DRIVER')) redirect(portalNavigation(user.role).href)
  if ((portal === 'staff' && !staff) || (portal === 'driver' && user.role !== 'DRIVER') || (portal === 'customer' && user.role !== 'CUSTOMER')) {
    redirect(`${loginPath}?error=access`)
  }
  return user
}
