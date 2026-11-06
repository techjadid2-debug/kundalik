import { put } from '@vercel/blob'
import { guardRoute } from '@/lib/guard'
import { slugify } from '@/lib/slug'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
/** Telegram URL orqali rasm olayotganda 5 MB dan oshmasligi kerak. */
const MAX_BYTES = 5 * 1024 * 1024

async function hasValidSignature(file: File): Promise<boolean> {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  const hex = Array.from(bytes).map((value) => value.toString(16).padStart(2, '0')).join('')
  if (file.type === 'image/jpeg') return hex.startsWith('ffd8ff')
  if (file.type === 'image/png') return hex.startsWith('89504e470d0a1a0a')
  if (file.type === 'image/webp') return hex.startsWith('52494646') && hex.slice(16, 24) === '57454250'
  return false
}

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
  if (!(await hasValidSignature(file))) {
    return Response.json({ error: 'Rasm fayli imzosi noto\'g\'ri' }, { status: 415 })
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
