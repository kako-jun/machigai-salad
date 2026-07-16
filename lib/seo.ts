import type { Metadata } from 'next'

// Per-language SEO copy + metadata builders, shared by the (ja) root layout
// (URL `/`) and the (en) root layout (URL `/en`). Each route emits its own
// <html lang>, title/description, OG locale, JSON-LD, and hreflang alternates
// that cross-link `/` <-> `/en`.

export type SeoLang = 'ja' | 'en'

const siteUrl = 'https://machigai-salad.llll-ll.com'
const ogImage = `${siteUrl}/static/ogp.webp`

// Relative paths; Next resolves them against metadataBase into absolute URLs.
const PATH: Record<SeoLang, string> = { ja: '/', en: '/en' }

const copy = {
  ja: {
    title: '小エビの間違いサラダ',
    siteName: '小エビの間違いサラダ',
    appleTitle: '間違いサラダ',
    description:
      '2枚の画像を並べて拡大・比較できる間違い探しのおたすけツール。答え合わせやヒント探しに便利。インストール不要、ブラウザだけで動きます。',
    ogLocale: 'ja_JP',
    altLocale: 'en_US',
  },
  en: {
    title: 'Machigai Salad — spot-the-difference helper',
    siteName: 'Machigai Salad',
    appleTitle: 'Machigai Salad',
    description:
      'A browser-only tool that helps you solve spot-the-difference puzzles: overlay two photos and only the differences wiggle. Free, no install, works on your phone.',
    ogLocale: 'en_US',
    altLocale: 'ja_JP',
  },
} satisfies Record<SeoLang, unknown>

export function buildMetadata(lang: SeoLang): Metadata {
  const c = copy[lang]
  return {
    metadataBase: new URL(siteUrl),
    title: c.title,
    description: c.description,
    manifest: '/manifest.webmanifest',
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: c.appleTitle,
    },
    alternates: {
      canonical: PATH[lang],
      // hreflang cross-links so search engines serve the right language and
      // don't treat `/` and `/en` as duplicates.
      languages: {
        ja: PATH.ja,
        en: PATH.en,
        'x-default': PATH.ja,
      },
    },
    openGraph: {
      type: 'website',
      url: PATH[lang],
      title: c.title,
      description: c.description,
      siteName: c.siteName,
      locale: c.ogLocale,
      alternateLocale: [c.altLocale],
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: c.title,
      description: c.description,
      images: [ogImage],
    },
    icons: {
      icon: '/favicon.webp',
      apple: '/apple-touch-icon.webp',
    },
  }
}

export function buildJsonLd(lang: SeoLang) {
  const c = copy[lang]
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: c.siteName,
    alternateName: lang === 'ja' ? 'Machigai Salad' : '小エビの間違いサラダ',
    url: `${siteUrl}${PATH[lang]}`,
    description: c.description,
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Web',
    inLanguage: ['ja', 'en'],
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'JPY',
    },
  }
}
