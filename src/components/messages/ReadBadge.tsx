export function ReadBadge({ state }: { state?: 'read' | 'unread' | null }) {
  if (state !== 'read' && state !== 'unread') return null
  const unread = state === 'unread'
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${unread ? 'bg-primary text-on-primary' : 'bg-surface text-muted'}`}>
      {unread ? 'Unread' : 'Read'}
    </span>
  )
}
