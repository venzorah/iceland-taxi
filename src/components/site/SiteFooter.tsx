'use client'

import React, { useEffect, useState } from 'react'
import { Mail, MessageCircle } from 'lucide-react'

import { LOGO_DARK } from '@/lib/design/data'
import { whatsappHref } from '@/lib/whatsapp'

const COLUMNS = [
  { title: 'Services', links: ['Airport transfers', 'Private taxi', 'Private tours', 'Private driver', 'Corporate travel'] },
  { title: 'Explore', links: ['Destinations', 'Our fleet', 'How it works', 'Travel guides', 'Blog'] },
  { title: 'Company', links: ['About us', 'Contact', 'FAQs', 'Manage booking'] },
  { title: 'Policies', links: ['Privacy policy', 'Terms & conditions', 'Cancellation policy', 'Refund policy'] },
]

export function SiteFooter({ onStaff, onStaffMobile, onDriver, onAccount }: { onStaff?: () => void; onStaffMobile?: () => void; onDriver?: () => void; onAccount?: () => void }) {
  const [company, setCompany] = useState<{ whatsappE164?: string | null; email?: string | null } | null>(null)
  useEffect(() => {
    fetch('/api/company')
      .then((r) => r.json())
      .then((d) => setCompany(d.company || null))
      .catch(() => {})
  }, [])
  const portals: [string, (() => void) | undefined][] = [
    ['Customer account', onAccount],
    ['Driver portal', onDriver],
    ['Admin (desktop)', onStaff],
    ['Admin (mobile)', onStaffMobile],
  ]
  return (
    <footer className="bg-navy text-white">
      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.3fr_2fr] lg:gap-12">
          <div>
            <img src={LOGO_DARK} alt="Iceland Taxi Booking" className="h-16 w-auto sm:h-20 lg:h-24" />
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/75">
              Airport transfers, private taxis, sightseeing tours and private drivers across Iceland.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href={whatsappHref({ e164: company?.whatsappE164, text: 'Hello Iceland Taxi Booking' })} className="inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-mint px-4 py-2 text-sm font-semibold text-navy transition-opacity duration-150 hover:opacity-90">
                <MessageCircle size={16} /> WhatsApp
              </a>
              {company?.email ? (
                <a href={`mailto:${company.email}`} className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-white/25 px-4 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-white/10">
                  <Mail size={16} /> Email us
                </a>
              ) : (
                <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white/50" title="Email unset in company CMS">
                  <Mail size={16} /> Email us
                </span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4">
            {COLUMNS.map((c) => (
              <div key={c.title}>
                <p className="text-sm font-bold text-white">{c.title}</p>
                <ul className="mt-3 space-y-1 sm:mt-4 sm:space-y-2.5">
                  {c.links.map((l) => (
                    <li key={l}>
                      <a href="#" className="block py-1 text-sm text-white/70 transition-colors duration-150 hover:text-cyan sm:inline sm:py-0">{l}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-12 border-t border-white/15 pt-6 sm:mt-14">
          <p className="text-xs font-semibold text-white/60">Portals</p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            {portals.map(([label, go]) => (
              <button
                key={label}
                onClick={go}
                className="whitespace-nowrap rounded-xl border border-white/15 px-3 py-2.5 text-left text-sm font-semibold text-white/85 transition-colors duration-150 hover:border-white/30 hover:text-cyan active:bg-white/10 sm:rounded-full sm:px-4 sm:py-2"
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mt-6 text-xs text-white/60">© {new Date().getFullYear()} Iceland Taxi Booking</p>
        </div>
      </div>
    </footer>
  )
}
