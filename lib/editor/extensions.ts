import StarterKit from '@tiptap/starter-kit'
import { Iqtibos } from './iqtibos'

/**
 * Client editor va server renderi (generateHTML) AYNAN shu ro'yxatni ishlatishi shart —
 * aks holda sxemalar mos kelmay, saqlangan hujjat noto'g'ri render qilinadi.
 */
export const editorExtensions = [
  StarterKit.configure({
    heading: { levels: [2, 3] },
    link: {
      openOnClick: false,
      autolink: true,
      HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
    },
    codeBlock: false,
  }),
  Iqtibos,
]
