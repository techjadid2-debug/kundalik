import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE, verifySession } from '@/lib/auth'

/**
 * Next.js 16 da `middleware.ts` → `proxy.ts` deb nomlanadi.
 * Bu yerda faqat sahifa darajasidagi himoya; API yo'llari o'z ichida ham tekshiradi.
 */
export default async function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value

  if (await verifySession(token)) return NextResponse.next()

  const login = new URL('/login', request.url)
  login.searchParams.set('keyin', request.nextUrl.pathname)
  return NextResponse.redirect(login)
}

export const config = {
  matcher: ['/admin/:path*'],
}
