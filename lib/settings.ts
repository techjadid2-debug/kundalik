import 'server-only'
import { eq } from 'drizzle-orm'
import { getDb } from './db'
import { settings, type Settings } from './db/schema'
import { DEFAULT_ARTICLE_TEMPLATE, DEFAULT_QUOTE_TEMPLATE } from './telegram/render'

const SINGLETON_ID = 1

function withDefaults(row: Settings): Settings {
  return {
    ...row,
    articleTemplate: row.articleTemplate || DEFAULT_ARTICLE_TEMPLATE,
    quoteTemplate: row.quoteTemplate || DEFAULT_QUOTE_TEMPLATE,
    channelUsername: row.channelUsername || (process.env.TELEGRAM_CHANNEL_ID ?? ''),
  }
}

/** Sozlamalar qatorini o'qiydi; birinchi murojaatda standart qiymatlar bilan yaratadi. */
export async function getSettings(): Promise<Settings> {
  const db = getDb()

  const existing = await db.select().from(settings).where(eq(settings.id, SINGLETON_ID)).limit(1)
  if (existing[0]) return withDefaults(existing[0])

  const created = await db
    .insert(settings)
    .values({
      id: SINGLETON_ID,
      articleTemplate: DEFAULT_ARTICLE_TEMPLATE,
      quoteTemplate: DEFAULT_QUOTE_TEMPLATE,
      channelUsername: process.env.TELEGRAM_CHANNEL_ID ?? '',
    })
    .onConflictDoNothing()
    .returning()

  if (created[0]) return withDefaults(created[0])

  // Boshqa so'rov bir vaqtda yaratib ulgurgan — qaytadan o'qiymiz
  const raced = await db.select().from(settings).where(eq(settings.id, SINGLETON_ID)).limit(1)
  if (!raced[0]) throw new Error('Sozlamalar qatorini yaratib bo\'lmadi')
  return withDefaults(raced[0])
}

export async function updateSettings(
  values: Partial<Pick<Settings, 'timezone' | 'quoteTimeLocal' | 'channelUsername' | 'articleTemplate' | 'quoteTemplate'>>,
): Promise<Settings> {
  await getSettings() // qator borligiga kafolat
  const db = getDb()
  const updated = await db
    .update(settings)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(settings.id, SINGLETON_ID))
    .returning()
  return withDefaults(updated[0])
}
