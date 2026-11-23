'use client'
import { useState } from 'react'
import { matchesAdminSearch } from '@/lib/admin/list-search'
import { adminInput } from './AdminUI'
export type ListOption = { value: string; label: string }
export function ListSearch({ query, onQuery, filter, onFilter, options = [], label = 'records' }: { query: string; onQuery: (value: string) => void; filter?: string; onFilter?: (value: string) => void; options?: ListOption[]; label?: string }) {
  return <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-bg p-4"><label className="min-w-0 flex-1 text-xs font-semibold text-muted">Search {label}<input type="search" aria-label={`Search ${label}`} value={query} onChange={e => onQuery(e.target.value)} placeholder={`Search ${label}…`} className={adminInput} /></label>{onFilter && <label className="min-w-40 text-xs font-semibold text-muted">Filter<select aria-label={`Filter ${label}`} value={filter} onChange={e => onFilter(e.target.value)} className={adminInput}><option value="">All</option>{options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>}{(query || filter) && <button type="button" onClick={() => { onQuery(''); onFilter?.('') }} className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold">Clear</button>}</div>
}
export function useAdminList<T>(rows: T[], text: (row: T) => string, status: (row: T) => string, options: ListOption[], label: string) {
  const [query, setQuery] = useState(''), [filter, setFilter] = useState(''), [page, setPage] = useState(0)
  const filtered = rows.filter(row => matchesAdminSearch(query, text(row)) && (!filter || status(row) === filter))
  const last = Math.max(0, Math.ceil(filtered.length / 12) - 1), current = Math.min(page, last)
  const controls = <ListSearch query={query} onQuery={value => { setQuery(value); setPage(0) }} filter={filter} onFilter={value => { setFilter(value); setPage(0) }} options={options} label={label} />
  const pagination = <div className="my-4 flex flex-wrap items-center justify-between gap-3 text-sm"><p className="text-muted">{filtered.length ? `${current * 12 + 1}–${Math.min((current + 1) * 12, filtered.length)} of ${filtered.length}` : 'No matching records'}{rows.length !== filtered.length ? ` · ${rows.length} loaded` : ''}</p><div className="flex gap-2"><button type="button" disabled={current === 0} onClick={() => setPage(current - 1)} className="rounded-xl border border-line px-3 py-2 disabled:opacity-40">Previous</button><button type="button" disabled={current === last} onClick={() => setPage(current + 1)} className="rounded-xl border border-line px-3 py-2 disabled:opacity-40">Next</button></div></div>
  return { visible: filtered.slice(current * 12, (current + 1) * 12), controls, pagination, filteredCount: filtered.length }
}
export const publicationOptions = [{ value: 'published', label: 'Published / active' }, { value: 'hidden', label: 'Hidden / inactive' }]
