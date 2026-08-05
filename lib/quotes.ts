import type { JSONContent } from '@tiptap/core'

const MIN_QUOTE_LENGTH = 3

function normalize(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

/**
 * Tiptap hujjatidan `iqtibos` marki bilan belgilangan matnlarni tartib bilan ajratib oladi.
 *
 * Yonma-yon turgan belgilangan bo'laklar (masalan bir qismi qalin bo'lsa) birlashtiriladi,
 * ammo blok chegarasi (paragraf, sarlavha, satr uzilishi) iqtibosni uzadi —
 * shuning uchun ikki xil paragrafdagi belgilar ikkita alohida iqtibos bo'ladi.
 */
export function extractQuotes(doc: JSONContent | null | undefined): string[] {
  if (!doc) return []

  const found: string[] = []
  let buffer = ''

  const flush = () => {
    const text = normalize(buffer)
    buffer = ''
    if (text.length >= MIN_QUOTE_LENGTH) found.push(text)
  }

  const walk = (node: JSONContent) => {
    if (node.type === 'text') {
      if (node.marks?.some((m) => m.type === 'iqtibos')) {
        buffer += node.text ?? ''
      } else {
        flush()
      }
      return
    }

    if (node.content) for (const child of node.content) walk(child)
    // Blok (yoki hardBreak kabi leaf) chegarasi — iqtibos shu yerda tugaydi
    flush()
  }

  walk(doc)
  flush()

  // Bir xil matn ikki marta belgilangan bo'lsa — bittasi qoladi
  const seen = new Set<string>()
  return found.filter((t) => {
    const key = t.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/** Hujjatdagi barcha matnni tekis satrga aylantiradi (paragraflar bo'sh satr bilan ajraladi). */
export function docToPlainText(doc: JSONContent | null | undefined): string {
  if (!doc) return ''
  const blocks: string[] = []
  let current = ''

  const walk = (node: JSONContent, isBlock: boolean) => {
    if (node.type === 'text') {
      current += node.text ?? ''
      return
    }
    if (node.type === 'hardBreak') {
      current += ' '
      return
    }
    if (node.content) for (const child of node.content) walk(child, false)
    if (isBlock) {
      const t = normalize(current)
      current = ''
      if (t) blocks.push(t)
    }
  }

  for (const child of doc.content ?? []) walk(child, true)
  const tail = normalize(current)
  if (tail) blocks.push(tail)

  return blocks.join('\n\n')
}

/** Birinchi paragrafdan Telegram uchun lid taklif qiladi. */
export function suggestLead(doc: JSONContent | null | undefined, maxLength = 320): string {
  const first = docToPlainText(doc).split('\n\n')[0] ?? ''
  if (first.length <= maxLength) return first
  return first.slice(0, maxLength).replace(/\s+\S*$/, '') + '…'
}
