import type { MetadataRoute } from 'next'

// Canonical production deploy (Cloudflare). basePath is only used for the
// GitHub Pages mirror; the indexable site lives at the apex subdomain.
const siteUrl = 'https://machigai-salad.llll-ll.com'

export const dynamic = 'force-static'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  }
}
