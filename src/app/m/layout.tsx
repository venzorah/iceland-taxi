import { AdminInteractions } from '@/components/admin/AdminUI'
import { requirePortal } from '@/lib/auth/page-access'
export default async function Layout({ children }: { children: React.ReactNode }) {
  await requirePortal('staff')
  return <AdminInteractions>{children}</AdminInteractions>
}
