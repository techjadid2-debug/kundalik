/**
 * Saytning ommaviy manzili. Telegram shablonidagi {url} shu yerdan yasaladi,
 * shuning uchun u har doim tashqaridan ochiladigan to'liq URL bo'lishi kerak.
 */
export function siteOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (explicit) return explicit.replace(/\/+$/, '')

  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL
  if (production) return `https://${production}`

  const deployment = process.env.VERCEL_URL
  if (deployment) return `https://${deployment}`

  return 'http://localhost:3000'
}

export function articleUrl(slug: string): string {
  return `${siteOrigin()}/${slug}`
}
