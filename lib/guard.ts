import 'server-only'
import { cookies } from 'next/headers'
import { SESSION_COOKIE, verifySession } from './auth'

/** Server action / route handler ichida sessiyani tekshiradi. */
export async function isAuthenticated(): Promise<boolean> {
  const jar = await cookies()
  return verifySession(jar.get(SESSION_COOKIE)?.value)
}

/** Ruxsat yo'q bo'lsa xato tashlaydi — server action'lar uchun. */
export async function requireAuth(): Promise<void> {
  if (!(await isAuthenticated())) throw new Error('Ruxsat yo\'q')
}

/** Route handler'lar uchun: ruxsat yo'q bo'lsa 401 javobini qaytaradi. */
export async function guardRoute(): Promise<Response | null> {
  if (await isAuthenticated()) return null
  return Response.json({ error: 'Ruxsat yo\'q' }, { status: 401 })
}
