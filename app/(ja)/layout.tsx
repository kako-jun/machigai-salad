import type { Viewport } from 'next'
import ToastContainer from '@/components/Toast'
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister'
import { I18nProvider } from '@/lib/i18n'
import { buildMetadata, buildJsonLd } from '@/lib/seo'
import '../globals.css'

// Japanese root layout — serves `/`. The (ja) route group keeps this at the
// site root (groups don't affect the URL) while letting `/en` have its own
// <html lang="en"> root layout.
export const metadata = buildMetadata('ja')

export const viewport: Viewport = {
  themeColor: '#FEF6DC',
}

const jsonLd = buildJsonLd('ja')

export default function JaRootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body className="antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <I18nProvider>
          {children}
          <ToastContainer />
          <ServiceWorkerRegister />
        </I18nProvider>
      </body>
    </html>
  )
}
