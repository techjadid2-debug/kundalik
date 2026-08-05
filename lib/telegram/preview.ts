/**
 * Telegram HTML'ini admin panelida xavfsiz ko'rsatish uchun tozalaydi.
 * Shablonni foydalanuvchi tahrirlay oladi, shuning uchun ruxsat etilgan
 * teglardan boshqasi (va barcha atributlar) olib tashlanadi.
 */
const ALLOWED_TAGS = new Set([
  'b', 'strong', 'i', 'em', 'u', 's', 'code', 'pre', 'br', 'a', 'blockquote',
])

export function sanitizeTelegramHtml(html: string): string {
  return html.replace(
    /<\/?([a-zA-Z][a-zA-Z0-9-]*)\b([^>]*)>/g,
    (match, rawTag: string, attrs: string) => {
      const tag = rawTag.toLowerCase()
      if (!ALLOWED_TAGS.has(tag)) return ''

      const isClosing = match.startsWith('</')
      if (isClosing) return `</${tag}>`

      if (tag === 'a') {
        const href = /href\s*=\s*"([^"]*)"/i.exec(attrs)?.[1] ?? ''
        if (!/^https?:\/\//i.test(href)) return '<a>'
        return `<a href="${href.replace(/"/g, '&quot;')}" target="_blank" rel="noopener noreferrer">`
      }

      return `<${tag}>`
    },
  )
}
