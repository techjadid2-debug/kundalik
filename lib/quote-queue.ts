import 'server-only'
import { asc, eq, and, lt } from 'drizzle-orm'
import { getDb } from './db'
import { articles, quotes, type Article, type Quote } from './db/schema'

export type QueuedQuote = { quote: Quote; article: Article }

/**
 * Navbat tartibi: avval eski chop etilgan maqola, keyin maqola ichidagi tartib.
 * Shu tufayli iqtiboslar yozilgan ketma-ketligida chiqadi.
 */
export async function listQuotes(status?: Quote['status']): Promise<QueuedQuote[]> {
  const db = getDb()
  return db
    .select({ quote: quotes, article: articles })
    .from(quotes)
    .innerJoin(articles, eq(quotes.articleId, articles.id))
    .where(status ? eq(quotes.status, status) : undefined)
    .orderBy(asc(articles.publishedAt), asc(quotes.position))
}

/** Kunlik cron uchun — navbatdagi keyingi iqtibos. */
export async function claimNextPendingQuote(): Promise<QueuedQuote | null> {
  const db = getDb()
  const staleBefore = new Date(Date.now() - 10 * 60 * 1000)
  await db
    .update(quotes)
    .set({ status: 'pending', processingAt: null })
    .where(and(eq(quotes.status, 'processing'), lt(quotes.processingAt, staleBefore)))
  const rows = await db
    .select({ quote: quotes, article: articles })
    .from(quotes)
    .innerJoin(articles, eq(quotes.articleId, articles.id))
    // Faqat chop etilgan maqoladan — havola ishlashi kerak
    .where(eq(quotes.status, 'pending'))
    .orderBy(asc(articles.publishedAt), asc(quotes.position))

  const now = new Date()
  const candidate = rows.find(
    (row) => row.article.status === 'published' && row.article.publishedAt && row.article.publishedAt <= now,
  )
  if (!candidate) return null

  const claimed = await db
    .update(quotes)
    .set({ status: 'processing', processingAt: new Date() })
    .where(and(eq(quotes.id, candidate.quote.id), eq(quotes.status, 'pending')))
    .returning()

  return claimed[0] ? { ...candidate, quote: claimed[0] } : null
}

export async function releaseQuote(id: string): Promise<void> {
  await getDb()
    .update(quotes)
    .set({ status: 'pending', processingAt: null })
    .where(eq(quotes.id, id))
}
