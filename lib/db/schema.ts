import { sql } from 'drizzle-orm'
import {
  bigint,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import type { JSONContent } from '@tiptap/core'

const EMPTY_DOC: JSONContent = { type: 'doc', content: [] }

export const articles = pgTable(
  'articles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull().unique(),
    title: text('title').notNull().default(''),
    /** Telegram preview matni — 1-paragrafdan avto to'ldiriladi, qo'lda tahrirlanadi */
    lead: text('lead').notNull().default(''),
    /** Manba haqiqat — Tiptap hujjati */
    contentJson: jsonb('content_json').$type<JSONContent>().notNull().default(EMPTY_DOC),
    /** Server'da render qilingan HTML — ochiq saytda ko'rsatish uchun */
    contentHtml: text('content_html').notNull().default(''),
    coverUrl: text('cover_url'),
    tags: text('tags').array().notNull().default(sql`ARRAY[]::text[]`),
    status: text('status', { enum: ['draft', 'published'] })
      .notNull()
      .default('draft'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    /** Chop etilgan Telegram xabari — keyin caption'ni tahrirlash uchun */
    tgMessageId: bigint('tg_message_id', { mode: 'number' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('articles_status_published_idx').on(t.status, t.publishedAt)],
)

export const quotes = pgTable(
  'quotes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    articleId: uuid('article_id')
      .notNull()
      .references(() => articles.id, { onDelete: 'cascade' }),
    text: text('text').notNull(),
    /** Maqola ichidagi tartib */
    position: integer('position').notNull().default(0),
    status: text('status', { enum: ['pending', 'sent', 'skipped'] })
      .notNull()
      .default('pending'),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    tgMessageId: bigint('tg_message_id', { mode: 'number' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('quotes_status_idx').on(t.status, t.position)],
)

/** Bitta qatorli jadval — har doim id = 1 */
export const settings = pgTable('settings', {
  id: integer('id').primaryKey().default(1),
  timezone: text('timezone').notNull().default('Asia/Tashkent'),
  /** Kunlik iqtibos vaqti (mahalliy) — faqat ko'rsatish uchun; haqiqiy jadval vercel.json'da */
  quoteTimeLocal: text('quote_time_local').notNull().default('09:00'),
  channelUsername: text('channel_username').notNull().default(''),
  articleTemplate: text('article_template').notNull().default(''),
  quoteTemplate: text('quote_template').notNull().default(''),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type Article = typeof articles.$inferSelect
export type NewArticle = typeof articles.$inferInsert
export type Quote = typeof quotes.$inferSelect
export type Settings = typeof settings.$inferSelect
