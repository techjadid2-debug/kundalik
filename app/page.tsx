import Link from 'next/link'
import { listPublishedArticles } from '@/lib/articles'
import { formatDate } from '@/lib/telegram/render'
import { ThemeToggle } from '@/components/theme-toggle'
import { Input } from '@/components/ui'

export default async function Home({ searchParams }: PageProps<'/'>) {
  const params = await searchParams
  const query = typeof params.q === 'string' ? params.q : ''
  const published = await listPublishedArticles(query)

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-24">
      <header className="mb-16 flex items-start justify-between gap-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Kundalik</h1>
          <p className="mt-2 text-sm text-muted">Maqolalar, qisqa postlar va kundalik yozuvlar.</p>
        </div>
        <ThemeToggle className="shrink-0" />
      </header>

      <form className="mb-12 flex gap-2" role="search">
        <Input name="q" defaultValue={query} placeholder="Qidirish…" aria-label="Maqolalarni qidirish" />
        <button className="rounded-md border border-fg bg-fg px-4 text-sm text-bg" type="submit">Izlash</button>
      </form>

      {published.length === 0 ? (
        <p className="text-sm text-muted">{query ? 'Mos maqola topilmadi.' : "Hozircha chop etilgan maqola yo'q."}</p>
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
                <span className="mt-1 block text-xs uppercase tracking-wider text-muted">
                  {article.contentType === 'short' ? 'Qisqa post' : article.contentType === 'media' ? 'Media' : 'Maqola'}
                </span>
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
