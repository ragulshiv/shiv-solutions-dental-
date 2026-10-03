import type { Metadata, Viewport } from 'next'
import { IBM_Plex_Sans, Source_Serif_4 } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { Providers } from '@/components/providers'
import { ServiceWorkerRegister } from '@/components/pwa/service-worker-register'
import { BRAND } from '@/config/brand'

// Body text: IBM Plex Sans (clear at small sizes, good figures for billing tables).
// Headings: Source Serif 4, applied to every h1 via globals.css and to `font-serif`.
const sans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
})
const serif = Source_Serif_4({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-serif',
})

export const metadata: Metadata = {
  title: {
    default: `${BRAND.name} - ${BRAND.tagline}`,
    template: `%s | ${BRAND.name}`,
  },
  description:
    'Dental clinic management for Indian clinics: patient records, appointments, GST billing, inventory, treatment planning, insurance and tele-dentistry.',
  applicationName: BRAND.name,
  authors: [{ name: BRAND.name }],
  creator: BRAND.name,
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon-32.png',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    title: `${BRAND.name} - ${BRAND.tagline}`,
    siteName: BRAND.name,
  },
  // A private clinic system: keep it out of search engines.
  robots: {
    index: false,
    follow: false,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: BRAND.name,
  },
}

export const viewport: Viewport = {
  themeColor: '#111c33',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${sans.variable} ${serif.variable} font-sans`}>
        <Providers>
          {children}
          <Toaster />
          <ServiceWorkerRegister />
        </Providers>
      </body>
    </html>
  )
}
