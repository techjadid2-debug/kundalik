import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getPublishedArticleBySlug } from '@/lib/articles'
import { formatDate, formatTags } from '@/lib/telegram/render'
import { articleUrl } from '@/lib/site'
import { ThemeToggle } from '@/components/theme-toggle'
import { mediaEmbedUrl } from '@/lib/media'

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
      <div className="flex items-center justify-between gap-6">
        <Link
          href="/"
          className="-mx-2 rounded-md px-2 py-1 text-xs text-muted hover:bg-hover hover:text-fg"
        >
          ← Kundalik
        </Link>
        <ThemeToggle className="shrink-0" />
      </div>

      <article className="mt-12">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Article',
              headline: article.title,
              description: article.lead,
              datePublished: article.publishedAt?.toISOString(),
              image: article.coverUrl ?? undefined,
              url: articleUrl(article.slug),
            }).replace(/</g, '\\u003c'),
          }}
        />
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
          <div className="relative mb-12 aspect-[3/2] w-full overflow-hidden rounded-xl border border-line">
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

        {article.contentType === 'media' && article.mediaUrl ? (
          <div className="mb-12 aspect-video overflow-hidden rounded-xl border border-line bg-surface">
            {mediaEmbedUrl(article.mediaUrl, article.mediaProvider) ? (
              <iframe
                src={mediaEmbedUrl(article.mediaUrl, article.mediaProvider) ?? undefined}
                title={article.title}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <a className="flex h-full items-center justify-center text-sm underline" href={article.mediaUrl} rel="noreferrer" target="_blank">
                Media havolasini ochish ↗
              </a>
            )}
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
