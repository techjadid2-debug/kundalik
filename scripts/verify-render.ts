/**
 * Telegram shablon renderi va iqtibos ajratishni tekshiradi.
 * Ishga tushirish:  npm run verify:render
 */
import assert from 'node:assert/strict'
import type { JSONContent } from '@tiptap/core'
import {
  CAPTION_LIMIT,
  DEFAULT_ARTICLE_TEMPLATE,
  DEFAULT_QUOTE_TEMPLATE,
  buildArticleKeyboard,
  renderArticleCaption,
  renderQuoteMessage,
  visibleLength,
} from '../lib/telegram/render'
import { buildTelegramSummary, extractQuotes, suggestLead } from '../lib/quotes'

let passed = 0
function check(name: string, fn: () => void) {
  try {
    fn()
    passed++
    console.log(`  ✓ ${name}`)
  } catch (error) {
    console.error(`  ✗ ${name}`)
    console.error(`    ${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 1
  }
}

const base = {
  title: 'Kundalik haqida',
  tags: ['kundalik', 'yozuv'],
  url: 'https://kundalik.uz/kundalik-haqida',
  date: new Date('2026-08-05T10:00:00Z'),
  channel: '@kundalik_kanal',
}

console.log('\nTelegram render')

check('oddiy maqola limitga sig\'adi', () => {
  const r = renderArticleCaption(DEFAULT_ARTICLE_TEMPLATE, { ...base, lead: 'Qisqa lid matni.' })
  assert.ok(visibleLength(r.text) <= CAPTION_LIMIT)
  assert.equal(r.truncated, false)
  assert.ok(r.text.includes('Qisqa lid matni.'))
  assert.ok(r.text.includes('#kundalik #yozuv'))
})

check('juda uzun lid 1024 ga kesiladi', () => {
  const lead = 'Salom dunyo '.repeat(400) // ~4800 belgi
  const r = renderArticleCaption(DEFAULT_ARTICLE_TEMPLATE, { ...base, lead })
  const len = visibleLength(r.text)
  assert.ok(len <= CAPTION_LIMIT, `uzunlik ${len} > ${CAPTION_LIMIT}`)
  assert.ok(len > CAPTION_LIMIT - 60, `juda ko'p kesilgan: ${len}`)
  assert.equal(r.truncated, true)
  assert.ok(r.text.includes('…'))
})

check('so\'z o\'rtasidan kesmaydi', () => {
  const lead = 'antidisestablishmentarianism '.repeat(60)
  const r = renderArticleCaption(DEFAULT_ARTICLE_TEMPLATE, { ...base, lead })
  const body = r.text.split('…')[0]
  assert.ok(
    body.endsWith('antidisestablishmentarianism'),
    `so'z yarmida kesilgan: ...${body.slice(-40)}`,
  )
})

check('HTML in\'yeksiyasi qochiriladi', () => {
  const r = renderArticleCaption(DEFAULT_ARTICLE_TEMPLATE, {
    ...base,
    title: '<script>alert(1)</script>',
    lead: 'A & B < C',
  })
  assert.ok(!r.text.includes('<script>'))
  assert.ok(r.text.includes('&lt;script&gt;'))
  assert.ok(r.text.includes('A &amp; B &lt; C'))
})

check('matndagi $& naqshi buzilmaydi', () => {
  const r = renderArticleCaption(DEFAULT_ARTICLE_TEMPLATE, {
    ...base,
    lead: 'Narx $& $` $\' $1 belgilari',
  })
  // `&` HTML uchun qochiriladi, ammo `$`-naqshlar talqin qilinmasligi shart
  assert.ok(r.text.includes("Narx $&amp; $` $' $1 belgilari"), r.text)
})

check('bo\'sh lid ortiqcha bo\'sh satr qoldirmaydi', () => {
  const r = renderArticleCaption(DEFAULT_ARTICLE_TEMPLATE, { ...base, lead: '' })
  assert.ok(!/\n\n\n/.test(r.text), `ortiqcha bo'sh satr: ${JSON.stringify(r.text)}`)
  assert.ok(!r.text.includes(String.fromCharCode(1)), 'sentinel matnda qolib ketgan')
})

check('teglar hashtag ko\'rinishiga keltiriladi', () => {
  const r = renderArticleCaption(DEFAULT_ARTICLE_TEMPLATE, {
    ...base,
    tags: ['ikki so\'z', 'oddiy'],
    lead: 'lid',
  })
  assert.ok(r.text.includes('#ikki_so_z'), r.text)
  assert.ok(r.text.includes('#oddiy'))
})

check('sarlavha juda uzun bo\'lsa aniq xato beradi', () => {
  assert.throws(
    () => renderArticleCaption(DEFAULT_ARTICLE_TEMPLATE, { ...base, title: 'A'.repeat(1200), lead: 'x' }),
    /Telegram limiti 1024/,
  )
})

check('iqtibos xabari renderlanadi', () => {
  const r = renderQuoteMessage(DEFAULT_QUOTE_TEMPLATE, {
    ...base,
    quote: 'Yozish — bu o\'ylashning ko\'rinadigan shakli.',
  })
  assert.ok(r.text.includes("Yozish — bu o'ylashning ko'rinadigan shakli."))
  assert.ok(r.text.includes('<i>Kundalik haqida</i>'))
  assert.equal(r.truncated, false)
})

check('inline keyboard maqola va kanal havolasini beradi', () => {
  const keyboard = buildArticleKeyboard(base)
  assert.equal(keyboard.inline_keyboard[0].length, 2)
  assert.equal(keyboard.inline_keyboard[0][0].url, base.url)
  assert.equal(keyboard.inline_keyboard[0][1].url, 'https://t.me/kundalik_kanal')
})

check('raqamli kanal id uchun public tugma chiqmaydi', () => {
  const keyboard = buildArticleKeyboard({ ...base, channel: '-1001234567890' })
  assert.equal(keyboard.inline_keyboard[0].length, 1)
})

console.log('\nIqtibos ajratish')

const doc: JSONContent = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Oddiy matn. ' },
        { type: 'text', text: 'Birinchi ', marks: [{ type: 'iqtibos' }] },
        { type: 'text', text: 'iqtibos', marks: [{ type: 'iqtibos' }, { type: 'bold' }] },
        { type: 'text', text: ' yana oddiy.' },
      ],
    },
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'Ikkinchi iqtibos', marks: [{ type: 'iqtibos' }] }],
    },
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'Belgilanmagan paragraf.' }],
    },
  ],
}

