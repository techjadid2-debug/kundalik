/** O'zbek lotin alifbosidagi maxsus belgilar uchun moslik jadvali. */
const CHAR_MAP: Record<string, string> = {
  ʻ: '', ʼ: '', '‘': '', '’': '', "'": '', '`': '',
  ў: 'o', қ: 'q', ғ: 'g', ҳ: 'h',
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'j', з: 'z',
  и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'x', ц: 's', ч: 'ch', ш: 'sh',
  щ: 'sh', ъ: '', ы: 'i', ь: '', э: 'e', ю: 'yu', я: 'ya',
}

export function slugify(input: string): string {
  const lowered = input.toLowerCase().trim()

  let out = ''
  for (const char of lowered) {
    out += char in CHAR_MAP ? CHAR_MAP[char] : char
  }

  return (
    out
      // diakritikalarni ajratib tashlaymiz (é → e); \p{M} = kombinatsion belgilar
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80)
      .replace(/-+$/, '')
  )
}

/** Sarlavhadan slug yasaydi; bo'sh chiqsa sana asosidagi zaxira nom beradi. */
export function slugFromTitle(title: string, fallbackSeed = ''): string {
  const base = slugify(title)
  if (base) return base
  const seed = slugify(fallbackSeed)
  return seed || `maqola-${Math.floor(Date.now() / 1000)}`
}

/** Band bo'lgan sluglar ro'yxatiga qarab `-2`, `-3` qo'shadi. */
export function uniqueSlug(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base
  let n = 2
  while (taken.has(`${base}-${n}`)) n++
  return `${base}-${n}`
}
