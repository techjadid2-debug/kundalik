'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import type { JSONContent } from '@tiptap/core'
import { getDb } from './db'
import { articles, quotes } from './db/schema'
import { requireAuth } from './guard'
import {
  createDraft,
  deleteArticle as removeArticle,
  getArticle,
  saveDraft,
  syncQuotes,
  type ArticleDraft,
} from './articles'
import { extractQuotes } from './quotes'
import { getSettings, updateSettings } from './settings'
import { renderArticleCaption, renderQuoteMessage } from './telegram/render'
import { editPhotoPost, sendMessage, sendPhoto } from './telegram/client'
import { explainTelegramError } from './telegram/errors'
import { articleUrl } from './site'

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string }

// ── Maqola ────────────────────────────────────────────────────────────

export async function newArticleAction(): Promise<void> {
  await requireAuth()
  const draft = await createDraft()
  revalidatePath('/admin')
  redirect(`/admin/write/${draft.id}`)
}

export async function saveArticleAction(id: string, draft: ArticleDraft): Promise<ActionResult> {
  await requireAuth()
  try {
    const saved = await saveDraft(id, draft)
    // Qoralamada ham navbatni yangilab boramiz, publish'ni kutmasdan
    await syncQuotes(id, extractQuotes(draft.contentJson))
    revalidatePath('/admin')
    revalidatePath('/admin/quotes')
    if (saved.status === 'published') revalidatePath(`/${saved.slug}`)
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function deleteArticleAction(id: string): Promise<void> {
  await requireAuth()
  await removeArticle(id)
  revalidatePath('/admin')
  revalidatePath('/')
  redirect('/admin')
}

/**
 * Maqolani kanalga chop etadi. Avval chop etilgan bo'lsa — mavjud postni yangilaydi.
 * Telegram xato bersa bazaga hech narsa yozilmaydi.
 */
export async function publishArticleAction(id: string): Promise<ActionResult> {
  await requireAuth()

  const article = await getArticle(id)
  if (!article) return { ok: false, error: 'Maqola topilmadi' }
  if (!article.title.trim()) return { ok: false, error: 'Sarlavha kiritilmagan' }
  if (!article.lead.trim()) return { ok: false, error: 'Lid matni kiritilmagan' }
  if (!article.coverUrl) return { ok: false, error: 'Muqova rasmi yuklanmagan' }

  const config = await getSettings()

  let caption
  try {
    caption = renderArticleCaption(config.articleTemplate, {
      title: article.title,
      lead: article.lead,
      tags: article.tags,
      url: articleUrl(article.slug),
      date: article.publishedAt ?? new Date(),
      channel: config.channelUsername,
      timeZone: config.timezone,
    })
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }

  const publishedMessageId = article.tgMessageId
  const isUpdate = publishedMessageId != null

  try {
    if (isUpdate) {
      await editPhotoPost({
        messageId: publishedMessageId,
        photoUrl: article.coverUrl,
        caption: caption.text,
      })
    } else {
      const sent = await sendPhoto({ photoUrl: article.coverUrl, caption: caption.text })
      await getDb()
        .update(articles)
        .set({ tgMessageId: sent.message_id })
        .where(eq(articles.id, id))
    }
  } catch (error) {
    return { ok: false, error: explainTelegramError(error) }
  }

  await getDb()
    .update(articles)
    .set({
      status: 'published',
      publishedAt: article.publishedAt ?? new Date(),
      updatedAt: new Date(),
    })
    .where(eq(articles.id, id))

  await syncQuotes(id, extractQuotes(article.contentJson as JSONContent))

  revalidatePath('/')
  revalidatePath('/admin')
  revalidatePath('/admin/quotes')
  revalidatePath(`/${article.slug}`)

  return {
    ok: true,
    message: isUpdate
      ? 'Kanaldagi post yangilandi'
      : caption.truncated
        ? 'Kanalga chop etildi (lid 1024 belgiga qisqartirildi)'
        : 'Kanalga chop etildi',
  }
}

// ── Iqtiboslar ────────────────────────────────────────────────────────

export async function sendQuoteAction(quoteId: string): Promise<ActionResult> {
  await requireAuth()

  const db = getDb()
  const rows = await db
    .select({ quote: quotes, article: articles })
    .from(quotes)
    .innerJoin(articles, eq(quotes.articleId, articles.id))
    .where(eq(quotes.id, quoteId))
    .limit(1)

  const row = rows[0]
  if (!row) return { ok: false, error: 'Iqtibos topilmadi' }
  if (row.quote.status === 'sent') return { ok: false, error: "Bu iqtibos allaqachon jo'natilgan" }

  const config = await getSettings()

  let message
  try {
    message = renderQuoteMessage(config.quoteTemplate, {
      quote: row.quote.text,
      title: row.article.title,
      url: articleUrl(row.article.slug),
      date: new Date(),
      channel: config.channelUsername,
      timeZone: config.timezone,
    })
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }

  try {
    const sent = await sendMessage({ text: message.text })
    await db
      .update(quotes)
      .set({ status: 'sent', sentAt: new Date(), tgMessageId: sent.message_id })
      .where(eq(quotes.id, quoteId))
  } catch (error) {
    return { ok: false, error: explainTelegramError(error) }
  }

  revalidatePath('/admin/quotes')
  revalidatePath('/admin')
  return { ok: true, message: "Iqtibos kanalga jo'natildi" }
}

export async function setQuoteStatusAction(
  quoteId: string,
  status: 'pending' | 'skipped',
): Promise<ActionResult> {
  await requireAuth()
  await getDb().update(quotes).set({ status }).where(eq(quotes.id, quoteId))
  revalidatePath('/admin/quotes')
  revalidatePath('/admin')
  return { ok: true }
}

// ── Sozlamalar ────────────────────────────────────────────────────────

export async function saveSettingsAction(values: {
  timezone: string
  quoteTimeLocal: string
  channelUsername: string
  articleTemplate: string
  quoteTemplate: string
}): Promise<ActionResult> {
  await requireAuth()
  try {
    await updateSettings(values)
    revalidatePath('/admin/settings')
    return { ok: true, message: 'Sozlamalar saqlandi' }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function sendTestMessageAction(): Promise<ActionResult> {
  await requireAuth()
  try {
    await sendMessage({
      text: '✅ <b>Kundalik</b> ulanishi tekshirildi.\nBot kanalga yoza oladi.',
    })
    return { ok: true, message: "Test xabari kanalga jo'natildi" }
  } catch (error) {
    return { ok: false, error: explainTelegramError(error) }
  }
}
