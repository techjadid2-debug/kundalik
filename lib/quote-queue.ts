import 'server-only'
import { asc, eq } from 'drizzle-orm'
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
export async function nextPendingQuote(): Promise<QueuedQuote | null> {
  const db = getDb()
  const rows = await db
    .select({ quote: quotes, article: articles })
    .from(quotes)
    .innerJoin(articles, eq(quotes.articleId, articles.id))
    // Faqat chop etilgan maqoladan — havola ishlashi kerak
    .where(eq(quotes.status, 'pending'))
    .orderBy(asc(articles.publishedAt), asc(quotes.position))

  return rows.find((row) => row.article.status === 'published') ?? null
}
