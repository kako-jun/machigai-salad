import type { MetadataRoute } from 'next'

const siteUrl = 'https://machigai-salad.llll-ll.com'

export const dynamic = 'force-static'

// Single-page app: one canonical entry is enough. lastModified uses the build
// date (JST) already exposed via next.config so the sitemap stays in step with
// each deploy without manual editing.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: siteUrl,
      lastModified: process.env.BUILD_DATE,
      changeFrequency: 'monthly',
      priority: 1,
    },
  ]
}
