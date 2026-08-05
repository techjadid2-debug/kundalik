import Link from 'next/link'
import { eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { quotes } from '@/lib/db/schema'
import { listArticles } from '@/lib/articles'
import { formatDate } from '@/lib/telegram/render'
import { Badge } from '@/components/ui'
import { NewArticleButton } from './new-article-button'

export const metadata = { title: 'Maqolalar' }
export const dynamic = 'force-dynamic'

export default async function AdminHome() {
  const [all, pending] = await Promise.all([
    listArticles(),
    getDb().select({ id: quotes.id }).from(quotes).where(eq(quotes.status, 'pending')),
  ])

  const drafts = all.filter((a) => a.status === 'draft')
  const published = all.filter((a) => a.status === 'published')

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="mb-10 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Maqolalar</h1>
          <p className="mt-1 text-sm text-muted">
            {published.length} chop etilgan · {drafts.length} qoralama ·{' '}
            <Link href="/admin/quotes" className="underline underline-offset-4 hover:text-fg">
              {pending.length} iqtibos navbatda
            </Link>
          </p>
        </div>
        <NewArticleButton />
      </div>

      {all.length === 0 ? (
        <p className="border border-dashed border-line px-6 py-16 text-center text-sm text-muted">
          Hali maqola yo&apos;q. Birinchisini yozing.
        </p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {all.map((article) => (
            <li key={article.id}>
              <Link
                href={`/admin/write/${article.id}`}
                className="group flex items-baseline gap-4 py-4 transition-opacity hover:opacity-70"
              >
                <span className="w-28 shrink-0 text-xs text-muted">
                  {formatDate(article.publishedAt ?? article.updatedAt)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate">
                    {article.title || <span className="text-muted">Sarlavhasiz</span>}
                  </span>
                  {article.lead ? (
                    <span className="mt-0.5 block truncate text-sm text-muted">{article.lead}</span>
                  ) : null}
                </span>
                {article.status === 'draft' ? <Badge>Qoralama</Badge> : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
