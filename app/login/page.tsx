import { redirect } from 'next/navigation'
import { isAuthenticated } from '@/lib/guard'
import { LoginForm } from './login-form'

export const metadata = { title: 'Kirish' }

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  if (await isAuthenticated()) redirect('/admin')

  const params = await searchParams
  const next = typeof params.keyin === 'string' ? params.keyin : '/admin'

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-24">
      <div className="w-full max-w-xs">
        <h1 className="mb-1 text-2xl font-semibold tracking-tight">Kundalik</h1>
        <p className="mb-8 text-sm text-muted">Davom etish uchun parolni kiriting.</p>
        <LoginForm next={next} />
      </div>
    </main>
  )
}
