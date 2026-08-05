'use client'

import { useTransition } from 'react'
import { newArticleAction } from '@/lib/actions'
import { Button } from '@/components/ui'

export function NewArticleButton() {
  const [pending, startTransition] = useTransition()

  return (
    <Button
      variant="solid"
      disabled={pending}
      onClick={() => startTransition(() => newArticleAction())}
    >
      {pending ? 'Ochilmoqda…' : 'Yangi maqola'}
    </Button>
  )
}
