'use client'
import { AdminPageClient } from './AdminPageClient'
/** Both admin URLs share role checks and data flows, including on phones. */
export function MobileAdminPageClient() { return <AdminPageClient /> }
