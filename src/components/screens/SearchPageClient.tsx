'use client'
import { ResponsivePhoto } from '@/components/site/ResponsivePhoto'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { SearchX, ArrowRight } from 'lucide-react'
import { BookingSearch, type SearchPayload } from './homepage/BookingSearch'
import { usePublishedListings } from '@/components/booking/usePublishedListings'
import { SiteHeader } from '@/components/site/SiteHeader'
import { SiteFooter } from '@/components/site/SiteFooter'
import { usePublicChrome } from './public/usePublicChrome'
import { catalogueResults } from '@/lib/booking/catalogue-search'
import { listingLabel, listingsForCustomers, passengerChoices } from '@/lib/booking/listings'
import { formatPrice, SERVICE_CATEGORIES } from '@/lib/design/data'

export function SearchPageClient() {
  const c = usePublicChrome(), params = useSearchParams()
  const { listings, error, retry } = usePublishedListings()
  const category = (params.get('category') === 'custom' || SERVICE_CATEGORIES.some(item => item.id === params.get('category'))) ? params.get('category')! : 'airport'
  const count = (key: string, fallback: number, min: number) => { const n = Number(params.get(key) ?? fallback); return Number.isInteger(n) && n >= min && n <= 16 ? n : fallback }
  const initial: SearchPayload = { category, pickup: params.get('pickup') || '', destination: params.get('destination') || '', date: params.get('date') || '', time: params.get('time') || '', passengers: count('passengers', 1, 1), luggage: count('luggage', 0, 0) }
  const results = listingsForCustomers(catalogueResults(listings || [], initial))
  const search = (form: SearchPayload) => c.go(`/search?${new URLSearchParams({ category: form.category, pickup: form.pickup, destination: form.destination, date: form.date, time: form.time, passengers: String(form.passengers), luggage: String(form.luggage) })}`)
  return <div className={`${c.theme === 'dark' ? 'dark' : ''} min-h-screen bg-bg text-heading`}>
    <SiteHeader {...c} mobileTitle="Search journeys" onMobileBack={c.onHome} />
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="mb-3 font-display text-3xl font-bold sm:text-4xl">Find your next journey</h1>
      <p className="mb-6 text-sm text-muted">Explore our published routes and services. Final availability is checked when you book.</p>
      <BookingSearch key={params.toString()} language={c.language} initial={initial} onSearch={search} />
      <section className="mt-10" aria-live="polite" aria-busy={listings === null}>
        {listings === null ? <p role="status" className="rounded-2xl border border-line p-8">Loading published journeys…</p> : error ? <div role="alert" className="rounded-2xl border border-line p-8"><p>{error}</p><button onClick={retry} className="mt-4 rounded-full bg-primary px-6 py-3 font-bold text-on-primary">Retry</button></div> : <>
          <h2 className="mb-5 text-xl font-bold">{results.length} {results.length === 1 ? 'result' : 'results'}</h2>
          {results.length ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{results.map(item => {
            const href = `/book?${new URLSearchParams({ listing: item.id, kind: item.kind, date: initial.date, time: initial.time, passengers: String(initial.passengers), luggage: String(initial.luggage) })}`
            return <article key={`${item.kind}:${item.id}`} className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-line bg-card">
              {item.imageUrl && <ResponsivePhoto src={item.imageUrl} alt="" className="h-48 w-full object-cover" />}
              <div className="flex flex-1 flex-col p-6"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{SERVICE_CATEGORIES.find(category => category.id === item.category)?.label || 'Journey'}</p><h3 className="text-xl font-bold">{listingLabel(item)}</h3>{item.blurb && <p className="mt-3 text-sm leading-relaxed text-muted">{item.blurb}</p>}<p className="my-4 text-sm text-muted">{[item.hoursLabel, item.km ? `${item.km} km` : null, item.paxLabel].filter(Boolean).join(' · ')}</p><div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4"><div>{(listings ? passengerChoices(listings, item) : []).length > 1 ? (listings ? passengerChoices(listings, item) : []).map((choice) => <p key={choice.id} className="text-sm font-bold">{choice.label} · {formatPrice(choice.fromIsk, c.currency, item.iskPerEur)}</p>) : <p className="text-xl font-bold">{formatPrice(item.fromIsk, c.currency, item.iskPerEur)}</p>}</div><Link href={href} className="inline-flex items-center gap-2 rounded-full bg-navy px-5 py-3 text-sm font-bold text-white">Book journey <ArrowRight size={16} /></Link></div></div>
            </article>
          })}</div> : <div className="rounded-2xl border border-line bg-card px-6 py-12 text-center"><SearchX className="mx-auto mb-4 text-muted" size={36} /><h3 className="text-xl font-bold">No matching journeys</h3><p className="mx-auto mt-3 max-w-md text-sm text-muted">Try another published pickup, destination or service category. Leave the locations blank to browse that category.</p></div>}
        </>}
      </section>
    </main>
    <SiteFooter />
  </div>
}
