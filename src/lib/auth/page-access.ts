import { redirect } from 'next/navigation'
import { getCurrentUser, isStaffRole } from './session'
export async function requirePortal(portal: 'staff' | 'driver' | 'customer') {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  const staff = isStaffRole(user.role) && user.staffProfile?.active !== false
  if ((portal === 'staff' && !staff) || (portal === 'driver' && user.role !== 'DRIVER') || (portal === 'customer' && user.role !== 'CUSTOMER')) {
    redirect('/login?error=access')
  }
  return user
}
