'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
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
  type ArticlePatch,
} from './articles'
import { buildTelegramSummary, extractQuotes } from './quotes'
import { getSettings, updateSettings } from './settings'
import { buildArticleKeyboard, renderArticleCaption, renderQuoteMessage } from './telegram/render'
import { editPhotoPost, sendMessage, sendPhoto } from './telegram/client'
import { explainTelegramError } from './telegram/errors'
import { articleUrl } from './site'

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string }

function refreshPublicContent(slug?: string) {
  revalidateTag('articles', 'max')
  if (slug) {
    revalidateTag(`article:${slug}`, 'max')
    revalidatePath(`/${slug}`)
  }
  revalidatePath('/')
}

// ── Maqola ────────────────────────────────────────────────────────────

export async function newArticleAction(): Promise<void> {
  await requireAuth()
  const draft = await createDraft()
  revalidatePath('/admin')
  redirect(`/admin/write/${draft.id}`)
}

export async function saveArticleAction(id: string, patch: ArticlePatch): Promise<ActionResult> {
  await requireAuth()
  try {
    if (patch.contentType && !['article', 'short', 'media'].includes(patch.contentType)) {
      return { ok: false, error: 'Kontent turi noto\'g\'ri' }
    }
    if (patch.contentType === 'media' && patch.mediaUrl && !['YouTube', 'Vimeo'].includes(patch.mediaProvider ?? '')) {
      return { ok: false, error: 'Media provider qo\'llab-quvvatlanmaydi' }
    }
    const saved = await saveDraft(id, patch)
    if (patch.contentJson) {
      await syncQuotes(id, extractQuotes(patch.contentJson))
      revalidatePath('/admin/quotes')
    }
    if (saved.status === 'published') refreshPublicContent(saved.slug)
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function scheduleArticleAction(id: string, scheduledAt: Date): Promise<ActionResult> {
  await requireAuth()
  if (Number.isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) {
    return { ok: false, error: 'Kelajakdagi vaqtni tanlang' }
  }
  const article = await getArticle(id)
  if (!article) return { ok: false, error: 'Maqola topilmadi' }
  await getDb()
    .update(articles)
    .set({ status: 'published', publishedAt: scheduledAt, scheduledAt, updatedAt: new Date() })
    .where(eq(articles.id, id))
  refreshPublicContent(article.slug)
  revalidatePath('/admin')
  return { ok: true, message: 'Maqola rejalashtirildi' }
}

export async function deleteArticleAction(id: string): Promise<void> {
  await requireAuth()
  const article = await getArticle(id)
  await removeArticle(id)
  revalidatePath('/admin')
  refreshPublicContent(article?.slug)
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
  if (article.contentType !== 'short' && !article.lead.trim()) return { ok: false, error: 'Lid matni kiritilmagan' }
  if (article.contentType !== 'media' && !article.coverUrl) return { ok: false, error: 'Muqova rasmi yuklanmagan' }
  if (article.contentType === 'media' && !article.mediaUrl) return { ok: false, error: 'Media havolasi kiritilmagan' }

  const config = await getSettings()

  let caption
  try {
    caption = renderArticleCaption(config.articleTemplate, {
      title: article.title,
      lead: article.lead,
      summary: buildTelegramSummary(article.contentJson as JSONContent, article.lead),
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
  const replyMarkup = buildArticleKeyboard({
    url: articleUrl(article.slug),
    channel: config.channelUsername,
  })

  try {
    if (isUpdate && article.coverUrl) {
      await editPhotoPost({
        messageId: publishedMessageId,
        photoUrl: article.coverUrl,
        caption: caption.text,
        replyMarkup,
      })
    } else if (!isUpdate && article.coverUrl) {
      const sent = await sendPhoto({ photoUrl: article.coverUrl, caption: caption.text, replyMarkup })
      await getDb()
        .update(articles)
        .set({ tgMessageId: sent.message_id })
        .where(eq(articles.id, id))
    } else if (!isUpdate && article.mediaUrl) {
      const sent = await sendMessage({ text: `${caption.text}\n\n${article.mediaUrl}`, replyMarkup })
      await getDb()
        .update(articles)
        .set({ tgMessageId: sent.message_id })
        .where(eq(articles.id, id))
    } else {
      return { ok: false, error: 'Media postini yangilash uchun hozircha cover rasmi kerak' }
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

  refreshPublicContent(article.slug)
  revalidatePath('/admin')
  revalidatePath('/admin/quotes')

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
