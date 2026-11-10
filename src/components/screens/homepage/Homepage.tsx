'use client'

import React from 'react'
import { ArrowRight, Clock, Luggage, MessageCircle, Plane, Users } from 'lucide-react'

import { SiteHeader } from '@/components/site/SiteHeader'
import { SiteFooter } from '@/components/site/SiteFooter'
import { SiteTabBar } from '@/components/site/SiteTabBar'
import { AIRPORT_ROUTES, DESTINATIONS, FLEET, IMG, TOURS, formatPrice, type Currency } from '@/lib/design/data'
import { type Lang } from '@/lib/design/i18n'
import type { AnnouncementState } from '@/lib/design/announcements'
import { BookingSearch, type SearchPayload } from './BookingSearch'
import { Faq } from './Faq'
import { HeroCarousel } from './HeroCarousel'

export const args = {
  theme: 'light',
  language: 'en',
  currency: 'EUR',
  showDemoReviews: false,
  autoplay: true,
}

export const argTypes = {
  theme: { control: 'radio', options: ['light', 'dark'] },
  language: { control: 'radio', options: ['en', 'is'] },
  currency: { control: 'radio', options: ['EUR', 'ISK'] },
  showDemoReviews: { control: 'boolean' },
  autoplay: { control: 'boolean' },
}

type Props = Partial<typeof args> & {
  onThemeChange?: (t: 'light' | 'dark') => void
  onLanguageChange?: (l: Lang) => void
  onCurrencyChange?: (c: Currency) => void
  onSearch?: (p: SearchPayload) => void
  onSignIn?: () => void
  onStaff?: () => void
  onStaffMobile?: () => void
  onDriver?: () => void
  onMessages?: () => void
  /** The scrolling announcement bar, managed in Admin → Announcements. */
  announcements?: AnnouncementState
}

