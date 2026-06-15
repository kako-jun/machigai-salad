import type { MetadataRoute } from 'next'

const siteUrl = 'https://machigai-salad.llll-ll.com'

export const dynamic = 'force-static'

// Both language URLs (`/` ja, `/en` en), each cross-linked via hreflang
// alternates so the English page is explicitly crawlable rather than only
// discoverable through the Japanese page. lastModified uses the build date
// (JST) already exposed via next.config so the sitemap stays in step with
// each deploy without manual editing.
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = process.env.BUILD_DATE
  const languages = { ja: siteUrl, en: `${siteUrl}/en` }
  return [
    {
      url: siteUrl,
      lastModified,
      changeFrequency: 'monthly',
      priority: 1,
      alternates: { languages },
    },
    {
      url: `${siteUrl}/en`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 1,
      alternates: { languages },
    },
  ]
}