check('yonma-yon bo\'laklar birlashadi, paragraf uzadi', () => {
  assert.deepEqual(extractQuotes(doc), ['Birinchi iqtibos', 'Ikkinchi iqtibos'])
})

check('takroriy iqtibos bir marta olinadi', () => {
  const dup: JSONContent = {
    type: 'doc',
    content: [
      { type: 'paragraph', content: [{ type: 'text', text: 'Bir xil', marks: [{ type: 'iqtibos' }] }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'Bir xil', marks: [{ type: 'iqtibos' }] }] },
    ],
  }
  assert.deepEqual(extractQuotes(dup), ['Bir xil'])
})

check('belgilanmagan hujjat bo\'sh ro\'yxat beradi', () => {
  assert.deepEqual(extractQuotes({ type: 'doc', content: [] }), [])
  assert.deepEqual(extractQuotes(null), [])
})

check('lid birinchi paragrafdan taklif qilinadi', () => {
  assert.equal(suggestLead(doc), 'Oddiy matn. Birinchi iqtibos yana oddiy.')
})

check('Telegram xulosasi lid va maqola punktlarini yig\'adi', () => {
  const summary = buildTelegramSummary(doc, 'Kirish matni.')
  assert.ok(summary.startsWith('Kirish matni.'))
  assert.ok(summary.includes('• Oddiy matn. Birinchi iqtibos yana oddiy.'))
  assert.ok(summary.includes('• Ikkinchi iqtibos'))
})

console.log(`\n${passed} ta tekshiruv o'tdi\n`)
