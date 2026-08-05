'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'

export function LogoutButton() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  return (
    <button
      type="button"
      className="text-sm text-muted transition-colors hover:text-fg disabled:opacity-40"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await fetch('/api/auth/logout', { method: 'POST' })
          router.replace('/login')
          router.refresh()
        })
      }}
    >
      Chiqish
    </button>
  )
}
