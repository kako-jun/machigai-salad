import type { Metadata, Viewport } from 'next'
import ToastContainer from '@/components/Toast'
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister'
import './globals.css'

const siteUrl = 'https://machigai-salad.llll-ll.com'

export const metadata: Metadata = {
  title: '小エビの間違いサラダ',
  description: '間違いさがし おたすけツール',
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
    description: '間違いさがし おたすけツール',
    siteName: '小エビの間違いサラダ',
    locale: 'ja_JP',
    images: [{ url: `${siteUrl}/static/ogp.webp`, width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '小エビの間違いサラダ',
    description: '間違いさがし おたすけツール',
    images: [`${siteUrl}/static/ogp.webp`],
  },
  icons: {
    icon: '/favicon.webp',
    apple: '/apple-touch-icon.webp',
  },
}

export const viewport: Viewport = {
  themeColor: '#fff8e7',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja">
      <body className="antialiased">
        {children}
        <ToastContainer />
        <ServiceWorkerRegister />
      </body>
    </html>
  )
}
