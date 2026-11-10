import type { Metadata, Viewport } from 'next'
import { AppProviders } from '@/components/providers/AppProviders'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Iceland Taxi Booking',
    template: '%s · Iceland Taxi Booking',
  },
  description:
    'From airport transfers to private tours and personalised vacation drivers, enjoy convenient transportation across Iceland with a booking experience designed around you.',
  applicationName: 'Iceland Taxi Booking',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Iceland Taxi Booking',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#061B3A' },
    { media: '(prefers-color-scheme: dark)', color: '#061B3A' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-dvh bg-bg font-sans text-text antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  )
}
