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
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '48x48' },
      { url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/favicon-16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
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
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(localStorage.getItem('itb_welcome_seen')==='1')return;localStorage.setItem('itb_welcome_seen','1');window.__itbWelcome=1;document.documentElement.classList.add('itb-welcome')}catch(e){}})()`,
          }}
        />
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  )
}
