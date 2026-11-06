import { listArticles } from '@/lib/articles'
import { articleUrl, siteOrigin } from '@/lib/site'

export const dynamic = 'force-dynamic'

export async function GET() {
  const articles = await listArticles('published')
  const items = articles.slice(0, 50).map((article) => `
    <item>
      <title><![CDATA[${article.title}]]></title>
      <link>${articleUrl(article.slug)}</link>
      <guid>${articleUrl(article.slug)}</guid>
      <description><![CDATA[${article.lead}]]></description>
      <pubDate>${(article.publishedAt ?? article.updatedAt).toUTCString()}</pubDate>
    </item>`).join('')
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
  <rss version="2.0"><channel><title>Kundalik</title><link>${siteOrigin()}</link><description>Maqolalar va kundalik yozuvlar.</description>${items}</channel></rss>`
  return new Response(xml, { headers: { 'content-type': 'application/rss+xml; charset=utf-8' } })
}
