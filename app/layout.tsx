import type { Metadata } from 'next'
import { THEME_INIT_SCRIPT } from '@/components/theme-toggle'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Kundalik',
    template: '%s — Kundalik',
  },
  description: 'Maqolalar va kundalik yozuvlar.',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="uz" className="h-full">
      <head>
        {/* Saqlangan mavzuni chizishdan oldin qo'llaydi — oq ekran chaqnamasin */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  )
}
