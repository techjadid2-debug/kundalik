import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getPublishedArticleBySlug } from '@/lib/articles'
import { formatDate, formatTags } from '@/lib/telegram/render'
import { articleUrl } from '@/lib/site'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: PageProps<'/[slug]'>): Promise<Metadata> {
  const { slug } = await params
  const article = await getPublishedArticleBySlug(slug)
  if (!article) return { title: 'Topilmadi' }

  return {
    title: article.title,
    description: article.lead,
    alternates: { canonical: articleUrl(article.slug) },
    openGraph: {
      type: 'article',
      title: article.title,
      description: article.lead,
      url: articleUrl(article.slug),
      publishedTime: article.publishedAt?.toISOString(),
      images: article.coverUrl ? [{ url: article.coverUrl }] : undefined,
    },
    twitter: {
      card: article.coverUrl ? 'summary_large_image' : 'summary',
      title: article.title,
      description: article.lead,
      images: article.coverUrl ? [article.coverUrl] : undefined,
    },
  }
}

export default async function ArticlePage({ params }: PageProps<'/[slug]'>) {
  const { slug } = await params
  const article = await getPublishedArticleBySlug(slug)
  if (!article) notFound()

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <Link href="/" className="text-xs text-muted transition-colors hover:text-fg">
        ← Kundalik
      </Link>

      <article className="mt-12">
        <header className="mb-10">
          <time
            dateTime={article.publishedAt?.toISOString()}
            className="text-xs text-muted"
          >
            {article.publishedAt ? formatDate(article.publishedAt) : ''}
          </time>
          <h1 className="mt-2 font-serif text-3xl font-semibold leading-tight tracking-tight">
            {article.title}
          </h1>
        </header>

        {article.coverUrl ? (
          <div className="relative mb-12 aspect-[3/2] w-full border border-line">
            <Image
              src={article.coverUrl}
              alt=""
              fill
              sizes="(max-width: 672px) 100vw, 672px"
              priority
              className="object-cover"
            />
          </div>
        ) : null}

        <div
          className="prose"
          dangerouslySetInnerHTML={{ __html: article.contentHtml }}
        />

        {article.tags.length > 0 ? (
          <p className="mt-16 border-t border-line pt-6 text-sm text-muted">
            {formatTags(article.tags)}
          </p>
        ) : null}
      </article>
    </main>
  )
}
