import type { Viewport } from 'next'
import ToastContainer from '@/components/Toast'
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister'
import { I18nProvider } from '@/lib/i18n'
import { buildMetadata, buildJsonLd } from '@/lib/seo'
import '../globals.css'

// English root layout — serves `/en` with its own <html lang="en"> and English
// metadata. forcedLang pins the UI to English so it matches the URL/static html.
export const metadata = buildMetadata('en')

export const viewport: Viewport = {
  themeColor: '#FEF6DC',
}

const jsonLd = buildJsonLd('en')

export default function EnRootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <I18nProvider forcedLang="en">
          {children}
          <ToastContainer />
        </I18nProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  )
}