export default function Homepage(props: Props) {
  const { theme, language, currency, showDemoReviews, autoplay, onThemeChange, onLanguageChange, onCurrencyChange, onSearch, onSignIn, onStaff, onStaffMobile, onDriver, onMessages, announcements } = { ...args, ...props }
  const th = theme as 'light' | 'dark'
  const lang = language as Lang
  const cur = currency as Currency
  const book = () => onSearch?.({ category: 'airport', pickup: 'Keflavík Airport (KEF)', destination: 'Reykjavík city centre', date: '', time: '', passengers: 2, luggage: 2 })

  return (
    <div className={th === 'dark' ? 'dark' : ''}>
      <div className="bg-bg pb-[calc(5.5rem+env(safe-area-inset-bottom))] font-sans text-text md:pb-0">
        <SiteHeader theme={th} language={lang} currency={cur} onThemeChange={onThemeChange} onLanguageChange={onLanguageChange} onCurrencyChange={onCurrencyChange} onBook={book} onSignIn={onSignIn} announcements={announcements} />
        <div className="page-shell">

        {/* Hero */}
        <HeroCarousel language={lang} autoplay={autoplay} onSearch={onSearch} />

        {/* Booking form overlapping hero */}
        <div className="relative z-10 mx-auto -mt-24 w-full min-w-0 max-w-7xl px-4 sm:-mt-28 sm:px-6 lg:px-8">
          <BookingSearch language={lang} onSearch={onSearch} />
        </div>

        {/* Airport transfers — the primary service */}
        <section className="mx-auto w-full min-w-0 max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8 lg:py-28">
          <div className="grid items-center gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
            <div className="relative hidden overflow-hidden rounded-2xl sm:block">
              <img src={IMG.airport} alt="Chauffeur loading luggage outside Keflavík Airport" className="aspect-[4/3] w-full object-cover" />
            </div>
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold text-mint-text"><Plane size={16} /> Keflavík International Airport</p>
              <h2 className="mt-3 font-display text-2xl font-bold text-heading sm:text-4xl">Airport transfers, met at arrivals</h2>
              <p className="mt-4 text-base leading-relaxed text-muted">
                Private transfers between KEF, Reykjavík, the Blue Lagoon and hotels across the southwest. Add your flight number and your driver follows your arrival time.
              </p>
              <ul className="mt-8 divide-y divide-line border-y border-line">
                {AIRPORT_ROUTES.map((r) => (
                  <li key={r.from + r.to} onClick={book} className="flex cursor-pointer items-center gap-4 py-4 active:bg-surface sm:cursor-auto sm:active:bg-transparent">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-heading">{r.from} → {r.to}</p>
                      <p className="mt-0.5 text-sm text-muted">{r.minutes} min · {r.km} km</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted">from</p>
                      <p className="font-display text-lg font-bold text-heading">{formatPrice(r.fromIsk, cur)}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <button onClick={book} className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-link hover:underline">
                See all airport routes <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </section>

        {/* Private tours */}
        <section className="bg-surface py-14 sm:py-20 lg:py-28">
          <div className="mx-auto w-full min-w-0 max-w-7xl">
            <div className="flex flex-wrap items-end justify-between gap-4 px-4 sm:px-6 lg:px-8">
              <div className="max-w-2xl">
                <h2 className="font-display text-2xl font-bold text-heading sm:text-4xl">Private sightseeing tours</h2>
                <p className="mt-3 text-base text-muted">Your own vehicle and driver, your own schedule. Stop where you want, stay as long as you like.</p>
              </div>
              <a href="/private-tours" className="inline-flex items-center gap-2 whitespace-nowrap text-sm font-bold text-link hover:underline">Discover Private Tours <ArrowRight size={16} /></a>
            </div>
            <div className="no-scrollbar mt-8 flex w-full min-w-0 snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-4 pb-1 sm:mt-10 md:grid md:grid-cols-3 md:gap-6 md:overflow-visible md:px-6 lg:px-8">
              {TOURS.map((tour) => (
                <article key={tour.id} className="group flex w-[min(82%,20rem)] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-line bg-card sm:w-[60%] md:w-auto md:shrink">
                  <div className="overflow-hidden">
                    <img src={tour.img} alt={tour.title} className="aspect-[4/3] w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]" />
                  </div>
                  <div className="flex flex-1 flex-col p-5 sm:p-6">
                    <h3 className="font-display text-lg font-bold text-heading sm:text-xl">{tour.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted">{tour.blurb}</p>
                    <div className="mt-4 flex gap-4 text-sm text-muted">
                      <span className="flex items-center gap-1.5"><Clock size={14} /> {tour.hours}</span>
                      <span className="flex items-center gap-1.5"><Users size={14} /> {tour.pax}</span>
                    </div>
                    <div className="mt-auto flex items-end justify-between pt-6">
                      <div>
                        <p className="text-xs text-muted">from, per vehicle</p>
                        <p className="font-display text-xl font-bold text-heading">{formatPrice(tour.fromIsk, cur)}</p>
                      </div>
                      <button onClick={() => onSearch?.({ category: 'tour', pickup: 'Reykjavík hotel', destination: tour.title, date: '', time: '', passengers: 2, luggage: 0 })} className="whitespace-nowrap rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-navy-2 dark:bg-primary dark:text-on-primary dark:hover:bg-primary-hover">
                        Book tour
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Private driver */}
        <section className="relative isolate overflow-hidden bg-navy">
          <div className="mx-auto grid w-full min-w-0 max-w-7xl lg:grid-cols-2">
            <div className="min-w-0 px-4 py-14 sm:px-6 sm:py-20 lg:px-8 lg:py-28">
              <h2 className="font-display text-2xl font-bold text-white sm:text-4xl">A private driver for your whole stay</h2>
              <p className="mt-4 max-w-lg text-base leading-relaxed text-white/80">
                Keep the same driver and vehicle for a few hours or several days. Plan your itinerary together, or ask for a custom quotation.
              </p>
              <div className="no-scrollbar mt-8 flex w-full min-w-0 gap-2 overflow-x-auto overscroll-x-contain sm:flex-wrap sm:overflow-visible">
                {['2 hours', '4 hours', '8 hours', 'Full day', 'Multi-day'].map((d) => (
                  <span key={d} className="whitespace-nowrap rounded-full border border-white/25 px-4 py-2 text-sm font-medium text-white">{d}</span>
                ))}
              </div>
              <div className="mt-10 grid gap-3 sm:flex sm:flex-wrap">
                <button onClick={() => onSearch?.({ category: 'driver', pickup: 'Reykjavík hotel', destination: 'Custom itinerary', date: '', time: '', passengers: 2, luggage: 2 })} className="whitespace-nowrap rounded-full bg-primary px-6 py-3 text-sm font-bold text-on-primary transition-colors duration-150 hover:bg-primary-hover">
                  Hire a Private Driver
                </button>
                <a href="/private-driver" className="whitespace-nowrap rounded-full border border-white/40 px-6 py-3 text-center text-sm font-semibold text-white transition-colors duration-150 hover:bg-white/10">Request a Custom Trip</a>
              </div>
            </div>
            <img src={IMG.privateDriver} alt="View from the back seat of a chauffeured car along an Icelandic fjord" className="hidden h-96 w-full object-cover sm:block lg:h-full" />
          </div>
        </section>

        {/* Destinations mosaic */}
        <section className="mx-auto w-full min-w-0 max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8 lg:py-28">
          <h2 className="font-display text-2xl font-bold text-heading sm:text-4xl">Popular destinations</h2>
          <p className="mt-3 max-w-2xl text-base text-muted">Where our passengers travel most. Every destination can be booked as a transfer, a tour or part of a private driver day.</p>
          <div className="mt-8 grid auto-rows-[150px] grid-cols-2 gap-2.5 sm:mt-10 sm:auto-rows-[220px] sm:gap-3 lg:grid-cols-4">
            {DESTINATIONS.map((d, i) => (
              <a key={d.name} href="/destinations" className={`group relative overflow-hidden rounded-2xl ${i === 0 ? 'col-span-2 row-span-2' : ''} ${i === 4 ? 'col-span-2' : ''}`}>
                <img src={d.img} alt={d.name} className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]" />
                <div className="absolute inset-x-0 bottom-0 bg-navy/70 px-4 py-3 backdrop-blur-sm">
                  <p className="font-display text-base font-bold text-white sm:text-lg">{d.name}</p>
                  <p className="text-xs text-white/80">{d.note}</p>
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* Fleet */}
        <section className="bg-surface py-14 sm:py-20 lg:py-28">
          <div className="mx-auto w-full min-w-0 max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr] lg:gap-16">
              <div>
                <h2 className="font-display text-2xl font-bold text-heading sm:text-4xl">Our fleet</h2>
                <p className="mt-3 text-base text-muted">Choose the vehicle that fits your group and luggage. Capacities are per vehicle. <a href="/fleet" className="font-semibold text-link hover:underline">Full fleet page</a></p>
                <img src={IMG.fleet} alt="Sedan, SUV and minivan parked in Reykjavík" className="mt-8 hidden aspect-[16/10] w-full rounded-2xl object-cover sm:block" />
              </div>
              <div className="min-w-0 overflow-hidden rounded-2xl border border-line bg-card">
                <ul className="divide-y divide-line sm:hidden">
                  {FLEET.map((v) => (
                    <li key={v.name} className="flex items-center gap-3 px-4 py-3.5">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-heading">{v.name}</p>
                        <p className="mt-0.5 text-sm text-muted">{v.use}</p>
                      </div>
                      <p className="shrink-0 text-right text-sm text-text">{v.pax} seats<br />{v.bags} bags</p>
                    </li>
                  ))}
                </ul>
                <table className="hidden w-full table-fixed text-left text-sm sm:table">
                  <thead className="border-b border-line text-xs font-semibold text-muted">
                    <tr>
                      <th className="px-5 py-4">Vehicle</th>
                      <th className="px-3 py-4"><span className="flex items-center gap-1"><Users size={13} /> Seats</span></th>
                      <th className="px-3 py-4"><span className="flex items-center gap-1"><Luggage size={13} /> Bags</span></th>
                      <th className="px-5 py-4">Best for</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {FLEET.map((v) => (
                      <tr key={v.name}>
                        <td className="px-5 py-4 font-semibold text-heading">{v.name}</td>
                        <td className="px-3 py-4 text-text">{v.pax}</td>
                        <td className="px-3 py-4 text-text">{v.bags}</td>
                        <td className="px-5 py-4 text-muted">{v.use}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* Why + How it works */}
        <section className="mx-auto w-full min-w-0 max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8 lg:py-28">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <h2 className="font-display text-2xl font-bold text-heading sm:text-4xl">Why travel with us</h2>
              <dl className="mt-8 divide-y divide-line border-t border-line">
                {[
                  ['Price before you pay', 'The full breakdown — extras, surcharges and currency — is shown before checkout.'],
                  ['Your currency, clearly', 'Pay in euro (EUR), or in ISK if you live in Iceland. You are charged in the currency you see.'],
                  ['Our own drivers and vehicles', 'Every journey is run by Iceland Taxi Booking, not passed to an unknown operator.'],
                  ['A person to talk to', 'Message us in your booking or on WhatsApp before, during and after your trip.'],
                ].map(([title, body]) => (
                  <div key={title} className="py-5">
                    <dt className="font-semibold text-heading">{title}</dt>
                    <dd className="mt-1 text-sm leading-relaxed text-muted">{body}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold text-heading sm:text-4xl"><a href="/how-it-works" className="hover:text-link">How booking works</a></h2>
              <ol className="mt-8 space-y-6">
                {[
                  ['Tell us your journey', 'Pickup, destination, date, passengers and luggage.'],
                  ['Choose vehicle and extras', 'Child seats, extra stops, waiting time or a return trip.'],
                  ['Pay securely', 'Card payment in EUR or ISK. Custom trips start as a quotation.'],
                  ['Meet your driver', 'Your booking reference and driver details arrive before pickup.'],
                ].map(([title, body], i) => (
                  <li key={title} className="flex gap-4">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary font-display text-sm font-bold text-on-primary">{i + 1}</span>
                    <div className="min-w-0">
                      <p className="font-semibold text-heading">{title}</p>
                      <p className="mt-1 text-sm text-muted">{body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* Reviews — verified bookings only */}
        <section className="border-y border-line bg-surface py-12 sm:py-16">
          <div className="mx-auto w-full min-w-0 max-w-7xl">
            <h2 className="px-4 font-display text-2xl font-bold text-heading sm:px-6 sm:text-3xl lg:px-8">Reviews from verified journeys</h2>
            {showDemoReviews ? (
              <div className="no-scrollbar mt-8 flex w-full min-w-0 snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-4 md:grid md:grid-cols-3 md:gap-6 md:overflow-visible md:px-6 lg:px-8">
                {['Golden Circle Private Tour', 'Keflavík Airport → Reykjavík', 'Private driver · 3 days'].map((s) => (
                  <figure key={s} className="flex w-[min(82%,20rem)] shrink-0 snap-start flex-col rounded-2xl border border-line bg-card p-6 md:w-auto md:shrink">
                    <p className="text-sm font-semibold text-warning">★★★★★</p>
                    <blockquote className="mt-3 text-sm leading-relaxed text-text">Demo review text. Real reviews are submitted by customers after a completed booking and approved in the admin portal.</blockquote>
                    <figcaption className="mt-auto pt-5 text-xs text-muted">Demo content · {s}</figcaption>
                  </figure>
                ))}
              </div>
            ) : (
              <p className="mt-4 max-w-2xl px-4 text-sm text-muted sm:px-6 lg:px-8">Reviews are collected only from customers with a completed booking, and appear here once approved by our team.</p>
            )}
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto w-full min-w-0 max-w-3xl px-4 py-14 sm:px-6 sm:py-20 lg:py-28">
          <h2 className="font-display text-2xl font-bold text-heading sm:text-center sm:text-4xl">Frequently asked questions</h2>
          <Faq />
          <p className="mt-8 text-center">
            <a href="/faqs" className="text-sm font-bold text-link hover:underline">View all FAQs</a>
          </p>
        </section>

        {/* CTA */}
        <section className="relative isolate overflow-hidden">
          <img src={IMG.northernLights} alt="Northern lights above snowy mountains" className="absolute inset-0 -z-10 h-full w-full object-cover" />
          <div className="absolute inset-0 -z-10 bg-navy/60" />
          <div className="mx-auto w-full min-w-0 max-w-7xl px-4 py-16 text-center sm:px-6 sm:py-24 lg:px-8 lg:py-32">
            <h2 className="font-display text-3xl font-extrabold text-white sm:text-5xl">Your Journey Across Iceland Starts Here.</h2>
            <div className="mt-8 grid gap-3 sm:flex sm:flex-wrap sm:justify-center">
              <button onClick={book} className="whitespace-nowrap rounded-full bg-primary px-7 py-3.5 text-sm font-bold text-on-primary transition-colors duration-150 hover:bg-primary-hover">Book Your Ride</button>
              <a href="#" className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full border border-white/40 px-7 py-3.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-white/10"><MessageCircle size={16} /> Ask on WhatsApp</a>
            </div>
          </div>
        </section>

        <SiteFooter onStaff={onStaff} onStaffMobile={onStaffMobile} onDriver={onDriver} onAccount={onSignIn} />
        </div>
      </div>
      <SiteTabBar language={lang} active="home" onHome={() => window.scrollTo({ top: 0, behavior: 'smooth' })} onBook={book} onTrips={onSignIn} onHelp={onMessages} />
    </div>
  )
}
