import { cookies } from 'next/headers'
import { SESSION_COOKIE, checkPassword, createSession } from '@/lib/auth'

export async function POST(request: Request) {
  let password = ''
  try {
    const body = (await request.json()) as { password?: unknown }
    password = typeof body.password === 'string' ? body.password : ''
  } catch {
    return Response.json({ error: "So'rov noto'g'ri" }, { status: 400 })
  }

  if (!process.env.ADMIN_PASSWORD) {
    return Response.json(
      { error: 'ADMIN_PASSWORD sozlanmagan — .env.local faylini to\'ldiring' },
      { status: 500 },
    )
  }

  if (!checkPassword(password)) {
    // Qo'pol kuch hujumini biroz sekinlashtiramiz
    await new Promise((r) => setTimeout(r, 400))
    return Response.json({ error: "Parol noto'g'ri" }, { status: 401 })
  }

  const { token, maxAge } = await createSession()
  const jar = await cookies()
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge,
  })

  return Response.json({ ok: true })
}
