'use client'

import Image from 'next/image'
import { useRef, useState } from 'react'
import { Button, Notice } from '@/components/ui'

export function CoverPicker({
  value,
  onChange,
}: {
  value: string | null
  onChange: (url: string | null) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function upload(file: File) {
    setUploading(true)
    setError(null)
    try {
      const body = new FormData()
      body.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body })
      const data = (await res.json()) as { url?: string; error?: string }
      if (!res.ok || !data.url) {
        setError(data.error ?? "Yuklab bo'lmadi")
        return
      }
      onChange(data.url)
    } catch {
      setError('Tarmoq xatosi')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <span className="mb-1.5 block text-xs uppercase tracking-wider text-muted">Muqova</span>

      {value ? (
        <div className="relative aspect-[3/2] w-full overflow-hidden rounded-xl border border-line">
          <Image src={value} alt="" fill sizes="320px" className="object-cover" unoptimized />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex aspect-[3/2] w-full items-center justify-center rounded-xl border border-dashed border-line text-xs text-muted hover:border-fg hover:bg-hover hover:text-fg"
        >
          {uploading ? 'Yuklanmoqda…' : 'Rasm tanlang'}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void upload(file)
          e.target.value = ''
        }}
      />

      <div className="mt-2 flex gap-2">
        <Button
          type="button"
          className="h-8 flex-1 text-xs"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? 'Yuklanmoqda…' : value ? 'Almashtirish' : 'Yuklash'}
        </Button>
        {value ? (
          <Button
            type="button"
            variant="ghost"
            className="h-8 text-xs"
            onClick={() => onChange(null)}
          >
            O&apos;chirish
          </Button>
        ) : null}
      </div>

      {error ? (
        <div className="mt-2">
          <Notice tone="error">{error}</Notice>
        </div>
      ) : null}
    </div>
  )
}
