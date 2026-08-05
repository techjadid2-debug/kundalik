'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'

export function LogoutButton() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  return (
    <button
      type="button"
      className="-mx-2 rounded-md px-2 py-1 text-sm text-muted hover:bg-hover hover:text-fg disabled:opacity-40"
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
