/**
 * Uchdan-uchgacha sinov: rasm yuklash → maqola posti → postni yangilash →
 * iqtibos posti → HAMMASINI DARHOL O'CHIRISH.
 *
 * Kanalda post bir necha soniya turadi. Xato bo'lsa ham `finally` blokida
 * o'chiriladi, shuning uchun kanalda hech narsa qolmaydi.
 *
 *   npm run verify:e2e
 */
import { deflateSync } from 'node:zlib'
import { del, put } from '@vercel/blob'
import { deleteMessage, editPhotoPost, sendMessage, sendPhoto } from '../lib/telegram/client'
import { explainTelegramError } from '../lib/telegram/errors'
import {
  DEFAULT_ARTICLE_TEMPLATE,
  DEFAULT_QUOTE_TEMPLATE,
  renderArticleCaption,
  renderQuoteMessage,
  visibleLength,
} from '../lib/telegram/render'

/** Bog'liqliksiz PNG generatori — sinov muqovasi uchun. */
function makePng(width: number, height: number, rgb: [number, number, number]): Buffer {
  const raw = Buffer.alloc((width * 3 + 1) * height)
  let offset = 0
  for (let y = 0; y < height; y++) {
    raw[offset++] = 0 // filter: none
    for (let x = 0; x < width; x++) {
      // yengil gradient — bir xil rangli rasm ba'zan siqilib g'alati ko'rinadi
      const shade = Math.floor((x / width) * 40)
      raw[offset++] = Math.min(255, rgb[0] + shade)
      raw[offset++] = Math.min(255, rgb[1] + shade)
      raw[offset++] = Math.min(255, rgb[2] + shade)
    }
  }

  const chunk = (type: string, data: Buffer): Buffer => {
    const length = Buffer.alloc(4)
    length.writeUInt32BE(data.length)
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(body) >>> 0)
    return Buffer.concat([length, body, crc])
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // colour type: truecolour

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  return table
})()

function crc32(buf: Buffer): number {
  let c = -1
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8)
  return c ^ -1
}

const ARTICLE = {
  title: 'Sinov posti — bir necha soniyada o‘chiriladi',
  lead: 'Bu Kundalik tizimining ulanish sinovi. Post avtomatik ravishda darhol o‘chiriladi, obunachilar uchun hech narsa qolmaydi.',
  tags: ['sinov'],
  url: 'https://kundalik-xi.vercel.app/sinov',
  channel: '@tech_jadid',
}

const QUOTE = 'Belgilangan gap alohida post bo‘lib chiqadi — iqtibos mexanizmi shunday ishlaydi.'

async function main() {
  const posted: number[] = []
  let blobUrl: string | null = null

  try {
    // 1. Muqova rasmini Blob'ga yuklaymiz
    const png = makePng(1200, 800, [20, 20, 20])
    const blob = await put(`sinov/e2e-${Date.now()}.png`, png, {
      access: 'public',
      contentType: 'image/png',
      addRandomSuffix: true,
    })
    blobUrl = blob.url
    console.log(`✓ Muqova yuklandi (${(png.length / 1024).toFixed(0)} KB)`)

    // 2. Shablonni renderlaymiz
    const caption = renderArticleCaption(DEFAULT_ARTICLE_TEMPLATE, {
      ...ARTICLE,
      date: new Date(),
    })
    console.log(`✓ Caption renderlandi — ${visibleLength(caption.text)}/1024 belgi`)

    // 3. Kanalga chop etamiz
    const post = await sendPhoto({ photoUrl: blobUrl, caption: caption.text })
    posted.push(post.message_id)
    console.log(`✓ Maqola posti kanalga chiqdi (message_id=${post.message_id})`)

    // 4. Yangilash yo'lini sinaymiz
    const updated = renderArticleCaption(DEFAULT_ARTICLE_TEMPLATE, {
      ...ARTICLE,
      title: 'Sinov posti — yangilandi',
      date: new Date(),
    })
    await editPhotoPost({
      messageId: post.message_id,
      photoUrl: blobUrl,
      caption: updated.text,
    })
    console.log('✓ Post yangilandi (editMessageMedia)')

    // 5. Iqtibos postini sinaymiz
    const quote = renderQuoteMessage(DEFAULT_QUOTE_TEMPLATE, {
      quote: QUOTE,
      title: ARTICLE.title,
      url: ARTICLE.url,
      date: new Date(),
      channel: ARTICLE.channel,
    })
    const quotePost = await sendMessage({ text: quote.text })
    posted.push(quotePost.message_id)
    console.log(`✓ Iqtibos posti kanalga chiqdi (message_id=${quotePost.message_id})`)
  } catch (error) {
    console.error(`\n✗ ${explainTelegramError(error)}`)
    process.exitCode = 1
  } finally {
    // 6. Tozalash — xato bo'lsa ham ishlaydi
    for (const id of posted) {
      try {
        await deleteMessage(id)
        console.log(`✓ ${id} o'chirildi`)
      } catch (error) {
        console.error(`✗ ${id} o'chmadi: ${explainTelegramError(error)}`)
        process.exitCode = 1
      }
    }
    if (blobUrl) {
      await del(blobUrl).catch(() => {})
      console.log('✓ Sinov rasmi Blob\'dan o\'chirildi')
    }
  }

  if (!process.exitCode) console.log('\nUchdan-uchgacha sinov o\'tdi. Kanal toza.\n')
}

void main()
