'use client'

import { useMemo } from 'react'
import Image from 'next/image'
import { CAPTION_LIMIT, renderArticleCaption } from '@/lib/telegram/render'
import { sanitizeTelegramHtml } from '@/lib/telegram/preview'
import { cx } from '@/components/ui'

export function TelegramPreview({
  template,
  title,
  lead,
  tags,
  coverUrl,
  url,
  channel,
  timezone,
}: {
  template: string
  title: string
  lead: string
  tags: string[]
  coverUrl: string | null
  url: string
  channel: string
  timezone: string
}) {
  const result = useMemo(() => {
    try {
      const rendered = renderArticleCaption(template, {
        title: title || 'Sarlavha',
        lead,
        tags,
        url,
        date: new Date(),
        channel,
        timeZone: timezone,
      })
      return { ...rendered, error: null as string | null }
    } catch (error) {
      return {
        text: '',
        truncated: false,
        remaining: 0,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }, [template, title, lead, tags, url, channel, timezone])

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-xs uppercase tracking-wider text-muted">Telegram</span>
        {result.error ? null : (
          <span
            className={cx(
              'text-xs tabular-nums',
              result.truncated ? 'text-fg' : 'text-muted',
            )}
          >
            {CAPTION_LIMIT - result.remaining} / {CAPTION_LIMIT}
          </span>
        )}
      </div>

      <div className="border border-line bg-surface">
        {coverUrl ? (
          <div className="relative aspect-[3/2] w-full border-b border-line">
            <Image
              src={coverUrl}
              alt=""
              fill
              sizes="320px"
              className="object-cover"
              unoptimized
            />
          </div>
        ) : (
          <div className="flex aspect-[3/2] w-full items-center justify-center border-b border-line border-dashed text-xs text-muted">
            Muqova rasmi yo&apos;q
          </div>
        )}

        {result.error ? (
          <p className="p-3 text-sm">{result.error}</p>
        ) : (
          <div
            className="whitespace-pre-wrap break-words p-3 text-sm leading-relaxed [&_a]:underline [&_a]:underline-offset-2"
            dangerouslySetInnerHTML={{ __html: sanitizeTelegramHtml(result.text) }}
          />
        )}
      </div>

      {result.truncated ? (
        <p className="mt-1.5 text-xs text-muted">
          Lid 1024 belgiga sig&apos;magani uchun qisqartiriladi.
        </p>
      ) : null}
    </div>
  )
}
