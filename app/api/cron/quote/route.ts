import { eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { quotes } from '@/lib/db/schema'
import { claimNextPendingQuote, releaseQuote } from '@/lib/quote-queue'
import { getSettings } from '@/lib/settings'
import { renderQuoteMessage } from '@/lib/telegram/render'
import { sendMessage } from '@/lib/telegram/client'
import { explainTelegramError } from '@/lib/telegram/errors'
import { articleUrl } from '@/lib/site'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Kunlik iqtibos. Vercel Cron `Authorization: Bearer $CRON_SECRET` yuboradi.
 * Lokalda sinash:
 *   curl -H "Authorization: Bearer $CRON_SECRET" localhost:3000/api/cron/quote
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return Response.json({ error: 'CRON_SECRET sozlanmagan' }, { status: 500 })
  }
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'Ruxsat yo\'q' }, { status: 401 })
  }

  const next = await claimNextPendingQuote()
  if (!next) {
    // Navbat bo'sh — bu xato emas
    return new Response(null, { status: 204 })
  }

  const settings = await getSettings()

  let message
  try {
    message = renderQuoteMessage(settings.quoteTemplate, {
      quote: next.quote.text,
      title: next.article.title,
      url: articleUrl(next.article.slug),
      date: new Date(),
      channel: settings.channelUsername,
      timeZone: settings.timezone,
    })
  } catch (error) {
    await releaseQuote(next.quote.id)
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }

  try {
    const sent = await sendMessage({ text: message.text })
    await getDb()
      .update(quotes)
      .set({ status: 'sent', sentAt: new Date(), tgMessageId: sent.message_id })
      .where(eq(quotes.id, next.quote.id))

    return Response.json({
      sent: true,
      quoteId: next.quote.id,
      messageId: sent.message_id,
      text: next.quote.text,
    })
  } catch (error) {
    await releaseQuote(next.quote.id)
    return Response.json({ error: explainTelegramError(error) }, { status: 502 })
  }
}
