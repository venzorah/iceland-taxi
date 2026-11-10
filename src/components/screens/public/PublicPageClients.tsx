'use client'

import About from '@/components/screens/public/About'
import Article from '@/components/screens/public/Article'
import AirportTransfer from '@/components/screens/public/AirportTransfer'
import Blog from '@/components/screens/public/Blog'
import Contact from '@/components/screens/public/Contact'
import Destinations from '@/components/screens/public/Destinations'
import Faqs from '@/components/screens/public/Faqs'
import Fleet from '@/components/screens/public/Fleet'
import HowItWorks from '@/components/screens/public/HowItWorks'
import ManageBooking from '@/components/screens/public/ManageBooking'
import Policies, { type PolicyId } from '@/components/screens/public/Policies'
import PrivateDriver from '@/components/screens/public/PrivateDriver'
import PrivateTours from '@/components/screens/public/PrivateTours'
import Services from '@/components/screens/public/Services'
import TravelGuides from '@/components/screens/public/TravelGuides'
import { usePublicChrome } from '@/components/screens/public/usePublicChrome'
import { PUBLIC_PATHS } from '@/lib/design/routes'

function chromeProps(c: ReturnType<typeof usePublicChrome>) {
  return {
    theme: c.theme,
    language: c.language,
    currency: c.currency,
    announcements: c.announcements,
    onThemeChange: c.onThemeChange,
    onLanguageChange: c.onLanguageChange,
    onCurrencyChange: c.onCurrencyChange,
    onHome: c.onHome,
    onBook: c.onBook,
    onSignIn: c.onSignIn,
    onStaff: c.onStaff,
    onStaffMobile: c.onStaffMobile,
    onDriver: c.onDriver,
    onAccount: c.onAccount,
    onHelp: c.onHelp,
  }
}

export function AboutPageClient() {
  const c = usePublicChrome()
  return <About {...chromeProps(c)} />
}

export function ContactPageClient() {
  const c = usePublicChrome()
  return <Contact {...chromeProps(c)} />
}

export function ServicesPageClient() {
  const c = usePublicChrome()
  return <Services {...chromeProps(c)} onAirport={c.onAirport} onTours={c.onTours} onPrivateDriver={c.onPrivateDriver} />
}

export function DestinationsPageClient() {
  const c = usePublicChrome()
  return <Destinations {...chromeProps(c)} />
}

export function FleetPageClient() {
  const c = usePublicChrome()
  return <Fleet {...chromeProps(c)} />
}

export function HowItWorksPageClient() {
  const c = usePublicChrome()
  return <HowItWorks {...chromeProps(c)} />
}

export function FaqsPageClient() {
  const c = usePublicChrome()
  return <Faqs {...chromeProps(c)} onContact={() => c.go(PUBLIC_PATHS.contact)} />
}

export function BlogPageClient() {
  const c = usePublicChrome()
  return <Blog {...chromeProps(c)} />
}

export function ArticlePageClient({ kind, slug }: { kind: 'blog' | 'guide'; slug: string }) {
  const c = usePublicChrome()
  return <Article {...chromeProps(c)} kind={kind} slug={slug} />
}

export function TravelGuidesPageClient() {
  const c = usePublicChrome()
  return <TravelGuides {...chromeProps(c)} />
}

export function PoliciesPageClient({ policy }: { policy?: PolicyId }) {
  const c = usePublicChrome()
  return <Policies {...chromeProps(c)} policy={policy} />
}

export function ManageBookingPageClient() {
  const c = usePublicChrome()
  return <ManageBooking {...chromeProps(c)} onMessages={c.onMessages} />
}

export function AirportTransferPageClient() {
  const c = usePublicChrome()
  return <AirportTransfer {...chromeProps(c)} onBook={() => c.go(`${PUBLIC_PATHS.book}?category=airport`)} />
}

export function PrivateToursPageClient() {
  const c = usePublicChrome()
  return <PrivateTours {...chromeProps(c)} onBook={() => c.go(`${PUBLIC_PATHS.book}?category=tour`)} />
}

export function PrivateDriverPageClient() {
  const c = usePublicChrome()
  return <PrivateDriver {...chromeProps(c)} onBook={() => c.go(`${PUBLIC_PATHS.book}?category=driver`)} />
}
