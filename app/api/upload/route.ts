import { put } from '@vercel/blob'
import { guardRoute } from '@/lib/guard'
import { slugify } from '@/lib/slug'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
/** Telegram URL orqali rasm olayotganda 5 MB dan oshmasligi kerak. */
const MAX_BYTES = 5 * 1024 * 1024

export async function POST(request: Request) {
  const denied = await guardRoute()
  if (denied) return denied

  const form = await request.formData().catch(() => null)
  const file = form?.get('file')

  if (!(file instanceof File)) {
    return Response.json({ error: 'Fayl yuborilmadi' }, { status: 400 })
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return Response.json({ error: 'Faqat JPEG, PNG yoki WebP' }, { status: 415 })
  }
  if (file.size > MAX_BYTES) {
    return Response.json(
      { error: `Rasm ${(file.size / 1024 / 1024).toFixed(1)} MB — Telegram uchun 5 MB dan kichik bo'lsin` },
      { status: 413 },
    )
  }

  const extension = file.type.split('/')[1].replace('jpeg', 'jpg')
  const base = slugify(file.name.replace(/\.[^.]+$/, '')) || 'muqova'

  try {
    const blob = await put(`covers/${base}.${extension}`, file, {
      access: 'public',
      addRandomSuffix: true,
      contentType: file.type,
    })
    return Response.json({ url: blob.url })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Yuklab bo\'lmadi' },
      { status: 500 },
    )
  }
}
