'use client'
import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { useSiteSession } from '@/components/providers/SessionProvider'
import type { CatalogueRestorePlan } from '@/lib/catalogue/restore'
import { AdminButton, AdminModal, AdminNotice, AdminToggle, adminRequest, useAdminConfirm } from './AdminUI'

const fieldLabels: Record<string, string> = { titleEn: 'Name', slug: 'Page identifier', kind: 'Category', fromIsk: 'Fixed price (ISK)', hoursLabel: 'Duration', paxLabel: 'Passengers', blurbEn: 'Description', imageUrl: 'Photo', sortOrder: 'Display order', active: 'Published', serviceId: 'Transfer category', fromLabel: 'Pickup', toLabel: 'Destination', minutes: 'Duration (minutes)', km: 'Distance (km)', returnTrip: 'Return trips', value: 'Content' }

export function ReferenceCatalogueRestore({ onRestored }: { onRestored: () => Promise<void> }) {
  const { user } = useSiteSession()
  const confirm = useAdminConfirm()
  const [plan, setPlan] = useState<CatalogueRestorePlan | null>(null)
  const [notice, setNotice] = useState('')
  const [restoreRate, setRestoreRate] = useState(true)
  const [busy, setBusy] = useState(false)
  if (user?.role !== 'SUPER_ADMIN') return null
  const preview = async () => {
    setBusy(true)
    try {
      const data = await adminRequest<{ plan: CatalogueRestorePlan }>('/api/admin/catalogue/restore')
      setNotice(''); setPlan(data.plan); setRestoreRate(true)
    } finally { setBusy(false) }
  }
  const apply = async () => {
    if (!plan || !await confirm({ title: 'Restore the reference catalogue?', description: `${plan.actions.length} catalogue/content changes will be saved. ${restoreRate && plan.rateNeedsRestore ? 'The EUR rate will be set to 150 ISK per EUR for catalogue displays and new quotes. ' : 'Your current exchange rate will be kept. '}Existing booking and payment amounts are retained.`, confirmLabel: 'Restore catalogue' })) return
    setBusy(true)
    try {
      const result = await adminRequest<{ changed: number; rateRestored: boolean; plan: CatalogueRestorePlan }>('/api/admin/catalogue/restore', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ fingerprint: plan.fingerprint, restoreExchangeRate: restoreRate }) })
      setPlan(result.plan)
      setNotice(`Catalogue restored: ${result.changed} changes saved.${result.rateRestored ? ' Reference EUR rate restored.' : ''}`)
      window.dispatchEvent(new Event('itb-site-content-updated'))
      await onRestored()
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Could not restore the catalogue. Refresh the preview and try again.') }
    finally { setBusy(false) }
  }
  const hasChanges = !!plan && (plan.actions.length > 0 || (restoreRate && plan.rateNeedsRestore))
  return <>
    <AdminButton type="button" pendingLabel="Preparing preview…" onClick={preview} className="inline-flex items-center gap-2 rounded-xl border border-line bg-bg px-4 py-2.5 text-sm font-semibold text-heading"><RotateCcw size={16} /> Restore reference catalogue</AdminButton>
    {plan && <AdminModal title="Restore reference catalogue" busy={busy} onClose={() => setPlan(null)}><div className="space-y-5">
      <p className="text-sm leading-relaxed text-muted">Restore the tours, airport transfers and private-driver offer shown in the approved site reference. Existing listings, custom prices and published status are preserved. Missing descriptions, photos and duration labels are filled in.</p>
      <AdminNotice message={notice} />
      {plan.conflicts.map(conflict => <p role="alert" key={conflict} className="rounded-xl bg-error/10 p-3 text-sm text-error">{conflict}</p>)}
      {!!plan.warnings.length && <div className="rounded-xl border border-line p-4"><h3 className="text-sm font-bold">Kept as configured</h3><ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-muted">{plan.warnings.map(warning => <li key={warning}>{warning}</li>)}</ul></div>}
      <div className="rounded-xl border border-line p-4"><h3 className="text-sm font-bold">EUR display rate</h3><p className="my-2 text-sm text-muted">Current: {plan.currentEurRate ?? 'not saved'} ISK per EUR. The reference uses 150 ISK per EUR. This affects new quotes, never amounts on existing bookings.</p><AdminToggle label="Use the reference EUR rate (150)" disabled={busy || !plan.rateNeedsRestore} checked={restoreRate || !plan.rateNeedsRestore} onChange={setRestoreRate} /></div>
      <div><h3 className="mb-2 text-sm font-bold">{plan.actions.length ? `${plan.actions.length} changes to review` : 'Reference records are already present'}</h3><ul className="divide-y divide-line rounded-xl border border-line">{plan.actions.map(action => <li key={`${action.model}:${action.id}`}><details className="p-3"><summary className="cursor-pointer text-sm font-semibold">{action.operation === 'create' ? 'Add' : 'Update'} · {action.label}</summary><dl className="mt-3 space-y-2 text-xs">{action.changes.map(change => <div key={change.field} className="grid gap-1"><dt className="font-semibold text-muted">{fieldLabels[change.field] || change.field}</dt><dd className="break-words text-heading">{change.before === null ? 'Not set' : String(change.before)} → {String(change.after)}</dd></div>)}</dl></details></li>)}</ul></div>
      <div className="flex flex-wrap justify-end gap-3 border-t border-line pt-4"><AdminButton type="button" disabled={busy} onClick={preview} className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold">Refresh preview</AdminButton><AdminButton type="button" disabled={busy || !hasChanges || !!plan.conflicts.length} onClick={apply} pendingLabel="Restoring catalogue…" className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-on-primary">Restore catalogue</AdminButton></div>
    </div></AdminModal>}
  </>
}
