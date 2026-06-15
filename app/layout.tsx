import type { Metadata, Viewport } from 'next'
import ToastContainer from '@/components/Toast'
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister'
import { I18nProvider } from '@/lib/i18n'
import './globals.css'

const siteUrl = 'https://machigai-salad.llll-ll.com'

// Longer, keyword-bearing description for search snippets. The on-page subtitle
// stays short ('間違いさがし おたすけツール'); this is the search-facing copy.
const description =
  '2枚の画像を並べて拡大・比較できる間違い探しのおたすけツール。答え合わせやヒント探しに便利。インストール不要、ブラウザだけで動きます。'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: '小エビの間違いサラダ',
  description,
  keywords: [
    '間違い探し',
    '間違いさがし',
    'まちがいさがし',
    '間違いサラダ',
    '答え合わせ',
    'ヒント',
    '画像比較',
    '拡大',
    'ツール',
  ],
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '間違いサラダ',
  },
  openGraph: {
    type: 'website',
    url: siteUrl,
    title: '小エビの間違いサラダ',
    description,
    siteName: '小エビの間違いサラダ',
    locale: 'ja_JP',
    images: [{ url: `${siteUrl}/static/ogp.webp`, width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '小エビの間違いサラダ',
    description,
    images: [`${siteUrl}/static/ogp.webp`],
  },
  icons: {
    icon: '/favicon.webp',
    apple: '/apple-touch-icon.webp',
  },
}

// Structured data so search engines can render the tool as a SoftwareApplication
// rich result. Free, browser-based, Japanese.
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: '小エビの間違いサラダ',
  url: siteUrl,
  description,
  applicationCategory: 'UtilitiesApplication',
  operatingSystem: 'Web',
  inLanguage: 'ja',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'JPY',
  },
}

export const viewport: Viewport = {
  themeColor: '#FEF6DC',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
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
        </I18nProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  )
}
