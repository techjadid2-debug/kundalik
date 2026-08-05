import 'server-only'
import { generateHTML } from '@tiptap/html/server'
import type { JSONContent } from '@tiptap/core'
import { and, desc, eq, sql } from 'drizzle-orm'
import { getDb } from './db'
import { articles, quotes, type Article } from './db/schema'
import { editorExtensions } from './editor/extensions'
import { slugFromTitle, uniqueSlug } from './slug'

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

export async function listArticles(status?: Article['status']) {
  const db = getDb()
  const where = status ? eq(articles.status, status) : undefined
  return db
    .select()
    .from(articles)
    .where(where)
    .orderBy(desc(sql`coalesce(${articles.publishedAt}, ${articles.updatedAt})`))
}

export async function getArticle(id: string): Promise<Article | undefined> {
  const rows = await getDb().select().from(articles).where(eq(articles.id, id)).limit(1)
  return rows[0]
}

export async function getPublishedArticleBySlug(slug: string): Promise<Article | undefined> {
  const rows = await getDb()
    .select()
    .from(articles)
    .where(and(eq(articles.slug, slug), eq(articles.status, 'published')))
    .limit(1)
  return rows[0]
}

/** Sarlavhadan band bo'lmagan slug yasaydi (o'zining slugini hisobga olmaydi). */
export async function buildSlug(title: string, exceptId?: string): Promise<string> {
  const db = getDb()
  const rows = await db.select({ id: articles.id, slug: articles.slug }).from(articles)
  const taken = new Set(rows.filter((r) => r.id !== exceptId).map((r) => r.slug))
  return uniqueSlug(slugFromTitle(title), taken)
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
  lead: string
  contentJson: JSONContent
  coverUrl: string | null
  tags: string[]
}

export async function saveDraft(id: string, draft: ArticleDraft): Promise<Article> {
  const db = getDb()
  const current = await getArticle(id)
  if (!current) throw new Error('Maqola topilmadi')

  // Slug faqat qoralama holatida yangilanadi — chop etilgan havola buzilmasin
  const slug =
    current.status === 'draft' && draft.title.trim()
      ? await buildSlug(draft.title, id)
      : current.slug

  const updated = await db
    .update(articles)
    .set({
      slug,
      title: draft.title,
      lead: draft.lead,
      contentJson: draft.contentJson,
      contentHtml: renderContentHtml(draft.contentJson),
      coverUrl: draft.coverUrl,
      tags: draft.tags,
      updatedAt: new Date(),
    })
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
