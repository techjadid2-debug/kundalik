import type { MetadataRoute } from 'next'
import { listArticles } from '@/lib/articles'
import { siteOrigin } from '@/lib/site'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const articles = await listArticles('published')
  return [
    { url: siteOrigin(), lastModified: new Date() },
    ...articles.map((article) => ({
      url: `${siteOrigin()}/${article.slug}`,
      lastModified: article.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: article.isFeatured ? 0.9 : 0.7,
    })),
  ]
}
