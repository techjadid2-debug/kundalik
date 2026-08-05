/** Telegram cheklovlari — aylanib o'tib bo'lmaydi. */
export const CAPTION_LIMIT = 1024
export const MESSAGE_LIMIT = 4096

/** Hisobdagi kichik xatoliklar uchun zaxira. */
const SAFETY = 8

/**
 * Shablon ichida vaqtincha o'rin egallovchi belgi (U+0001).
 * Bo'shliq EMAS — aks holda `tidy()` uni yeb qo'yardi va o'lcham noto'g'ri hisoblanardi.
 * Foydalanuvchi matnida hech qachon uchramaydi.
 */
const SENTINEL = String.fromCharCode(1)

export const DEFAULT_ARTICLE_TEMPLATE = `📌 <b>{title}</b>

{lead}

{tags}

<a href="{url}">To'liq o'qish →</a>
{channel}`

export const DEFAULT_QUOTE_TEMPLATE = `❝ {quote} ❞

— <i>{title}</i>
<a href="{url}">→ maqolani o'qish</a>`

export function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replace(/"/g, '&quot;')
}

/**
 * Telegram xabar uzunligini HTML teglaridan keyingi KO'RINADIGAN matn bo'yicha hisoblaydi.
 * `<b>Salom</b>` = 5 belgi, 12 emas. Xom HTML bo'yicha hisoblash matnni keraksiz qisqartiradi.
 */
export function visibleLength(html: string): number {
  const withoutTags = html.replace(/<[^>]*>/g, '')
  const decoded = withoutTags
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&') // oxirida — aks holda ikki marta dekodlanadi
  return decoded.length
}

/** So'z chegarasida kesadi, surrogat juftlikni buzmaydi. */
export function truncateAtWord(text: string, max: number): string {
  if (max <= 0) return ''
  if (text.length <= max) return text

  let cut = text.slice(0, Math.max(0, max - 1)) // "…" uchun 1 belgi zaxira
  const lastSpace = cut.lastIndexOf(' ')
  if (lastSpace > max * 0.5) cut = cut.slice(0, lastSpace)
  cut = cut.replace(/[\s.,;:!?—–-]+$/u, '')
  if (/[\uD800-\uDBFF]$/.test(cut)) cut = cut.slice(0, -1) // yolg'iz surrogat

  return cut ? `${cut}…` : ''
}

function fillTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? values[key] : match,
  )
}

/** Bo'sh qolgan o'rinlardan keyingi ortiqcha bo'sh satrlarni yig'ishtiradi. */
function tidy(text: string): string {
  return text
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function formatTags(tags: string[]): string {
  return tags
    .map(
      (tag) =>
        '#' +
        tag
          .trim()
          .replace(/[^\p{L}\p{N}_]+/gu, '_')
          .replace(/^_+|_+$/g, ''),
    )
    .filter((tag) => tag.length > 1)
    .join(' ')
}

const UZ_MONTHS = [
  'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
  'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr',
]

export function formatDate(date: Date, timeZone = 'Asia/Tashkent'): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(date)
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0)
  return `${get('day')}-${UZ_MONTHS[get('month') - 1]}, ${get('year')}`
}

export type RenderResult = {
  text: string
  /** Kesilgan bo'lsa true */
  truncated: boolean
  /** Limitgacha qolgan belgilar soni */
  remaining: number
}

/**
 * Shablonni to'ldiradi va bitta maydonni (lead yoki quote) limitga sig'adigan qilib kesadi.
 * Qolgan maydonlar hech qachon kesilmaydi — ular sig'masa aniq xato tashlanadi.
 */
function renderWithBudget(args: {
  template: string
  values: Record<string, string>
  flexKey: string
  flexRaw: string
  limit: number
}): RenderResult {
  const { template, values, flexKey, flexRaw, limit } = args

  const skeleton = tidy(fillTemplate(template, { ...values, [flexKey]: SENTINEL }))
  const skeletonLength = visibleLength(skeleton) - 1 // sentinel o'zi hisobga kirmaydi
  const budget = limit - skeletonLength - SAFETY

  if (budget <= 0) {
    throw new Error(
      `Shablonning o'zgarmas qismi ${skeletonLength} belgi — Telegram limiti ${limit}. ` +
        `Sarlavha, teglar yoki shablonni qisqartiring.`,
    )
  }

  const flexValue = truncateAtWord(flexRaw, budget)
  // Funksiya-almashtiruvchi: matndagi `$&` kabi naqshlar talqin qilinmasligi uchun
  const text = tidy(skeleton.replace(SENTINEL, () => escapeHtml(flexValue)))

  return {
    text,
    truncated: flexValue.length < flexRaw.length,
    remaining: limit - visibleLength(text),
  }
}

export type ArticleVars = {
  title: string
  lead: string
  tags: string[]
  url: string
  date: Date
  channel: string
  timeZone?: string
}

export function renderArticleCaption(
  template: string,
  vars: ArticleVars,
  limit: number = CAPTION_LIMIT,
): RenderResult {
  return renderWithBudget({
    template: template || DEFAULT_ARTICLE_TEMPLATE,
    limit,
    flexKey: 'lead',
    flexRaw: vars.lead,
    values: {
      title: escapeHtml(vars.title),
      tags: escapeHtml(formatTags(vars.tags)),
      url: escapeAttribute(vars.url),
      date: escapeHtml(formatDate(vars.date, vars.timeZone)),
      channel: escapeHtml(vars.channel),
    },
  })
}

export type QuoteVars = {
  quote: string
  title: string
  url: string
  date: Date
  channel: string
  timeZone?: string
}

export function renderQuoteMessage(
  template: string,
  vars: QuoteVars,
  limit: number = MESSAGE_LIMIT,
): RenderResult {
  return renderWithBudget({
    template: template || DEFAULT_QUOTE_TEMPLATE,
    limit,
    flexKey: 'quote',
    flexRaw: vars.quote,
    values: {
      title: escapeHtml(vars.title),
      url: escapeAttribute(vars.url),
      date: escapeHtml(formatDate(vars.date, vars.timeZone)),
      channel: escapeHtml(vars.channel),
    },
  })
}
