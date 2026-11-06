import 'server-only'
import { generateHTML } from '@tiptap/html/server'
import type { JSONContent } from '@tiptap/core'
import { and, desc, eq, ilike, lte, or, sql } from 'drizzle-orm'
import { unstable_cache } from 'next/cache'
import { getDb } from './db'
import { articles, quotes, type Article } from './db/schema'
import { editorExtensions } from './editor/extensions'
import { slugFromTitle } from './slug'

export const EMPTY_DOC: JSONContent = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
}

/** Tiptap hujjatidan ochiq saytda ko'rsatiladigan HTML yasaydi. */
export function renderContentHtml(doc: JSONContent): string {
  try {
    return generateHTML(doc, editorExtensions)
  } catch {
    return ''
  }
}

export async function listArticles(status?: Article['status'], query?: string, includeScheduled = false) {
  const db = getDb()
  const search = query?.trim()
  const where = and(
    status ? eq(articles.status, status) : undefined,
    status === 'published' && !includeScheduled ? lte(articles.publishedAt, new Date()) : undefined,
    search
      ? or(
          ilike(articles.title, `%${search}%`),
          ilike(articles.lead, `%${search}%`),
          sql`array_to_string(${articles.tags}, ' ') ILIKE ${`%${search}%`}`,
        )
      : undefined,
  )
  return db
    .select()
    .from(articles)
    .where(where)
    .orderBy(desc(sql`coalesce(${articles.publishedAt}, ${articles.updatedAt})`))
}

/** Public feed: cache publish/update actionlari orqali darhol yangilanadi. */
export async function listPublishedArticles(query = '') {
  return unstable_cache(
    () => listArticles('published', query),
    ['published-articles', query],
    { tags: ['articles'], revalidate: 3600 },
  )()
}

export async function getArticle(id: string): Promise<Article | undefined> {
  const rows = await getDb().select().from(articles).where(eq(articles.id, id)).limit(1)
  return rows[0]
}

export async function getPublishedArticleBySlug(slug: string): Promise<Article | undefined> {
  return unstable_cache(
    async () => {
      const rows = await getDb()
        .select()
        .from(articles)
        .where(and(eq(articles.slug, slug), eq(articles.status, 'published'), lte(articles.publishedAt, new Date())))
        .limit(1)
      return rows[0]
    },
    ['published-article', slug],
    { tags: ['articles', `article:${slug}`], revalidate: 3600 },
  )()
}

/** Sarlavhadan band bo'lmagan slug yasaydi (o'zining slugini hisobga olmaydi). */
export async function buildSlug(title: string, exceptId?: string): Promise<string> {
  const db = getDb()
  const base = slugFromTitle(title)
  let candidate = base
  let suffix = 2

  while (true) {
    const rows = await db
      .select({ id: articles.id })
      .from(articles)
      .where(eq(articles.slug, candidate))
      .limit(1)
    if (!rows[0] || rows[0].id === exceptId) return candidate
    candidate = `${base}-${suffix++}`
  }
}

export async function createDraft(): Promise<Article> {
  const db = getDb()
  const slug = await buildSlug('')
  const created = await db
    .insert(articles)
    .values({ slug, contentJson: EMPTY_DOC })
    .returning()
  return created[0]
}

export type ArticleDraft = {
  title: string
  contentType: Article['contentType']
  lead: string
  contentJson: JSONContent
  coverUrl: string | null
  mediaUrl: string | null
  mediaProvider: string | null
  seriesId: string | null
  seriesOrder: number | null
  isFeatured: boolean
  scheduledAt: Date | null
  tags: string[]
}

export type ArticlePatch = Partial<ArticleDraft>

export async function saveDraft(id: string, patch: ArticlePatch): Promise<Article> {
  const db = getDb()
  const current = await getArticle(id)
  if (!current) throw new Error('Maqola topilmadi')

  const values: Record<string, unknown> = { updatedAt: new Date() }
  if (patch.title !== undefined) {
    values.title = patch.title
    if (current.status === 'draft' && patch.title.trim() && patch.title !== current.title) {
      values.slug = await buildSlug(patch.title, id)
    }
  }
  if (patch.contentType !== undefined) values.contentType = patch.contentType
  if (patch.lead !== undefined) values.lead = patch.lead
  if (patch.contentJson !== undefined) {
    values.contentJson = patch.contentJson
    values.contentHtml = renderContentHtml(patch.contentJson)
  }
  if (patch.coverUrl !== undefined) values.coverUrl = patch.coverUrl
  if (patch.mediaUrl !== undefined) values.mediaUrl = patch.mediaUrl
  if (patch.mediaProvider !== undefined) values.mediaProvider = patch.mediaProvider
  if (patch.seriesId !== undefined) values.seriesId = patch.seriesId
  if (patch.seriesOrder !== undefined) values.seriesOrder = patch.seriesOrder
  if (patch.isFeatured !== undefined) values.isFeatured = patch.isFeatured ? 1 : 0
  if (patch.scheduledAt !== undefined) values.scheduledAt = patch.scheduledAt
  if (patch.tags !== undefined) values.tags = patch.tags

  const updated = await db
    .update(articles)
    .set(values)
    .where(eq(articles.id, id))
    .returning()

  return updated[0]
}

/**
 * Belgilangan iqtiboslarni navbatga qo'shadi.
 * Allaqachon jo'natilganlar (`sent`) tegilmaydi, yo'q qilinganlari o'chiriladi.
 */
export async function syncQuotes(articleId: string, texts: string[]): Promise<void> {
  const db = getDb()
  const existing = await db.select().from(quotes).where(eq(quotes.articleId, articleId))

  const byText = new Map(existing.map((q) => [q.text, q]))
  const wanted = new Set(texts)

  const toInsert = texts
    .map((text, position) => ({ text, position }))
    .filter((q) => !byText.has(q.text))
    .map((q) => ({ articleId, text: q.text, position: q.position }))

  if (toInsert.length) await db.insert(quotes).values(toInsert)

  // Tartibni yangilaymiz
  for (const [index, text] of texts.entries()) {
    const found = byText.get(text)
    if (found && found.position !== index) {
      await db.update(quotes).set({ position: index }).where(eq(quotes.id, found.id))
    }
  }

  // Matndan olib tashlangan, hali jo'natilmagan iqtiboslarni o'chiramiz
  const stale = existing.filter((q) => !wanted.has(q.text) && q.status === 'pending')
  for (const q of stale) {
    await db.delete(quotes).where(eq(quotes.id, q.id))
  }
}

export async function deleteArticle(id: string): Promise<void> {
  await getDb().delete(articles).where(eq(articles.id, id))
}
