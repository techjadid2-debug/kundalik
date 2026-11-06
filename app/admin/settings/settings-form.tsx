'use client'

import { useState, useTransition } from 'react'
import { saveSettingsAction, sendTestMessageAction } from '@/lib/actions'
import { Field, Input, Notice, Textarea } from '@/components/ui'
import { ActionButton } from '@/components/action-button'
import type { ActionResult } from '@/lib/actions'

type Values = {
  timezone: string
  quoteTimeLocal: string
  channelUsername: string
  articleTemplate: string
  quoteTemplate: string
}

const PLACEHOLDERS = [
  ['{title}', 'sarlavha'],
  ['{lead}', 'lid matni (avtomatik qisqaradi)'],
  ['{summary}', 'maqoladan avtomatik batafsil mazmun'],
  ['{quote}', 'iqtibos matni'],
  ['{tags}', '#teglar'],
  ['{url}', 'maqola havolasi'],
  ['{date}', 'sana'],
  ['{channel}', 'kanal nomi'],
  ['{channelUrl}', 'kanalning public havolasi'],
  ['{channelLink}', 'kanalga tayyor HTML havola'],
]

export function SettingsForm({ initial }: { initial: Values }) {
  const [values, setValues] = useState(initial)
  const [result, setResult] = useState<ActionResult | null>(null)
  const [testResult, setTestResult] = useState<ActionResult | null>(null)
  const [saving, startSave] = useTransition()
  const [testing, startTest] = useTransition()

  const set = <K extends keyof Values>(key: K, value: Values[K]) =>
    setValues((v) => ({ ...v, [key]: value }))

  return (
    <div className="mt-10 space-y-8">
      <section className="space-y-4">
        <h2 className="text-xs uppercase tracking-wider text-muted">Kanal</h2>
        <Field label="Kanal nomi" hint="Shablondagi {channel} shu qiymatni oladi">
          <Input
            value={values.channelUsername}
            onChange={(e) => set('channelUsername', e.target.value)}
            placeholder="@kanal_nomi"
          />
        </Field>
        <div>
          <ActionButton type="button" pending={testing} succeeded={testResult?.ok} pendingLabel="Jo'natilmoqda…" successLabel="Yuborildi" onClick={() => startTest(async () => {
            setTestResult(null)
            setTestResult(await sendTestMessageAction())
          })}>
            Test xabari yuborish
          </ActionButton>
          {testResult ? (
            <div className="mt-2">
              <Notice tone={testResult.ok ? 'info' : 'error'}>
                {testResult.ok ? (testResult.message ?? 'Tayyor') : testResult.error}
              </Notice>
            </div>
          ) : null}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xs uppercase tracking-wider text-muted">Kunlik iqtibos</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Vaqt" hint="Jadval vercel.json da (UTC) belgilanadi">
            <Input
              type="time"
              value={values.quoteTimeLocal}
              onChange={(e) => set('quoteTimeLocal', e.target.value)}
            />
          </Field>
          <Field label="Vaqt mintaqasi">
            <Input
              value={values.timezone}
              onChange={(e) => set('timezone', e.target.value)}
              placeholder="Asia/Tashkent"
            />
          </Field>
        </div>
        <p className="text-xs leading-relaxed text-muted">
          Vaqtni haqiqatda o&apos;zgartirish uchun <code className="text-fg">vercel.json</code>{' '}
          dagi cron jadvalini ham tahrirlang — u UTC bo&apos;yicha ishlaydi
          (09:00 Toshkent = <code className="text-fg">0 4 * * *</code>).
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xs uppercase tracking-wider text-muted">Shablonlar</h2>

        <div className="flex flex-wrap gap-x-4 gap-y-1 border-l-2 border-line py-1 pl-3">
          {PLACEHOLDERS.map(([key, description]) => (
            <span key={key} className="text-xs text-muted">
              <code className="text-fg">{key}</code> — {description}
            </span>
          ))}
        </div>

        <Field label="Maqola posti" hint="HTML: <b>, <i>, <a href> ishlatsa bo'ladi">
          <Textarea
            rows={9}
            className="font-mono text-xs leading-relaxed"
            value={values.articleTemplate}
            onChange={(e) => set('articleTemplate', e.target.value)}
          />
        </Field>

        <Field label="Iqtibos posti">
          <Textarea
            rows={6}
            className="font-mono text-xs leading-relaxed"
            value={values.quoteTemplate}
            onChange={(e) => set('quoteTemplate', e.target.value)}
          />
        </Field>
      </section>

      <div className="flex items-center gap-3 border-t border-line pt-6">
        <ActionButton
          variant="solid"
          pending={saving}
          succeeded={result?.ok}
          pendingLabel="Saqlanmoqda…"
          successLabel="Saqlandi"
          onClick={() =>
            startSave(async () => {
              setResult(null)
              setResult(await saveSettingsAction(values))
            })
          }
        >
          Saqlash
        </ActionButton>
        {result ? (
          <Notice tone={result.ok ? 'info' : 'error'}>
            {result.ok ? (result.message ?? 'Saqlandi') : result.error}
          </Notice>
        ) : null}
      </div>
    </div>
  )
}
