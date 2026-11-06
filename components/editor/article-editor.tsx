'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import type { JSONContent } from '@tiptap/core'
import type { ArticlePatch } from '@/lib/articles'
import { publishArticleAction, saveArticleAction, deleteArticleAction, scheduleArticleAction } from '@/lib/actions'
import { buildTelegramSummary, extractQuotes, suggestLead } from '@/lib/quotes'
import { Field, Input, Notice, Textarea } from '@/components/ui'
import { ActionButton } from '@/components/action-button'
import { TiptapEditor } from './tiptap-editor'
import { TelegramPreview } from './telegram-preview'
import { CoverPicker } from './cover-picker'

const AUTOSAVE_DELAY_MS = 1800

export type EditorArticle = {
  id: string
  slug: string
  title: string
  contentType: 'article' | 'short' | 'media'
  lead: string
  contentJson: JSONContent
  coverUrl: string | null
  mediaUrl: string | null
  mediaProvider: string | null
  seriesId: string | null
  seriesOrder: number | null
  isFeatured: number
  scheduledAt: string | null
  tags: string[]
  status: 'draft' | 'published'
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

type DraftState = {
  title: string
  contentType: EditorArticle['contentType']
  lead: string
  contentJson: JSONContent
  coverUrl: string | null
  mediaUrl: string | null
  mediaProvider: string | null
  isFeatured: boolean
  scheduledAt: string
  tags: string[]
}

function sameJson(a: JSONContent, b: JSONContent) {
  return JSON.stringify(a) === JSON.stringify(b)
}

function sameList(a: string[], b: string[]) {
  return a.length === b.length && a.every((value, index) => value === b[index])
}

function changedPatch(current: DraftState, saved: DraftState): ArticlePatch {
  const patch: ArticlePatch = {}
  if (current.title !== saved.title) patch.title = current.title
  if (current.contentType !== saved.contentType) patch.contentType = current.contentType
  if (current.lead !== saved.lead) patch.lead = current.lead
  if (!sameJson(current.contentJson, saved.contentJson)) patch.contentJson = current.contentJson
  if (current.coverUrl !== saved.coverUrl) patch.coverUrl = current.coverUrl
  if (current.mediaUrl !== saved.mediaUrl) patch.mediaUrl = current.mediaUrl
  if (current.mediaProvider !== saved.mediaProvider) patch.mediaProvider = current.mediaProvider
  if (current.isFeatured !== saved.isFeatured) patch.isFeatured = current.isFeatured
  if (current.scheduledAt !== saved.scheduledAt) {
    patch.scheduledAt = current.scheduledAt ? new Date(current.scheduledAt) : null
  }
  if (!sameList(current.tags, saved.tags)) patch.tags = current.tags
  return patch
}

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
  const [contentType, setContentType] = useState(article.contentType)
  const [lead, setLead] = useState(article.lead)
  const [doc, setDoc] = useState<JSONContent>(article.contentJson)
  const [coverUrl, setCoverUrl] = useState<string | null>(article.coverUrl)
  const [mediaUrl, setMediaUrl] = useState<string | null>(article.mediaUrl)
  const [mediaProvider, setMediaProvider] = useState<string | null>(article.mediaProvider)
  const [isFeatured, setIsFeatured] = useState(article.isFeatured === 1)
  const [scheduledAt, setScheduledAt] = useState(article.scheduledAt ?? '')
  const [tagsText, setTagsText] = useState(article.tags.join(', '))

  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [saveRevision, setSaveRevision] = useState(0)
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
  const telegramSummary = useMemo(() => buildTelegramSummary(doc, lead), [doc, lead])
  const url = `${origin}/${article.slug}`

  const currentDraft = useMemo<DraftState>(() => ({
    title,
    contentType,
    lead,
    contentJson: doc,
    coverUrl,
    mediaUrl,
    mediaProvider,
    isFeatured,
    scheduledAt,
    tags,
  }), [title, contentType, lead, doc, coverUrl, mediaUrl, mediaProvider, isFeatured, scheduledAt, tags])

  // ── Avto-saqlash ────────────────────────────────────────────────────
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savingRef = useRef(false)
  const lastSaved = useRef<DraftState>({
    title: article.title,
    contentType: article.contentType,
    lead: article.lead,
    contentJson: article.contentJson,
    coverUrl: article.coverUrl,
    mediaUrl: article.mediaUrl,
    mediaProvider: article.mediaProvider,
    isFeatured: article.isFeatured === 1,
    scheduledAt: article.scheduledAt ?? '',
    tags: article.tags,
  })

  useEffect(() => {
    const patch = changedPatch(currentDraft, lastSaved.current)
    if (Object.keys(patch).length === 0) return

    setSaveState('saving')
    if (timer.current) clearTimeout(timer.current)

    timer.current = setTimeout(async () => {
      if (savingRef.current) return
      savingRef.current = true
      const result = await saveArticleAction(article.id, patch)
      savingRef.current = false
      if (!result.ok) {
        setSaveState('error')
        setSaveError(result.error)
        return
      }
      lastSaved.current = { ...lastSaved.current, ...currentDraft }
      setSaveState('saved')
      setSaveError(null)
      setSaveRevision((revision) => revision + 1)
    }, AUTOSAVE_DELAY_MS)

    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [article.id, currentDraft, saveRevision])

  const missing = [
    !title.trim() && 'sarlavha',
    contentType !== 'short' && !lead.trim() && 'lid',
    contentType !== 'media' && !coverUrl && 'muqova rasmi',
    contentType === 'media' && !mediaUrl && 'media havolasi',
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
        <div className="mb-6 flex flex-wrap items-center gap-2">
          {(['article', 'short', 'media'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setContentType(type)}
              className={`rounded-full border px-3 py-1 text-xs ${contentType === type ? 'border-fg bg-fg text-bg' : 'border-line text-muted hover:border-fg'}`}
            >
              {type === 'article' ? 'Maqola' : type === 'short' ? 'Qisqa post' : 'Media'}
            </button>
          ))}
        </div>
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

        {contentType === 'media' ? (
          <Field label="Media havolasi" hint="YouTube yoki Vimeo havolasi">
            <Input
              value={mediaUrl ?? ''}
              onChange={(e) => {
                const url = e.target.value.trim()
                setMediaUrl(url || null)
                setMediaProvider(url.includes('youtu') ? 'YouTube' : url.includes('vimeo') ? 'Vimeo' : null)
              }}
              placeholder="https://youtube.com/watch?v=..."
            />
          </Field>
        ) : null}

        <label className="flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} />
          Bosh sahifada tanlangan sifatida ko‘rsatish
        </label>

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
          summary={telegramSummary}
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
          <Field label="Rejalashtirish" hint="Ixtiyoriy: kelajakdagi sana va vaqtni tanlang">
            <Input
              type="datetime-local"
              value={scheduledAt ? scheduledAt.slice(0, 16) : ''}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          </Field>

          {scheduledAt ? (
            <ActionButton
              type="button"
              className="w-full"
              pending={publishing}
              succeeded={publishResult?.ok}
              pendingLabel="Rejalashtirilmoqda…"
              successLabel="Rejalashtirildi"
              disabled={saveState === 'saving'}
              onClick={() => startPublish(async () => {
                setPublishResult(null)
                const result = await scheduleArticleAction(article.id, new Date(scheduledAt))
                setPublishResult(result)
              })}
            >
              Vaqtga rejalashtirish
            </ActionButton>
          ) : null}

          <ActionButton
            variant="solid"
            className="w-full"
            disabled={!canPublish}
            pending={publishing}
            succeeded={publishResult?.ok}
            pendingLabel="Jo‘natilmoqda…"
            successLabel="Yuborildi"
            onClick={() =>
              startPublish(async () => {
                setPublishResult(null)
                const result = await publishArticleAction(article.id)
                setPublishResult(result)
              })
            }
          >
            {article.status === 'published' ? 'Kanaldagi postni yangilash' : 'Kanalga chop etish'}
          </ActionButton>

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
