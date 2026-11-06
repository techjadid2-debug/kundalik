'use client'

import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { Input, Notice } from '@/components/ui'
import { ActionButton } from '@/components/action-button'

export function LoginForm({ next }: { next: string }) {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = (await res.json()) as { error?: string }

      if (!res.ok) {
        setError(data.error ?? "Kirib bo'lmadi")
        setPending(false)
        return
      }

      // Ochiq redirect bo'lmasligi uchun faqat ichki yo'llarga ruxsat
      router.replace(next.startsWith('/') && !next.startsWith('//') ? next : '/admin')
      router.refresh()
    } catch {
      setError('Tarmoq xatosi')
      setPending(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Input
        type="password"
        name="password"
        autoComplete="current-password"
        placeholder="Parol"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoFocus
        required
      />
      <ActionButton type="submit" variant="solid" className="w-full" pending={pending} pendingLabel="Tekshirilmoqda…" disabled={!password}>
        Kirish
      </ActionButton>
      {error ? <Notice tone="error">{error}</Notice> : null}
    </form>
  )
}
