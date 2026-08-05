import { SignJWT, jwtVerify } from 'jose'

export const SESSION_COOKIE = 'kundalik_session'
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30 // 30 kun

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET
  if (!secret || secret.length < 16) {
    throw new Error("AUTH_SECRET sozlanmagan (kamida 16 belgi bo'lishi kerak)")
  }
  return new TextEncoder().encode(secret)
}

/** Parol to'g'ri bo'lsa imzolangan sessiya tokenini qaytaradi. */
export async function createSession(): Promise<{ token: string; maxAge: number }> {
  const token = await new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secretKey())

  return { token, maxAge: MAX_AGE_SECONDS }
}

/** Middleware va server komponentlarida ishlaydi (Web Crypto — Node API'siz). */
export async function verifySession(token: string | undefined): Promise<boolean> {
  if (!token) return false
  try {
    const { payload } = await jwtVerify(token, secretKey())
    return payload.role === 'admin'
  } catch {
    return false
  }
}

/**
 * Parolni doimiy vaqtda solishtiradi — javob vaqti bo'yicha parolni
 * belgima-belgi topib bo'lmasligi uchun.
 */
export function checkPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected) return false

  const a = new TextEncoder().encode(input)
  const b = new TextEncoder().encode(expected)
  let diff = a.length ^ b.length
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    diff |= (a[i] ?? 0) ^ (b[i] ?? 0)
  }
  return diff === 0
}
