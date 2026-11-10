import { cookies } from 'next/headers'

import { jsonError } from '@/lib/api'
import { DRIVER_COOKIE, STAFF_COOKIE } from '@/lib/auth/demo'
import { adminScreenAccess } from '@/lib/auth/admin-screen'

export { adminScreenAccess }

/** A signed-in driver without a staff session cannot change admin records. */
export async function rejectDriverOnly() {
  const jar = await cookies()
  const access = adminScreenAccess({
    staff: jar.get(STAFF_COOKIE)?.value === '1',
    driver: Boolean(jar.get(DRIVER_COOKIE)?.value),
  })
  if (access === 'driver-blocked') return jsonError(403, 'FORBIDDEN', 'Drivers cannot use admin.')
  return null
}
