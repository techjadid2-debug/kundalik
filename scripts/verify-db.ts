/**
 * Baza aylanmasini va server tomonidagi HTML renderini tekshiradi.
 * Yaratilgan sinov ma'lumotlari oxirida o'chiriladi.
 *   npm run verify:db
 */
import assert from 'node:assert/strict'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq } from 'drizzle-orm'
import { generateHTML } from '@tiptap/html/server'
import type { JSONContent } from '@tiptap/core'
import * as schema from '../lib/db/schema'
import { articles, quotes } from '../lib/db/schema'
import { editorExtensions } from '../lib/editor/extensions'
import { extractQuotes } from '../lib/quotes'

const doc: JSONContent = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Kirish gapi. ' },
        { type: 'text', text: 'Belgilangan gap.', marks: [{ type: 'iqtibos' }] },
      ],
    },
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Bo\'lim' }] },
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'Qalin', marks: [{ type: 'bold' }] }],
    },
  ],
}

async function main() {
  console.log('\nServer HTML renderi')

  const html = generateHTML(doc, editorExtensions)
  assert.ok(html.includes('data-iqtibos'), `iqtibos marki yo'q: ${html}`)
  assert.ok(html.includes('class="iqtibos"'), `iqtibos klassi yo'q: ${html}`)
  assert.ok(html.includes('<h2>'), 'sarlavha renderlanmadi')
  assert.ok(html.includes('<strong>'), 'qalin matn renderlanmadi')
  console.log('  ✓ generateHTML iqtibos markini saqlaydi')
  console.log(`    ${html.slice(0, 110)}…`)

  console.log('\nBaza aylanmasi')

  const url = process.env.DATABASE_URL
  assert.ok(url, "DATABASE_URL yo'q")
  const db = drizzle(neon(url), { schema })

  const slug = `sinov-${Date.now()}`
  const [created] = await db
    .insert(articles)
    .values({
      slug,
      title: 'Sinov maqolasi',
      lead: 'Sinov lidi',
      contentJson: doc,
      contentHtml: html,
      tags: ['sinov', 'kundalik'],
    })
    .returning()
  console.log('  ✓ maqola yozildi')

  try {
    const [read] = await db.select().from(articles).where(eq(articles.id, created.id))
    assert.equal(read.title, 'Sinov maqolasi')
    assert.deepEqual(read.tags, ['sinov', 'kundalik'])
    assert.equal(read.status, 'draft')
    console.log('  ✓ maqola o\'qildi (jsonb, text[], default status)')

    const texts = extractQuotes(read.contentJson as JSONContent)
    assert.deepEqual(texts, ['Belgilangan gap.'])

    await db
      .insert(quotes)
      .values(texts.map((text, position) => ({ articleId: created.id, text, position })))
    const savedQuotes = await db.select().from(quotes).where(eq(quotes.articleId, created.id))
    assert.equal(savedQuotes.length, 1)
    assert.equal(savedQuotes[0].status, 'pending')
    console.log('  ✓ iqtibos navbatga yozildi')

    // cascade o'chirish
    await db.delete(articles).where(eq(articles.id, created.id))
    const orphans = await db.select().from(quotes).where(eq(quotes.articleId, created.id))
    assert.equal(orphans.length, 0, 'cascade ishlamadi — yetim iqtiboslar qoldi')
    console.log('  ✓ maqola o\'chirilganda iqtiboslar ham o\'chdi (cascade)')
  } finally {
    await db.delete(articles).where(eq(articles.id, created.id))
  }

  console.log('\nHammasi joyida\n')
}

void main().catch((error) => {
  console.error('\n✗', error instanceof Error ? error.message : error, '\n')
  process.exit(1)
})
