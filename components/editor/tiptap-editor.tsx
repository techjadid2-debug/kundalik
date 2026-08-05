'use client'

import { EditorContent, useEditor, type Editor } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import { Placeholder } from '@tiptap/extensions'
import type { JSONContent } from '@tiptap/core'
import { useEffect } from 'react'
import { editorExtensions } from '@/lib/editor/extensions'
import { cx } from '@/components/ui'

function ToolButton({
  active,
  title,
  onClick,
  children,
}: {
  active?: boolean
  title: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      onMouseDown={(e) => e.preventDefault()} // tanlov yo'qolmasin
      onClick={onClick}
      className={cx(
        'flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm',
        active ? 'bg-fg text-bg' : 'text-muted hover:bg-hover hover:text-fg',
      )}
    >
      {children}
    </button>
  )
}

function Toolbar({ editor }: { editor: Editor }) {
  return (
    <div className="sticky top-14 z-10 -mx-1 mb-6 flex flex-wrap items-center gap-0.5 border-b border-line bg-bg/95 py-1 backdrop-blur">
      <ToolButton
        title="Qalin (⌘B)"
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <b>B</b>
      </ToolButton>
      <ToolButton
        title="Kursiv (⌘I)"
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <i>I</i>
      </ToolButton>

      <span className="mx-1.5 h-4 w-px bg-line" />

      <ToolButton
        title="Sarlavha"
        active={editor.isActive('heading', { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        H2
      </ToolButton>
      <ToolButton
        title="Kichik sarlavha"
        active={editor.isActive('heading', { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        H3
      </ToolButton>
      <ToolButton
        title="Ro'yxat"
        active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        •
      </ToolButton>
      <ToolButton
        title="Ko'chirma blok"
        active={editor.isActive('blockquote')}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        ❞
      </ToolButton>
      <ToolButton
        title="Ajratuvchi chiziq"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
      >
        —
      </ToolButton>

      <span className="mx-1.5 h-4 w-px bg-line" />

      <ToolButton
        title="Iqtibos sifatida belgilash (⌘⇧Q)"
        active={editor.isActive('iqtibos')}
        onClick={() => editor.chain().focus().toggleIqtibos().run()}
      >
        <span className="whitespace-nowrap text-xs uppercase tracking-wider">Iqtibos</span>
      </ToolButton>
    </div>
  )
}

export function TiptapEditor({
  initialContent,
  onChange,
}: {
  initialContent: JSONContent
  onChange: (doc: JSONContent) => void
}) {
  const editor = useEditor({
    // SSR hidratsiya nomuvofiqligining oldini oladi
    immediatelyRender: false,
    extensions: [
      ...editorExtensions,
      Placeholder.configure({ placeholder: 'Yozishni boshlang…' }),
    ],
    content: initialContent,
    editorProps: {
      attributes: { class: 'prose focus:outline-none' },
    },
    onUpdate: ({ editor: e }) => onChange(e.getJSON()),
  })

  useEffect(() => () => editor?.destroy(), [editor])

  if (!editor) {
    return <div className="prose min-h-[60vh] text-muted">Editor yuklanmoqda…</div>
  }

  return (
    <>
      <Toolbar editor={editor} />

      {/* Gapni tanlaganda chiqadigan tezkor panel — iqtibos belgilashning asosiy yo'li */}
      <BubbleMenu
        editor={editor}
        className="flex items-center gap-0.5 rounded-lg border border-line bg-bg p-1 shadow-lg shadow-black/5"
      >
        <ToolButton
          title="Iqtibos sifatida belgilash (⌘⇧Q)"
          active={editor.isActive('iqtibos')}
          onClick={() => editor.chain().focus().toggleIqtibos().run()}
        >
          <span className="whitespace-nowrap text-xs uppercase tracking-wider">
            {editor.isActive('iqtibos') ? 'Iqtibosni olib tashlash' : 'Iqtibos'}
          </span>
        </ToolButton>
        <span className="h-4 w-px bg-line" />
        <ToolButton
          title="Qalin"
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <b>B</b>
        </ToolButton>
        <ToolButton
          title="Kursiv"
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <i>I</i>
        </ToolButton>
      </BubbleMenu>

      <EditorContent editor={editor} />
    </>
  )
}
