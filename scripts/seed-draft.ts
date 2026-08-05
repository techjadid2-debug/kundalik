/**
 * Qo'lda sinash uchun bitta qoralama yaratadi (iqtibos belgilangan holda).
 *   npx dotenv -e .env.local -- npx tsx scripts/seed-draft.ts
 * O'chirish:
 *   npx dotenv -e .env.local -- npx tsx scripts/seed-draft.ts --clean
 */
import { like } from 'drizzle-orm'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from '../lib/db/schema'

async function main() {
  const db = drizzle(neon(process.env.DATABASE_URL!), { schema })

  if (process.argv.includes('--clean')) {
    const removed = await db
      .delete(schema.articles)
      .where(like(schema.articles.slug, 'sinov-%'))
      .returning({ id: schema.articles.id })
    console.log(`${removed.length} ta sinov maqolasi o'chirildi`)
    return
  }

  const [article] = await db
    .insert(schema.articles)
    .values({
      slug: `sinov-${Date.now()}`,
      title: 'Sinov qoralamasi',
      lead: 'Bu qoralama editorni sinash uchun yaratilgan.',
      contentJson: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Oddiy gap. ' },
              { type: 'text', text: 'Bu gap iqtibos.', marks: [{ type: 'iqtibos' }] },
            ],
          },
        ],
      },
    })
    .returning()

  console.log(article.id)
}

void main()
