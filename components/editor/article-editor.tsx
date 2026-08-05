'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import type { JSONContent } from '@tiptap/core'
import { publishArticleAction, saveArticleAction, deleteArticleAction } from '@/lib/actions'
import { extractQuotes, suggestLead } from '@/lib/quotes'
import { Button, Field, Input, Notice, Textarea } from '@/components/ui'
import { TiptapEditor } from './tiptap-editor'
import { TelegramPreview } from './telegram-preview'
import { CoverPicker } from './cover-picker'

const AUTOSAVE_DELAY_MS = 1200

export type EditorArticle = {
  id: string
  slug: string
  title: string
  lead: string
  contentJson: JSONContent
  coverUrl: string | null
  tags: string[]
  status: 'draft' | 'published'
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export function ArticleEditor({
  article,
  template,
  channel,
  timezone,
  origin,
}: {
  article: EditorArticle
  template: string
  channel: string
  timezone: string
  origin: string
}) {
  const [title, setTitle] = useState(article.title)
  const [lead, setLead] = useState(article.lead)
  const [doc, setDoc] = useState<JSONContent>(article.contentJson)
  const [coverUrl, setCoverUrl] = useState<string | null>(article.coverUrl)
  const [tagsText, setTagsText] = useState(article.tags.join(', '))

  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [publishResult, setPublishResult] = useState<
    { ok: true; message?: string } | { ok: false; error: string } | null
  >(null)
  const [publishing, startPublish] = useTransition()
  const [deleting, startDelete] = useTransition()

  const tags = useMemo(
    () => tagsText.split(',').map((t) => t.trim()).filter(Boolean),
    [tagsText],
  )
  const quoteTexts = useMemo(() => extractQuotes(doc), [doc])
  const url = `${origin}/${article.slug}`

  // ── Avto-saqlash ────────────────────────────────────────────────────
  const skipFirst = useRef(true)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (skipFirst.current) {
      skipFirst.current = false
      return
    }

    setSaveState('saving')
    if (timer.current) clearTimeout(timer.current)

    timer.current = setTimeout(async () => {
      const result = await saveArticleAction(article.id, {
        title,
        lead,
        contentJson: doc,
        coverUrl,
        tags,
      })
      if (result.ok) {
        setSaveState('saved')
        setSaveError(null)
      } else {
        setSaveState('error')
        setSaveError(result.error)
      }
    }, AUTOSAVE_DELAY_MS)

    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [article.id, title, lead, doc, coverUrl, tags])

  const missing = [
    !title.trim() && 'sarlavha',
    !lead.trim() && 'lid',
    !coverUrl && 'muqova rasmi',
  ].filter(Boolean) as string[]

  const canPublish = missing.length === 0 && saveState !== 'saving'

  return (
    <div className="mx-auto grid max-w-6xl gap-12 px-6 py-10 lg:grid-cols-[minmax(0,1fr)_320px]">
      {/* ── Yozuv maydoni ── */}
      <div className="min-w-0">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Sarlavha"
          className="mb-2 w-full border-none bg-transparent font-serif text-3xl font-semibold tracking-tight outline-none placeholder:text-muted"
        />
        <TiptapEditor initialContent={article.contentJson} onChange={setDoc} />
      </div>

      {/* ── Yon panel ── */}
      <aside className="space-y-6 lg:sticky lg:top-20 lg:h-fit">
        <div className="flex items-center justify-between border-b border-line pb-3 text-xs">
          <span className="text-muted">
            {saveState === 'saving' && 'Saqlanmoqda…'}
            {saveState === 'saved' && 'Saqlandi'}
            {saveState === 'error' && 'Saqlanmadi'}
            {saveState === 'idle' && (article.status === 'published' ? 'Chop etilgan' : 'Qoralama')}
          </span>
          {article.status === 'published' ? (
            <Link
              href={`/${article.slug}`}
              target="_blank"
              className="text-muted underline underline-offset-4 hover:text-fg"
            >
              Saytda ko&apos;rish ↗
            </Link>
          ) : null}
        </div>

        {saveError ? <Notice tone="error">{saveError}</Notice> : null}

        <CoverPicker value={coverUrl} onChange={setCoverUrl} />

        <Field label="Lid — Telegram uchun">
          <Textarea
            rows={4}
            value={lead}
            onChange={(e) => setLead(e.target.value)}
            placeholder="Kanalda ko'rinadigan qisqa matn"
          />
        </Field>
        <button
          type="button"
          className="-mx-2 -mt-4 rounded-md px-2 py-1 text-xs text-muted underline underline-offset-4 hover:bg-hover hover:text-fg"
          onClick={() => setLead(suggestLead(doc))}
        >
          Birinchi paragrafdan olish
        </button>

        <Field label="Teglar" hint="Vergul bilan ajrating">
          <Input
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
            placeholder="kundalik, yozuv"
          />
        </Field>

        <TelegramPreview
          template={template}
          title={title}
          lead={lead}
          tags={tags}
          coverUrl={coverUrl}
          url={url}
          channel={channel}
          timezone={timezone}
        />

        {/* ── Iqtiboslar ── */}
        <div>
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="text-xs uppercase tracking-wider text-muted">Iqtiboslar</span>
            <span className="text-xs tabular-nums text-muted">{quoteTexts.length}</span>
          </div>
          {quoteTexts.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line px-3 py-4 text-xs leading-relaxed text-muted">
              Matndan gapni tanlab <b className="text-fg">Iqtibos</b> tugmasini bosing
              (yoki ⌘⇧Q). Belgilangan gaplar kuniga bittadan kanalga chiqadi.
            </p>
          ) : (
            <ol className="space-y-1.5">
              {quoteTexts.map((text, i) => (
                <li
                  key={`${i}-${text.slice(0, 24)}`}
                  className="rounded-r-md border-l-2 border-line bg-surface py-1.5 pl-2.5 pr-2 text-xs leading-relaxed text-muted"
                >
                  {text}
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* ── Chop etish ── */}
        <div className="space-y-2 border-t border-line pt-5">
          <Button
            variant="solid"
            className="w-full"
            disabled={!canPublish || publishing}
            onClick={() =>
              startPublish(async () => {
                setPublishResult(null)
                const result = await publishArticleAction(article.id)
                setPublishResult(result)
              })
            }
          >
            {publishing
              ? 'Jo’natilmoqda…'
              : article.status === 'published'
                ? 'Kanaldagi postni yangilash'
                : 'Kanalga chop etish'}
          </Button>

          {missing.length > 0 ? (
            <p className="text-xs text-muted">Yetishmayapti: {missing.join(', ')}.</p>
          ) : null}

          {publishResult ? (
            <Notice tone={publishResult.ok ? 'info' : 'error'}>
              {publishResult.ok ? (publishResult.message ?? 'Tayyor') : publishResult.error}
            </Notice>
          ) : null}

          <button
            type="button"
            disabled={deleting}
            className="mt-2 w-full rounded-md py-2 text-xs text-muted hover:bg-hover hover:text-fg disabled:opacity-40"
            onClick={() => {
              if (!confirm("Maqola va uning iqtiboslari butunlay o'chiriladi. Davom etamizmi?")) {
                return
              }
              startDelete(() => deleteArticleAction(article.id))
            }}
          >
            {deleting ? "O'chirilmoqda…" : "Maqolani o'chirish"}
          </button>
        </div>
      </aside>
    </div>
  )
}
