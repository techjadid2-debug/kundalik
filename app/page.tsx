import Link from 'next/link'
import { listArticles } from '@/lib/articles'
import { formatDate } from '@/lib/telegram/render'
import { ThemeToggle } from '@/components/theme-toggle'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const published = await listArticles('published')

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-24">
      <header className="mb-16 flex items-start justify-between gap-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Kundalik</h1>
          <p className="mt-2 text-sm text-muted">Maqolalar va kundalik yozuvlar.</p>
        </div>
        <ThemeToggle className="shrink-0" />
      </header>

      {published.length === 0 ? (
        <p className="text-sm text-muted">Hozircha chop etilgan maqola yo&apos;q.</p>
      ) : (
        <ul className="space-y-10">
          {published.map((article) => (
            <li key={article.id}>
              <Link
                href={`/${article.slug}`}
                className="group -mx-3 block rounded-lg px-3 py-2 hover:bg-hover"
              >
                <time
                  dateTime={article.publishedAt?.toISOString()}
                  className="text-xs text-muted"
                >
                  {article.publishedAt ? formatDate(article.publishedAt) : ''}
                </time>
                <h2 className="mt-1 font-serif text-xl font-semibold tracking-tight">
                  {article.title}
                </h2>
                {article.lead ? (
                  <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted">
                    {article.lead}
                  </p>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
