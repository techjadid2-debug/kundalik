import { notFound } from 'next/navigation'
import type { JSONContent } from '@tiptap/core'
import { getArticle } from '@/lib/articles'
import { getSettings } from '@/lib/settings'
import { siteOrigin } from '@/lib/site'
import { ArticleEditor } from '@/components/editor/article-editor'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: PageProps<'/admin/write/[id]'>) {
  const { id } = await params
  const article = await getArticle(id)
  return { title: article?.title || 'Yangi maqola' }
}

export default async function WritePage({ params }: PageProps<'/admin/write/[id]'>) {
  const { id } = await params
  const [article, settings] = await Promise.all([getArticle(id), getSettings()])
  if (!article) notFound()

  return (
    <ArticleEditor
      article={{
        id: article.id,
        slug: article.slug,
        title: article.title,
        lead: article.lead,
        contentJson: article.contentJson as JSONContent,
        coverUrl: article.coverUrl,
        tags: article.tags,
        status: article.status,
      }}
      template={settings.articleTemplate}
      channel={settings.channelUsername}
      timezone={settings.timezone}
      origin={siteOrigin()}
    />
  )
}
