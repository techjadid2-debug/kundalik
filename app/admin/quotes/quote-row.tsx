'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { sendQuoteAction, setQuoteStatusAction } from '@/lib/actions'
import { Badge, Notice } from '@/components/ui'

export function QuoteRow({
  id,
  text,
  status,
  articleTitle,
  articleId,
  note,
  disabled,
}: {
  id: string
  text: string
  status: 'pending' | 'skipped'
  articleTitle: string
  articleId: string
  note?: string
  disabled?: boolean
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="flex gap-4 border-b border-line py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-relaxed">{text}</p>
        <div className="mt-1.5 flex items-center gap-2">
          <Link
            href={`/admin/write/${articleId}`}
            className="text-xs text-muted underline underline-offset-4 hover:text-fg"
          >
            {articleTitle || 'Sarlavhasiz'}
          </Link>
          {note ? <Badge>{note}</Badge> : null}
        </div>
        {error ? (
          <div className="mt-2">
            <Notice tone="error">{error}</Notice>
          </div>
        ) : null}
      </div>

      <div className="flex shrink-0 items-start gap-3 text-xs">
        {status === 'pending' ? (
          <>
            <button
              type="button"
              disabled={pending || disabled}
              title={disabled ? 'Avval maqolani chop eting' : undefined}
              className="-mx-2 rounded-md px-2 py-1 text-muted hover:bg-hover hover:text-fg disabled:opacity-30 disabled:hover:bg-transparent"
              onClick={() =>
                startTransition(async () => {
                  setError(null)
                  const result = await sendQuoteAction(id)
                  if (!result.ok) setError(result.error)
                })
              }
            >
              {pending ? '…' : "Hozir jo'nat"}
            </button>
            <button
              type="button"
              disabled={pending}
              className="-mx-2 rounded-md px-2 py-1 text-muted hover:bg-hover hover:text-fg disabled:opacity-30 disabled:hover:bg-transparent"
              onClick={() => startTransition(() => setQuoteStatusAction(id, 'skipped').then(() => {}))}
            >
              O&apos;tkazib yubor
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={pending}
            className="-mx-2 rounded-md px-2 py-1 text-muted hover:bg-hover hover:text-fg disabled:opacity-30 disabled:hover:bg-transparent"
            onClick={() => startTransition(() => setQuoteStatusAction(id, 'pending').then(() => {}))}
          >
            Navbatga qaytar
          </button>
        )}
      </div>
    </div>
  )
}
